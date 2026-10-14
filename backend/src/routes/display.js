const express = require('express');
const router = express.Router();
const q = require('../services/queueService');

router.get('/state', async (req, res) => {
  try {
    const state = await q.publicState();
    res.json(state);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;