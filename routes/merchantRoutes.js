import { Router } from 'express';
import {
  createMerchant,
  deleteMerchant,
  getMerchant,
  listMerchants,
  updateMerchant
} from '../controllers/merchantController.js';

const router = Router();

router.get('/merchants', listMerchants);
router.post('/merchants', createMerchant);
router.get('/merchants/:id', getMerchant);
router.put('/merchants/:id', updateMerchant);
router.delete('/merchants/:id', deleteMerchant);

export default router;

