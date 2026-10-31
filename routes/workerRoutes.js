import { Router } from 'express';
import {
  addBonus,
  addWithdrawal,
  createWorker,
  deleteWorker,
  deleteWithdrawal,
  getWorker,
  getWorkerSummary,
  listWorkers,
  updateWorker
} from '../controllers/workerController.js';

const router = Router();

router.get('/workers', listWorkers);
router.post('/workers', createWorker);
router.get('/workers/:id/summary', getWorkerSummary);
router.get('/workers/:id', getWorker);
router.put('/workers/:id', updateWorker);
router.delete('/workers/:id', deleteWorker);
router.post('/workers/:id/withdrawals', addWithdrawal);
router.delete('/workers/:id/withdrawals/:withdrawalId', deleteWithdrawal);
router.post('/workers/:id/bonuses', addBonus);

export default router;
