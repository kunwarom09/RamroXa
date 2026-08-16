export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Zylo E-Commerce API',
    version: '1.0.0',
    description: 'Production-ready REST API for Zylo E-Commerce Platform supporting high-concurrency inventory, multi-gateway payments (eSewa, Fonepay, Khalti, COD), double-entry accounting, IRD Nepal VAT compliance, customer personalization, and admin backoffice operations.',
    contact: {
      name: 'Zylo Engineering Team',
      email: 'engineering@zylo.com.np'
    }
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local Development Server'
    },
    {
      url: 'https://api.zylo.com.np',
      description: 'Production API Gateway'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token passed in Authorization header or zylo_access_token HttpOnly cookie.'
      }
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'BAD_REQUEST' },
              message: { type: 'string', example: 'Invalid input data.' },
              details: { type: 'object' }
            }
          }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          role: { type: 'string', enum: ['customer', 'admin', 'staff'] },
          isActive: { type: 'boolean' }
        }
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          slug: { type: 'string' },
          sku: { type: 'string' },
          brand: { type: 'string' },
          basePrice: { type: 'integer', description: 'Price in Paisa' },
          mrp: { type: 'integer', description: 'MRP in Paisa' },
          ratingAvg: { type: 'number', example: 4.8 },
          ratingCount: { type: 'integer', example: 24 },
          status: { type: 'string', enum: ['draft', 'active', 'archived'] }
        }
      },
      Order: {
        type: 'object',
        properties: {
          orderNo: { type: 'string', example: 'ZYL-20260816-0001' },
          subtotal: { type: 'integer', description: 'In Paisa' },
          discountTotal: { type: 'integer', description: 'In Paisa' },
          shippingTotal: { type: 'integer', description: 'In Paisa' },
          vatTotal: { type: 'integer', description: 'In Paisa' },
          grandTotal: { type: 'integer', description: 'In Paisa' },
          currency: { type: 'string', example: 'NPR' },
          paymentMethod: { type: 'string', enum: ['cod', 'esewa', 'fonepay', 'khalti'] },
          paymentStatus: { type: 'string', enum: ['pending', 'paid', 'failed', 'refunded'] },
          fulfillmentStatus: { type: 'string', enum: ['pending', 'processing', 'packed', 'shipped', 'delivered', 'cancelled', 'returned'] }
        }
      }
    }
  },
  paths: {
    '/health': {
      get: {
        tags: ['System & Health'],
        summary: 'System health check',
        responses: {
          200: { description: 'System is healthy' },
          503: { description: 'Database disconnected' }
        }
      }
    },
    '/health/ready': {
      get: {
        tags: ['System & Health'],
        summary: 'Readiness probe for load balancers and orchestrators',
        responses: {
          200: { description: 'Server ready for traffic' },
          503: { description: 'Server not ready' }
        }
      }
    },
    '/health/metrics': {
      get: {
        tags: ['System & Health'],
        summary: 'Runtime latency, throughput, and memory metrics',
        responses: {
          200: { description: 'System metrics and latency percentiles' }
        }
      }
    },
    '/api/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register new customer account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'name'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  name: { type: 'string' },
                  phone: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Account registered' },
          400: { description: 'Invalid input' },
          409: { description: 'Email already exists' }
        }
      }
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Customer login & cookie session issuance',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Signed in successfully' },
          401: { description: 'Invalid credentials' }
        }
      }
    },
    '/api/auth/admin/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Admin & Staff backoffice login',
        responses: {
          200: { description: 'Admin signed in' },
          403: { description: 'Forbidden for non-admin accounts' }
        }
      }
    },
    '/api/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get current authenticated user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'User profile' },
          401: { description: 'Unauthorized' }
        }
      }
    },
    '/api/products': {
      get: {
        tags: ['Catalog & Products'],
        summary: 'List published products with search, filtering, and pagination',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Search term' },
          { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Category slug or ID' },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }
        ],
        responses: {
          200: { description: 'Products list' }
        }
      }
    },
    '/api/products/{slug}': {
      get: {
        tags: ['Catalog & Products'],
        summary: 'Get single product details with variants',
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Product details' },
          404: { description: 'Product not found' }
        }
      }
    },
    '/api/cart': {
      get: {
        tags: ['Cart & Checkout'],
        summary: 'Get current user or guest cart',
        responses: {
          200: { description: 'Active cart' }
        }
      }
    },
    '/api/orders': {
      post: {
        tags: ['Cart & Checkout'],
        summary: 'Place an order with atomic stock reservation and coupon application',
        responses: {
          201: { description: 'Order created' },
          409: { description: 'Insufficient stock or coupon limit exceeded' }
        }
      }
    },
    '/api/payments/initiate': {
      post: {
        tags: ['Payments & Gateways'],
        summary: 'Initiate digital payment (eSewa / Fonepay / Khalti)',
        responses: {
          200: { description: 'Payment payload and gateway redirect URL' }
        }
      }
    },
    '/api/coupons/validate': {
      post: {
        tags: ['Coupons & Promotions'],
        summary: 'Validate coupon eligibility and calculate discount amount',
        responses: {
          200: { description: 'Coupon is valid' },
          400: { description: 'Coupon is invalid, expired, or subtotal too low' }
        }
      }
    },
    '/api/addresses': {
      get: {
        tags: ['Customer Address Book'],
        summary: 'List authenticated customer addresses',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Addresses list' } }
      },
      post: {
        tags: ['Customer Address Book'],
        summary: 'Create a new customer shipping/billing address',
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'Address created' } }
      }
    },
    '/api/wishlist': {
      get: {
        tags: ['Wishlist'],
        summary: 'Get authenticated user saved items',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Wishlist items' } }
      }
    },
    '/api/admin/finance/journal': {
      get: {
        tags: ['Admin Finance & Accounting'],
        summary: 'Double-entry accounting general journal entries',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Balanced journal entries' } }
      }
    },
    '/api/admin/ird/vat-summary': {
      get: {
        tags: ['Admin IRD & Tax'],
        summary: 'Monthly Nepal IRD VAT return filing summary (Bikri & Kharid Khata)',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'VAT return summary' } }
      }
    }
  }
};

export default openapiSpec;
