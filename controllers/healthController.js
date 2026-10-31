import mongoose from 'mongoose';

export function getHealth(req, res) {
  return res.json({
    status: 'online',
    service: 'Swastik Art Auth API',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
}
