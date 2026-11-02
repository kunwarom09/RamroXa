import { createApp } from '../src/app.js';
import { connectDB } from '../src/config/db.js';

const app = createApp();

export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (err) {
    console.error('Failed to connect to MongoDB in serverless handler:', err.message);
    return res.status(503).json({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database connection failed. Please verify that MONGODB_URI in your Vercel Environment Variables is correct and that MongoDB Atlas Network Access allows 0.0.0.0/0.',
        details: err.message
      }
    });
  }
  return app(req, res);
}
