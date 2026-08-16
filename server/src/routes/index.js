import express from 'express';
import categoryRoutes from './category.routes.js';
import productRoutes from './product.routes.js';
import authRoutes from './auth.routes.js';
import cartRoutes from './cart.routes.js';
import orderRoutes from './order.routes.js';
import paymentRoutes from './payment.routes.js';
import adminRoutes from './admin.routes.js';
import addressRoutes from './address.routes.js';
import couponRoutes from './coupon.routes.js';
import reviewRoutes from './review.routes.js';
import wishlistRoutes from './wishlist.routes.js';
import docsRoutes from './docs.routes.js';

export const apiRouter = express.Router();

// Root API status
apiRouter.get('/', (req, res) => {
  res.json({
    name: 'Zylo E-Commerce API',
    version: '1.0.0',
    status: 'active',
    documentation: '/api/docs'
  });
});

// Phase 8 Interactive API Documentation
apiRouter.use('/docs', docsRoutes);

// Phase 1 Routes
apiRouter.use('/categories', categoryRoutes);
apiRouter.use('/products', productRoutes);
apiRouter.use('/products', reviewRoutes);

// Phase 2 Routes
apiRouter.use('/auth', authRoutes);

// Phase 3 Routes
apiRouter.use('/cart', cartRoutes);
apiRouter.use('/orders', orderRoutes);

// Phase 4 Routes
apiRouter.use('/payments', paymentRoutes);

// Phase 5 Routes
apiRouter.use('/admin', adminRoutes);

// Phase 6 Routes
apiRouter.use('/addresses', addressRoutes);
apiRouter.use('/coupons', couponRoutes);
apiRouter.use('/wishlist', wishlistRoutes);

export default apiRouter;
