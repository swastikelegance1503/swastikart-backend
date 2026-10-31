import dotenv from 'dotenv';

dotenv.config();

const { JWT_SECRET, MONGO_URI, PORT = 5000 } = process.env;

if (!JWT_SECRET || !MONGO_URI) {
  throw new Error('JWT_SECRET and MONGO_URI must be configured in .env or Vercel Environment Variables');
}

export { JWT_SECRET, MONGO_URI, PORT };
