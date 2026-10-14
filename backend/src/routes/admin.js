const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

router.get('/stats', authenticate, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const totalToday = await prisma.ticket.count({ where: { createdAt: { gte: today } } });
    const completedToday = await prisma.ticket.findMany({
      where: { status: 'completed', completedAt: { gte: today } },
      select: { createdAt: true, calledAt: true, startedAt: true, completedAt: true },
    });
    const waits = completedToday
      .filter((t) => t.calledAt)
      .map((t) => (t.calledAt - t.createdAt) / 60000);
    const services = completedToday
      .filter((t) => t.startedAt && t.completedAt)
      .map((t) => (t.completedAt - t.startedAt) / 60000);
    const avgWait = waits.length ? waits.reduce((a,b)=>a+b,0)/waits.length : 0;
    const avgService = services.length ? services.reduce((a,b)=>a+b,0)/services.length : 0;
    const activeCounters = await prisma.counter.count({ where: { isOnline: true } });
    const waitingCount = await prisma.ticket.count({ where: { status: 'waiting', createdAt: { gte: today } } });
    res.json({
      totalToday,
      completedToday: completedToday.length,
      avgWaitMin: Math.round(avgWait * 10) / 10,
      avgServiceMin: Math.round(avgService * 10) / 10,
      activeCounters,
      waitingCount,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/users', authenticate, requireRole('admin'), async (req, res) => {
  const users = await prisma.staff.findMany({
    select: { id: true, username: true, role: true, counterId: true, createdAt: true },
  });
  res.json(users);
});

module.exports = router;