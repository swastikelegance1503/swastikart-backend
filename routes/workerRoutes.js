import { Router } from 'express';
import {
  addBonus,
  addWithdrawal,
  createWorker,
  deleteBonus,
  deleteWorker,
  deleteWithdrawal,
  getWorker,
  getWorkerSummary,
  listWorkers,
  settleMonth,
  updateSettlement,
  updateWorker
} from '../controllers/workerController.js';

const router = Router();

router.get('/workers', listWorkers);
router.post('/workers', createWorker);
router.get('/workers/:id/summary', getWorkerSummary);
router.get('/workers/:id', getWorker);
router.put('/workers/:id', updateWorker);
router.delete('/workers/:id', deleteWorker);

// ઉપાડ અને બોનસ
router.post('/workers/:id/withdrawals', addWithdrawal);
router.delete('/workers/:id/withdrawals/:withdrawalId', deleteWithdrawal);
router.post('/workers/:id/bonuses', addBonus);
router.delete('/workers/:id/bonuses/:bonusId', deleteBonus);

// માસિક પગાર પતાવટ અને સુધારો (Monthly Settlement & Edit)
router.post('/workers/:id/settle-month', settleMonth);
router.put('/workers/:id/settle-month/:settlementId', updateSettlement);

export default router;
