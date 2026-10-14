import { describe, it, expect } from 'vitest';
import {
  stripHtml,
  hasNoDollarOrDot,
  isValidImageUrl,
  productInputSchema,
  variantInputSchema,
  checkSkusAndOrphans,
  checkOptionConsistency,
  sanitizeProductInput,
  sanitizeVariantInput
} from '../../scripts/import-catalog.js';

describe('Catalog Import Validators & Helpers', () => {
  describe('stripHtml & Sanitization', () => {
    it('should strip script tags and html elements from names and descriptions', () => {
      const maliciousName = 'Hiking Jacket <script>alert("xss")</script><b>Bold</b>';
      const clean = stripHtml(maliciousName);
      expect(clean).toBe('Hiking Jacket Bold');
      expect(clean).not.toContain('<script>');
      expect(clean).not.toContain('<b>');
    });

    it('should unescape entities and trim whitespace', () => {
      const htmlText = ' Men &amp; Boys T-Shirt &gt; 100% Cotton ';
      expect(stripHtml(htmlText)).toBe('Men & Boys T-Shirt > 100% Cotton');
    });

    it('should sanitize product inputs cleanly', () => {
      const raw = {
        name: 'Cool Bag <style>body{color:red}</style>',
        description: '<p>High quality nylon</p>',
        brand: '<b>Humtto</b>'
      };
      const sanitized = sanitizeProductInput(raw);
      expect(sanitized.name).toBe('Cool Bag');
      expect(sanitized.description).toBe('High quality nylon');
      expect(sanitized.brand).toBe('Humtto');
    });
  });

  describe('NoSQL Injection Guard (hasNoDollarOrDot)', () => {
    it('should reject keys or values starting with or containing $ or .', () => {
      expect(hasNoDollarOrDot('$where')).toBe(false);
      expect(hasNoDollarOrDot('nested.key')).toBe(false);
      expect(hasNoDollarOrDot('Size')).toBe(true);
      expect(hasNoDollarOrDot('XL')).toBe(true);
    });
  });

  describe('Image URL Validation', () => {
    it('should accept valid relative uploads and https URLs', () => {
      expect(isValidImageUrl('/uploads/products/bag/01.webp')).toBe(true);
      expect(isValidImageUrl('https://example.com/images/shoe.jpg')).toBe(true);
    });

    it('should reject javascript:, data:, and http: schemes', () => {
      expect(isValidImageUrl('javascript:alert(1)')).toBe(false);
      expect(isValidImageUrl('data:image/png;base64,abc')).toBe(false);
      expect(isValidImageUrl('http://insecure.com/pic.jpg')).toBe(false);
      expect(isValidImageUrl('')).toBe(false);
    });
  });

  describe('Money & Product Schema Validation', () => {
    const validProduct = {
      name: 'Trail Backpack 40L',
      slug: 'trail-backpack-40l',
      sku: 'BP-40L-001',
      categoryId: 'c_bags',
      productType: 'Bags',
      brand: 'Humtto',
      gender: 'Unisex',
      season: 'SS26',
      tags: ['hiking', 'bags'],
      description: '40L rugged outdoor pack.',
      options: { Size: ['40L'], Color: ['Red', 'Black'] },
      images: [{ url: '/uploads/products/bp/01.webp', alt: 'Front view' }],
      status: 'draft',
      labels: { featured: false, trending: false, newArrival: false, bestSelling: false },
      basePrice: 1850000,
      price: 1850000,
      mrp: 2000000,
      cost: 1200000,
      ratingAvg: 0,
      ratingCount: 0,
      deletedAt: null
    };

    it('should accept integer paisa money values', () => {
      const res = productInputSchema.safeParse(validProduct);
      expect(res.success).toBe(true);
    });

    it('should reject float money values (not integer paisa)', () => {
      const invalidProduct = { ...validProduct, basePrice: 1850.5 };
      const res = productInputSchema.safeParse(invalidProduct);
      expect(res.success).toBe(false);
      expect(res.error.issues[0].message).toContain('must be an integer');
    });

    it('should reject negative money values', () => {
      const invalidProduct = { ...validProduct, price: -100 };
      const res = productInputSchema.safeParse(invalidProduct);
      expect(res.success).toBe(false);
      expect(res.error.issues[0].message).toContain('cannot be negative');
    });

    it('should reject string money values', () => {
      const invalidProduct = { ...validProduct, basePrice: '1850000' };
      const res = productInputSchema.safeParse(invalidProduct);
      expect(res.success).toBe(false);
    });

    it('should reject options containing $ or . keys and values', () => {
      const badKeyProduct = { ...validProduct, options: { '$gt': ['10'] } };
      expect(productInputSchema.safeParse(badKeyProduct).success).toBe(false);

      const badValProduct = { ...validProduct, options: { Size: ['$ne'] } };
      expect(productInputSchema.safeParse(badValProduct).success).toBe(false);
    });

    it('should reject product names exceeding 300 characters', () => {
      const longNameProduct = { ...validProduct, name: 'A'.repeat(301) };
      const res = productInputSchema.safeParse(longNameProduct);
      expect(res.success).toBe(false);
      expect(res.error.issues[0].message).toContain('exceeds 300 chars');
    });
  });

  describe('Variant Schema Validation', () => {
    const validVariant = {
      productSku: 'BP-40L-001',
      sku: 'BP-40L-001-RED',
      name: 'Red / 40L',
      options: { Color: 'Red', Size: '40L' },
      price: 1850000,
      compareAtPrice: null,
      cost: null,
      barcode: null,
      capacity: '40L',
      weight: 1200,
      status: 'out_of_stock',
      published: false,
      hidden: false
    };

    it('should accept valid variant with integer paisa or null price', () => {
      expect(variantInputSchema.safeParse(validVariant).success).toBe(true);

      const defaultVariant = { ...validVariant, price: null };
      expect(variantInputSchema.safeParse(defaultVariant).success).toBe(true);
    });

    it('should reject float prices on variants', () => {
      const badPriceVariant = { ...validVariant, price: 99.99 };
      expect(variantInputSchema.safeParse(badPriceVariant).success).toBe(false);
    });

    it('should reject options containing NoSQL injection characters', () => {
      const badOptVariant = { ...validVariant, options: { 'Size.dot': '40L' } };
      expect(variantInputSchema.safeParse(badOptVariant).success).toBe(false);
    });
  });

  describe('Integrity & Duplicate Detection (checkSkusAndOrphans)', () => {
    it('should detect duplicate product SKUs', () => {
      const products = [
        { sku: 'SKU-001', slug: 'p1' },
        { sku: 'sku-001', slug: 'p2' } // case insensitive collision
      ];
      const { errors } = checkSkusAndOrphans(products, []);
      expect(errors.some((e) => e.type === 'DUPLICATE_PRODUCT_SKU')).toBe(true);
    });

    it('should detect duplicate product slugs', () => {
      const products = [
        { sku: 'SKU-001', slug: 'jacket' },
        { sku: 'SKU-002', slug: 'JACKET' }
      ];
      const { errors } = checkSkusAndOrphans(products, []);
      expect(errors.some((e) => e.type === 'DUPLICATE_PRODUCT_SLUG')).toBe(true);
    });

    it('should detect duplicate variant SKUs', () => {
      const products = [{ sku: 'SKU-001', slug: 'p1' }];
      const variants = [
        { productSku: 'SKU-001', sku: 'VAR-001' },
        { productSku: 'SKU-001', sku: 'var-001' }
      ];
      const { errors } = checkSkusAndOrphans(products, variants);
      expect(errors.some((e) => e.type === 'DUPLICATE_VARIANT_SKU')).toBe(true);
    });

    it('should detect orphan variants whose parent productSku is missing', () => {
      const products = [{ sku: 'SKU-001', slug: 'p1' }];
      const variants = [{ productSku: 'NON-EXISTENT-PARENT', sku: 'VAR-999' }];
      const { errors } = checkSkusAndOrphans(products, variants);
      expect(errors.some((e) => e.type === 'ORPHAN_VARIANT')).toBe(true);
    });

    it('should warn when variant SKU does not match parent SKU pattern', () => {
      const products = [{ sku: 'PARENT-JACKET', slug: 'p1' }];
      const variants = [{ productSku: 'PARENT-JACKET', sku: 'UNRELATED-SKU-01', options: {} }];
      const { warnings } = checkSkusAndOrphans(products, variants);
      expect(warnings.some((w) => w.type === 'SKU_PATTERN_MISMATCH')).toBe(true);
    });

    it('should warn when variant has empty option values', () => {
      const products = [{ sku: 'SKU-001', slug: 'p1' }];
      const variants = [{ productSku: 'SKU-001', sku: 'SKU-001-V1', options: { Size: '' } }];
      const { warnings } = checkSkusAndOrphans(products, variants);
      expect(warnings.some((w) => w.type === 'EMPTY_OPTION_VALUE')).toBe(true);
    });
  });

  describe('Option Consistency Checks (checkOptionConsistency)', () => {
    it('should detect when variant options are not defined or value not in parent allowed list', () => {
      const products = [
        {
          sku: 'PROD-01',
          options: { Size: ['M', 'L'] }
        }
      ];
      const variants = [
        {
          productSku: 'PROD-01',
          sku: 'PROD-01-XL',
          options: { Size: 'XL', Color: 'Blue' } // Size XL is not in ['M', 'L'], Color is not in parent
        }
      ];

      const discrepancies = checkOptionConsistency(products, variants);
      expect(discrepancies.length).toBe(2);
      expect(discrepancies.some((d) => d.key === 'Color')).toBe(true);
      expect(discrepancies.some((d) => d.key === 'Size' && d.value === 'XL')).toBe(true);
    });
  });
});
