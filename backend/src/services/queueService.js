const prisma = require('../db');
const { broadcast } = require('../socket');

const DEFAULT_SERVICE_MINUTES = 5;

async function averageServiceMinutes(serviceId) {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const completed = await prisma.ticket.findMany({
    where: { serviceId, status: 'completed', completedAt: { gte: since } },
    select: { startedAt: true, completedAt: true },
  });
  const durations = completed
    .filter((t) => t.startedAt && t.completedAt)
    .map((t) => (t.completedAt - t.startedAt) / 60000);
  if (durations.length === 0) return DEFAULT_SERVICE_MINUTES;
  return durations.reduce((a, b) => a + b, 0) / durations.length;
}

async function countWaitingAhead(serviceId, beforeDate) {
  return prisma.ticket.count({
    where: {
      serviceId,
      status: 'waiting',
      createdAt: { lt: beforeDate },
    },
  });
}

async function issueTicket(serviceId) {
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service || !service.isActive) throw new Error('Service not available');

  const now = new Date();
  const ahead = await countWaitingAhead(serviceId, now);
  const avg = await averageServiceMinutes(serviceId);
  const estWait = Math.round(ahead * avg);

  // Generate sequential number per service for today.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCount = await prisma.ticket.count({
    where: { serviceId, createdAt: { gte: today } },
  });

  // Generate a unique ticket number. Start from the per-service daily count and
  // keep incrementing until we find a number that is not already used. This
  // protects against prefix changes, manual edits, and concurrent requests.
  let seq = todayCount + 1;
  let number = '';
  for (let attempts = 0; attempts < 10000; attempts++) {
    number = `${service.prefix}-${String(seq + attempts).padStart(3, '0')}`;
    const existing = await prisma.ticket.findUnique({ where: { number } });
    if (!existing) break;
  }

  let ticket;
  try {
    ticket = await prisma.ticket.create({
      data: {
        number,
        serviceId,
        peopleAhead: ahead,
        estWaitMin: estWait,
      },
      include: { service: true, counter: true },
    });
  } catch (err) {
    // Handle a race condition where two requests picked the same number.
    if (err && err.code === 'P2002') {
      // Recurse once to retry with a fresh number.
      return issueTicket(serviceId);
    }
    throw err;
  }

  broadcast('ticket:created', ticket);
  broadcast('queue:changed', { serviceId });
  return ticket;
}

async function getTicket(id) {
  return prisma.ticket.findUnique({
    where: { id },
    include: { service: true, counter: true },
  });
}

async function refreshAhead(serviceId) {
  // Recompute peopleAhead for all waiting tickets of a service.
  const waiting = await prisma.ticket.findMany({
    where: { serviceId, status: 'waiting' },
    orderBy: { createdAt: 'asc' },
  });
  let idx = 0;
  const avg = await averageServiceMinutes(serviceId);
  for (const t of waiting) {
    await prisma.ticket.update({
      where: { id: t.id },
      data: { peopleAhead: idx, estWaitMin: Math.round(idx * avg) },
    });
    idx++;
  }
}

async function callNext(counterId, serviceIdFilter) {
  const counter = await prisma.counter.findUnique({ where: { id: counterId } });
  if (!counter) throw new Error('Counter not found');

  // Determine service scope: counter's service or provided.
  const serviceId = serviceIdFilter || counter.serviceId || null;

  const where = { status: 'waiting' };
  if (serviceId) where.serviceId = serviceId;

  const next = await prisma.ticket.findFirst({
    where,
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    include: { service: true },
  });
  if (!next) return null;

  const ticket = await prisma.ticket.update({
    where: { id: next.id },
    data: {
      status: 'called',
      counterId,
      calledAt: new Date(),
      peopleAhead: 0,
      estWaitMin: 0,
    },
    include: { service: true, counter: true },
  });

  await refreshAhead(ticket.serviceId);
  broadcast('ticket:updated', ticket);
  broadcast('ticket:called', ticket);
  broadcast('queue:changed', { serviceId: ticket.serviceId });
  return ticket;
}

async function recall(ticketId) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, include: { service: true, counter: true } });
  if (!ticket) throw new Error('Ticket not found');
  broadcast('ticket:called', ticket);
  broadcast('ticket:updated', ticket);
  return ticket;
}

async function complete(ticketId) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new Error('Ticket not found');
  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status: 'completed',
      completedAt: new Date(),
      startedAt: ticket.startedAt || ticket.calledAt || new Date(),
    },
    include: { service: true, counter: true },
  });
  // release counter current? counters don't track current ticket explicitly; ok.
  await refreshAhead(updated.serviceId);
  broadcast('ticket:updated', updated);
  broadcast('queue:changed', { serviceId: updated.serviceId });
  return updated;
}

async function skip(ticketId) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new Error('Ticket not found');
  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: 'skipped', completedAt: new Date() },
    include: { service: true, counter: true },
  });
  await refreshAhead(updated.serviceId);
  broadcast('ticket:updated', updated);
  broadcast('queue:changed', { serviceId: updated.serviceId });
  return updated;
}

async function transfer(ticketId, { serviceId, counterId }) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new Error('Ticket not found');

  const data = { status: 'waiting', counterId: counterId || null, calledAt: null };
  if (serviceId) data.serviceId = serviceId;

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data,
    include: { service: true, counter: true },
  });

  // regenerate number? keep original number
  const targetService = updated.serviceId;
  await refreshAhead(targetService);
  broadcast('ticket:updated', updated);
  broadcast('queue:changed', { serviceId: targetService });
  return updated;
}

async function listWaiting(serviceId) {
  const where = { status: 'waiting' };
  if (serviceId) where.serviceId = serviceId;
  return prisma.ticket.findMany({
    where,
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    include: { service: true, counter: true },
  });
}

async function publicState() {
  const calledStatuses = ['called', 'serving'];
  const serving = await prisma.ticket.findMany({
    where: { status: { in: calledStatuses } },
    orderBy: { calledAt: 'desc' },
    take: 20,
    include: { service: true, counter: true },
  });

  const recentCompleted = await prisma.ticket.findMany({
    where: { status: { in: ['completed', 'skipped'] } },
    orderBy: { completedAt: 'desc' },
    take: 5,
    include: { service: true, counter: true },
  });

  return { serving, recent: recentCompleted };
}

module.exports = {
  issueTicket,
  getTicket,
  callNext,
  recall,
  complete,
  skip,
  transfer,
  listWaiting,
  publicState,
  refreshAhead,
  averageServiceMinutes,
};