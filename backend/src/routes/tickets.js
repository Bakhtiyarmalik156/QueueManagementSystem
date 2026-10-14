const express = require('express');
const router = express.Router();
const prisma = require('../db');
const q = require('../services/queueService');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

// Create ticket (public)
router.post('/', async (req, res) => {
  try {
    const { serviceId } = req.body;
    if (!serviceId) return res.status(400).json({ error: 'serviceId required' });
    const ticket = await q.issueTicket(serviceId);
    res.status(201).json(ticket);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get ticket
router.get('/:id', async (req, res) => {
  try {
    const ticket = await q.getTicket(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Not found' });
    // recompute peopleAhead for waiting tickets on view
    if (ticket.status === 'waiting') {
      const ahead = await prisma.ticket.count({
        where: { serviceId: ticket.serviceId, status: 'waiting', createdAt: { lt: ticket.createdAt } },
      });
      ticket.peopleAhead = ahead;
      const avg = await q.averageServiceMinutes(ticket.serviceId);
      ticket.estWaitMin = Math.round(ahead * avg);
    }
    res.json(ticket);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// List waiting (staff)
router.get('/', authenticate, async (req, res) => {
  try {
    const { serviceId } = req.query;
    const list = await q.listWaiting(serviceId || null);
    res.json(list);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Staff actions
router.post('/:id/call', authenticate, async (req, res) => {
  try {
    const { counterId } = req.body;
    const cid = counterId || req.user.counterId;
    if (!cid) return res.status(400).json({ error: 'counterId required' });
    const ticket = await q.callNext(cid, req.body.serviceId);
    // If a specific ticket id is provided and not yet called, call that one.
    if (!ticket) return res.json({ ok: true, ticket: null });
    res.json({ ok: true, ticket });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/recall', authenticate, async (req, res) => {
  try {
    const ticket = await q.recall(req.params.id);
    res.json(ticket);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/complete', authenticate, async (req, res) => {
  try {
    const ticket = await q.complete(req.params.id);
    res.json(ticket);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/skip', authenticate, async (req, res) => {
  try {
    const ticket = await q.skip(req.params.id);
    res.json(ticket);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/transfer', authenticate, async (req, res) => {
  try {
    const { serviceId, counterId } = req.body;
    const ticket = await q.transfer(req.params.id, { serviceId, counterId });
    res.json(ticket);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;