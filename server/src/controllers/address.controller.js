import { asyncHandler } from '../utils/asyncHandler.js';
import addressService from '../services/address.service.js';

export const listAddresses = asyncHandler(async (req, res) => {
  const addresses = await addressService.listUserAddresses(req.user._id);
  res.status(200).json({ data: { addresses } });
});

export const getAddress = asyncHandler(async (req, res) => {
  const address = await addressService.getAddressById(req.params.id, req.user._id);
  res.status(200).json({ data: { address } });
});

export const createAddress = asyncHandler(async (req, res) => {
  const address = await addressService.createAddress(req.user._id, req.body);
  res.status(201).json({
    message: 'Address created successfully.',
    data: { address }
  });
});

export const updateAddress = asyncHandler(async (req, res) => {
  const address = await addressService.updateAddress(req.params.id, req.user._id, req.body);
  res.status(200).json({
    message: 'Address updated successfully.',
    data: { address }
  });
});

export const deleteAddress = asyncHandler(async (req, res) => {
  const result = await addressService.deleteAddress(req.params.id, req.user._id);
  res.status(200).json(result);
});

export const setDefaultAddress = asyncHandler(async (req, res) => {
  const address = await addressService.setDefaultAddress(req.params.id, req.user._id);
  res.status(200).json({
    message: 'Default address updated successfully.',
    data: { address }
  });
});

export default {
  listAddresses,
  getAddress,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
};
