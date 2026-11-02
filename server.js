import app from './app.js';
import connectDB from './config/db.js';
import { PORT } from './config/env.js';

async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log('===============================================');
    console.log('🚀 Swastik Art Backend Server is running!');
    console.log(`📡 Local Port: ${PORT}`);
    console.log(`🌐 Live Vercel API: https://swastikart-backend.vercel.app/api`);
    console.log('🏢 Profiles API: /api/profiles');
    console.log('🏬 Merchants API: /api/merchants');
    console.log('👷 Workers API: /api/workers');
    console.log('⚙️ Machines API: /api/machines');
    console.log('📄 Challans API: /api/challans');
    console.log('📊 Date Summary: /api/challans/date-summary');
    console.log('🖨️ Print Challan: /api/challans/:id/print');
    console.log('===============================================');
  });
}

startServer().catch((error) => {
  console.error('❌ MongoDB connection/startup failed:', error.message);
  process.exit(1);
});
