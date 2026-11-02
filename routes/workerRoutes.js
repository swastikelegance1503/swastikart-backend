import { Router } from 'express';
import {
  addBonus,
  addWithdrawal,
  addWorkerDailyProduction,
  createWorker,
  deleteBonus,
  deleteSettlement,
  deleteWorker,
  deleteWithdrawal,
  deleteWorkerDailyProduction,
  getSalaryManagement,
  getWorker,
  getWorkerSummary,
  listAllProductionBonuses,
  listWorkers,
  settleMonth,
  syncMachineProductionEndpoint,
  updateSettlement,
  updateWithdrawal,
  updateWorker,
  updateWorkerDailyProduction,
  updateWorkerProductionRule
} from '../controllers/workerController.js';

const router = Router();

router.get('/workers', listWorkers);
router.post('/workers', createWorker);
router.get('/workers/salary-management', getSalaryManagement);
router.post('/workers/sync-machine-production', syncMachineProductionEndpoint);
router.get('/workers/production-bonuses', listAllProductionBonuses);
router.get('/workers/:id/summary', getWorkerSummary);
router.get('/workers/:id', getWorker);
router.put('/workers/:id', updateWorker);
router.delete('/workers/:id', deleteWorker);

// ઉપાડ અને બોનસ (Advances & Bonuses)
router.post('/workers/:id/withdrawals', addWithdrawal);
router.put('/workers/:id/withdrawals/:withdrawalId', updateWithdrawal);
router.delete('/workers/:id/withdrawals/:withdrawalId', deleteWithdrawal);
router.post('/workers/:id/bonuses', addBonus);
router.delete('/workers/:id/bonuses/:bonusId', deleteBonus);

// દૈનિક પ્રોડક્શન & ઓટો બોનસ નિયમ (Daily Production & Auto Bonus Rules)
router.post('/workers/:id/daily-production', addWorkerDailyProduction);
router.put('/workers/:id/daily-production/:entryId', updateWorkerDailyProduction);
router.delete('/workers/:id/daily-production/:entryId', deleteWorkerDailyProduction);
router.put('/workers/:id/production-rule', updateWorkerProductionRule);

// માસિક પગાર પતાવટ અને સુધારો (Monthly Settlement, Edit & Delete)
router.post('/workers/:id/settle-month', settleMonth);
router.put('/workers/:id/settle-month/:settlementId', updateSettlement);
router.delete('/workers/:id/settle-month/:settlementId', deleteSettlement);

export default router;
