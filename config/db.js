import mongoose from 'mongoose';
import { MONGO_URI } from './env.js';

async function connectDB() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB સાથે સફળતાપૂર્વક જોડાઈ ગયું! (Connected to MongoDB successfully!)');
  console.log(`📦 Database Name: ${mongoose.connection.name}`);
}

export default connectDB;
