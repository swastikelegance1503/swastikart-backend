import express from 'express';
import {
  getDeliveryChallans,
  getDeliveryChallanById,
  getNextChallanNo,
  createDeliveryChallan,
  updateDeliveryChallan,
  deleteDeliveryChallan,
  printDeliveryChallan,
  syncSingleDeliveryChallanToDriveHandler,
  syncAllDeliveryChallansToDriveHandler
} from '../controllers/deliveryChallanController.js';

const router = express.Router();

router.get('/delivery-challans', getDeliveryChallans);
router.get('/delivery-challans/next-no', getNextChallanNo);
router.post('/delivery-challans/drive/sync-all', syncAllDeliveryChallansToDriveHandler);
router.post('/delivery-challans/:id/sync-drive', syncSingleDeliveryChallanToDriveHandler);
router.get('/delivery-challans/:id/print', printDeliveryChallan);
router.get('/delivery-challans/:id', getDeliveryChallanById);
router.post('/delivery-challans', createDeliveryChallan);
router.put('/delivery-challans/:id', updateDeliveryChallan);
router.delete('/delivery-challans/:id', deleteDeliveryChallan);

export default router;
