import express from 'express';
import cors from 'cors';
import { authenticateToken } from './middleware/authMiddleware.js';
import authRoutes from './routes/authRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import userRoutes from './routes/userRoutes.js';
import workerRoutes from './routes/workerRoutes.js';
import merchantRoutes from './routes/merchantRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import challanRoutes from './routes/challanRoutes.js';
import productionRoutes from './routes/productionRoutes.js';

const app = express();

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// સ્વાગત / હેલ્થ રુટ (Root Welcome Endpoint)
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 Swastik Art Backend is live!',
    status: 'Running',
    timestamp: new Date().toISOString()
  });
});

app.use('/api', healthRoutes);
app.use('/api', authRoutes);
app.use('/api', authenticateToken);
app.use('/api', userRoutes);
app.use('/api', workerRoutes);
app.use('/api', merchantRoutes);
app.use('/api', profileRoutes);
app.use('/api', challanRoutes);
app.use('/api', productionRoutes);

export default app;
