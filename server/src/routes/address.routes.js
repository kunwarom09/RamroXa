import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listAddresses,
  getAddress,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
} from '../controllers/address.controller.js';

export const router = express.Router();

// All address routes require an authenticated user
router.use(requireAuth);

router.get('/', listAddresses);
router.post('/', createAddress);
router.get('/:id', getAddress);
router.put('/:id', updateAddress);
router.patch('/:id', updateAddress);
router.delete('/:id', deleteAddress);
router.patch('/:id/default', setDefaultAddress);

export default router;
