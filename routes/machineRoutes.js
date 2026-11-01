import { Router } from 'express';
import {
  addMachineDailyProduction,
  createMachine,
  deleteMachine,
  deleteMachineDailyProduction,
  getMachine,
  listAllMachineDailyProductions,
  listMachines,
  updateMachine
} from '../controllers/machineController.js';

const router = Router();

// મશીન માસ્ટર રૂટ્સ (Machine Master Routes)
router.get('/machines', listMachines);
router.post('/machines', createMachine);
router.get('/machines/daily-productions', listAllMachineDailyProductions);
router.get('/machines/:id', getMachine);
router.put('/machines/:id', updateMachine);
router.delete('/machines/:id', deleteMachine);

// મશીન દૈનિક પ્રોડક્શન રૂટ્સ (Machine Daily Production Routes)
router.post('/machines/daily-production', addMachineDailyProduction);
router.post('/machines/:id/daily-production', addMachineDailyProduction);
router.delete('/machines/:id/daily-production/:entryId', deleteMachineDailyProduction);

export default router;

