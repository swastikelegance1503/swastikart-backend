import { Router } from 'express';
import {
  createChallan,
  deleteChallan,
  getChallan,
  getDateWiseSummary,
  listChallans,
  printChallan,
  updateChallan
} from '../controllers/challanController.js';

const router = Router();

router.get('/challans', listChallans);
router.get('/challans/date-summary', getDateWiseSummary);
router.get('/challans/summary', getDateWiseSummary);
router.get('/challans/:id/print', printChallan);
router.get('/challans/:id', getChallan);
router.post('/challans', createChallan);
router.put('/challans/:id', updateChallan);
router.delete('/challans/:id', deleteChallan);

export default router;

