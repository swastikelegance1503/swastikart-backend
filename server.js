import app from './app.js';
import connectDB from './config/db.js';
import { PORT } from './config/env.js';

async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log('===============================================');
    console.log('🚀 Swastik Art Backend Server is running!');
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🔑 Login API: POST http://localhost:${PORT}/api/login`);
    console.log(`📝 Register API: POST http://localhost:${PORT}/api/register`);
    console.log(`🏢 Profiles API: GET/POST http://localhost:${PORT}/api/profiles`);
    console.log(`🏬 Merchants API: GET/POST http://localhost:${PORT}/api/merchants`);
    console.log(`👷 Workers API: GET/POST http://localhost:${PORT}/api/workers`);
    console.log(`🏭 Production API: GET/POST http://localhost:${PORT}/api/production/monthly-summary`);
    console.log(`⚙️ Machines API: GET/POST http://localhost:${PORT}/api/machines`);
    console.log(`📄 Challans API: GET/POST http://localhost:${PORT}/api/challans`);
    console.log(`📊 Date Summary: GET http://localhost:${PORT}/api/challans/date-summary`);
    console.log(`🖨️ Print Challan: GET http://localhost:${PORT}/api/challans/:id/print`);
    console.log('===============================================');
  });
}

startServer().catch((error) => {
  console.error('❌ MongoDB connection/startup failed:', error.message);
  process.exit(1);
});
