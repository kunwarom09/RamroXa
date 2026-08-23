import { api } from './apiClient';

export async function placeOrderApi(orderData) {
  const idempotencyKey = 'idemp_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
  const res = await api.post('/api/orders', orderData, {
    headers: {
      'Idempotency-Key': idempotencyKey
    }
  });
  return res.data?.order || res;
}

export async function fetchOrderApi(orderId, orderNo) {
  const query = orderNo ? `?orderNo=${orderNo}` : '';
  const res = await api.get(`/api/orders/${orderId}${query}`);
  return res.data?.order || null;
}

export async function fetchUserOrdersApi() {
  const res = await api.get('/api/orders');
  return res.data?.orders || [];
}

export async function getOrders() {
  const res = await api.get('/api/admin/orders');
  return res.data?.orders || res.data || [];
}

export async function updateOrderStatus(orderNo, status) {
  const res = await api.patch(`/api/admin/orders/${orderNo}/status`, { fulfillmentStatus: status });
  return res.data?.order || null;
}

