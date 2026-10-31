import app from '../app.js';
import connectDB from '../config/db.js';

export default async function handler(req, res) {
  try {
    await connectDB();
    return app(req, res);
  } catch (error) {
    console.error('Serverless handler error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server / Database Error: ' + error.message
    });
  }
}
