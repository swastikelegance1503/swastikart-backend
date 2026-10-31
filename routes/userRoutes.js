import { Router } from 'express';
import { getCurrentUser, listUsers } from '../controllers/userController.js';
import { requireRole } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/me', getCurrentUser);
router.get('/users', requireRole('Owner & Admin', 'Admin'), listUsers);

export default router;
