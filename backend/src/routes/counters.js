const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, requireRole } = require('../middleware/authMiddleware');
const { broadcast } = require('../socket');

router.get('/', async (req, res) => {
  const counters = await prisma.counter.findMany({
    include: { service: true, staff: true },
    orderBy: { id: 'asc' },
  });
  res.json(counters);
});

router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { name, serviceId } = req.body;
    const c = await prisma.counter.create({
      data: { name, serviceId: serviceId || null },
    });
    broadcast('counters:changed', {});
    res.status(201).json(c);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { name, serviceId, isOnline } = req.body;
    const c = await prisma.counter.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(name !== undefined && { name }),
        ...(serviceId !== undefined && { serviceId: serviceId || null }),
        ...(isOnline !== undefined && { isOnline }),
      },
    });
    broadcast('counters:changed', {});
    res.json(c);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    await prisma.counter.delete({ where: { id: parseInt(req.params.id) } });
    broadcast('counters:changed', {});
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Staff: toggle own counter online
router.post('/:id/online', authenticate, async (req, res) => {
  try {
    const { online } = req.body;
    const id = parseInt(req.params.id);
    // staff can only toggle own counter unless admin
    if (req.user.role !== 'admin' && req.user.counterId !== id) {
      return res.status(403).json({ error: 'Not your counter' });
    }
    const c = await prisma.counter.update({
      where: { id },
      data: { isOnline: online !== false },
    });
    broadcast('counters:changed', {});
    res.json(c);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;