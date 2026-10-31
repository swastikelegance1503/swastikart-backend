import mongoose from 'mongoose';
import { MONGO_URI } from './env.js';

let isConnected = false;

async function connectDB() {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  try {
    await mongoose.connect(MONGO_URI);
    isConnected = true;
    console.log('✅ MongoDB સાથે સફળતાપૂર્વક જોડાઈ ગયું! (Connected to MongoDB successfully!)');
    console.log(`📦 Database Name: ${mongoose.connection.name}`);
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    throw error;
  }
}

export default connectDB;
