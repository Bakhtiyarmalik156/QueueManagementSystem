const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { authenticate, requireRole } = require('../middleware/authMiddleware');
const { broadcast } = require('../socket');

router.get('/', async (req, res) => {
  const services = await prisma.service.findMany({ orderBy: { name: 'asc' } });
  res.json(services);
});

router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { name, prefix, color, isActive } = req.body;
    const s = await prisma.service.create({
      data: { name, prefix: prefix.toUpperCase(), color: color || '#3b82f6', isActive: isActive !== false },
    });
    broadcast('services:changed', {});
    res.status(201).json(s);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { name, prefix, color, isActive } = req.body;
    const s = await prisma.service.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(prefix !== undefined && { prefix: prefix.toUpperCase() }),
        ...(color !== undefined && { color }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    broadcast('services:changed', {});
    res.json(s);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    await prisma.service.delete({ where: { id: req.params.id } });
    broadcast('services:changed', {});
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;