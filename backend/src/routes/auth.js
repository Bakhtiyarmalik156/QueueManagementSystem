const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { hashPassword, verifyPassword, signToken } = require('../utils/auth');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await prisma.staff.findUnique({ where: { username } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken(user);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, counterId: user.counterId } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Register (admin only)
router.post('/register', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { username, password, role, counterId } = req.body;
    const existing = await prisma.staff.findUnique({ where: { username } });
    if (existing) return res.status(400).json({ error: 'Username taken' });
    const user = await prisma.staff.create({
      data: {
        username,
        passwordHash: await hashPassword(password),
        role: role || 'staff',
        counterId: counterId || null,
      },
    });
    res.status(201).json({ id: user.id, username: user.username, role: user.role, counterId: user.counterId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Me
router.get('/me', authenticate, async (req, res) => {
  res.json(req.user);
});

module.exports = router;