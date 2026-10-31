import { Router } from 'express';
import {
  createProfile,
  deleteProfile,
  getProfile,
  listProfiles,
  seedProfiles,
  updateProfile
} from '../controllers/profileController.js';

const router = Router();

router.get('/profiles', listProfiles);
router.post('/profiles', createProfile);
router.post('/profiles/seed', seedProfiles);
router.get('/profiles/:id', getProfile);
router.put('/profiles/:id', updateProfile);
router.delete('/profiles/:id', deleteProfile);

export default router;

