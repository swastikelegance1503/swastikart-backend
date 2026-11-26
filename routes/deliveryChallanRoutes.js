import express from 'express';
import {
  getDeliveryChallans,
  getDeliveryChallanById,
  getNextChallanNo,
  createDeliveryChallan,
  updateDeliveryChallan,
  deleteDeliveryChallan,
  printDeliveryChallan
} from '../controllers/deliveryChallanController.js';

const router = express.Router();

router.get('/delivery-challans', getDeliveryChallans);
router.get('/delivery-challans/next-no', getNextChallanNo);
router.get('/delivery-challans/:id', getDeliveryChallanById);
router.post('/delivery-challans', createDeliveryChallan);
router.put('/delivery-challans/:id', updateDeliveryChallan);
router.delete('/delivery-challans/:id', deleteDeliveryChallan);
router.get('/delivery-challans/:id/print', printDeliveryChallan);

export default router;

