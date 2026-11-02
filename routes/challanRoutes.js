import { Router } from 'express';
import {
  createChallan,
  deleteChallan,
  getChallan,
  getDateWiseSummary,
  listChallans,
  printChallan,
  updateChallan,
  getGoogleDriveConfigHandler,
  updateGoogleDriveConfigHandler,
  syncSingleToDriveHandler,
  syncAllToDriveHandler
} from '../controllers/challanController.js';

const router = Router();

// Google Drive Sync Routes (swastikelegance065@gmail.com)
router.get('/challans/drive/config', getGoogleDriveConfigHandler);
router.post('/challans/drive/config', updateGoogleDriveConfigHandler);
router.post('/challans/drive/sync-all', syncAllToDriveHandler);
router.post('/challans/:id/sync-drive', syncSingleToDriveHandler);

// Standard Challan Routes
router.get('/challans', listChallans);
router.get('/challans/date-summary', getDateWiseSummary);
router.get('/challans/summary', getDateWiseSummary);
router.get('/challans/:id/print', printChallan);
router.get('/challans/:id', getChallan);
router.post('/challans', createChallan);
router.put('/challans/:id', updateChallan);
router.delete('/challans/:id', deleteChallan);

export default router;

