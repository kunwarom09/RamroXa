import { Address } from '../models/Address.js';
import { ApiError } from '../utils/ApiError.js';

export async function listUserAddresses(userId) {
  return Address.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 });
}

export async function getAddressById(addressId, userId) {
  const address = await Address.findOne({ _id: addressId, user: userId });
  if (!address) {
    throw ApiError.notFound('Address not found.');
  }
  return address;
}

export async function createAddress(userId, data) {
  const {
    fullName,
    phone,
    line1,
    line2,
    city = 'Kathmandu',
    district = 'Kathmandu',
    province = 'Bagmati',
    postalCode = '',
    country = 'NP',
    isDefault = false,
    label = 'home'
  } = data;

  if (!fullName || !phone || !line1) {
    throw ApiError.badRequest('Full name, phone, and address line 1 are required.');
  }

  // If this is set as default or is the first address, ensure others are not default
  const existingCount = await Address.countDocuments({ user: userId });
  const shouldBeDefault = isDefault || existingCount === 0;

  if (shouldBeDefault) {
    await Address.updateMany({ user: userId }, { isDefault: false });
  }

  const address = await Address.create({
    user: userId,
    fullName,
    phone,
    line1,
    line2,
    city,
    district,
    province,
    postalCode,
    country,
    isDefault: shouldBeDefault,
    label
  });

  return address;
}

export async function updateAddress(addressId, userId, updates) {
  const address = await Address.findOne({ _id: addressId, user: userId });
  if (!address) {
    throw ApiError.notFound('Address not found.');
  }

  if (updates.isDefault) {
    await Address.updateMany({ user: userId }, { isDefault: false });
  }

  const allowed = ['fullName', 'phone', 'line1', 'line2', 'city', 'district', 'province', 'postalCode', 'country', 'isDefault', 'label'];
  for (const field of allowed) {
    if (updates[field] !== undefined) {
      address[field] = updates[field];
    }
  }

  await address.save();
  return address;
}

export async function deleteAddress(addressId, userId) {
  const address = await Address.findOne({ _id: addressId, user: userId });
  if (!address) {
    throw ApiError.notFound('Address not found.');
  }

  const wasDefault = address.isDefault;
  await Address.deleteOne({ _id: addressId });

  // If deleted address was default, promote the newest remaining address
  if (wasDefault) {
    const nextDefault = await Address.findOne({ user: userId }).sort({ createdAt: -1 });
    if (nextDefault) {
      nextDefault.isDefault = true;
      await nextDefault.save();
    }
  }

  return { message: 'Address deleted successfully.' };
}

export async function setDefaultAddress(addressId, userId) {
  const address = await Address.findOne({ _id: addressId, user: userId });
  if (!address) {
    throw ApiError.notFound('Address not found.');
  }

  await Address.updateMany({ user: userId }, { isDefault: false });
  address.isDefault = true;
  await address.save();

  return address;
}

export default {
  listUserAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
};
