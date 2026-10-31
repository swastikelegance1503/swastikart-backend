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

const app = express();

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

app.use('/api', healthRoutes);
app.use('/api', authRoutes);
app.use('/api', authenticateToken);
app.use('/api', userRoutes);
app.use('/api', workerRoutes);
app.use('/api', merchantRoutes);
app.use('/api', profileRoutes);
app.use('/api', challanRoutes);

export default app;
