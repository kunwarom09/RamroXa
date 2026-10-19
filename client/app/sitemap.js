import { SITE_URL, getAllPublishedProducts } from '../config/seoConfig.js';

export default async function sitemap() {
  const products = await getAllPublishedProducts();
  const now = new Date();

  // Primary static indexable routes
  const staticRoutes = [
    {
      url: `${SITE_URL}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0
    },
    {
      url: `${SITE_URL}/shop`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6
    }
  ];

  // Key search-optimized category landing routes
  const categoryRoutes = [
    {
      url: `${SITE_URL}/shop?category=footwear`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8
    },
    {
      url: `${SITE_URL}/shop?category=bags`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8
    }
  ];

  // Every published product detail route
  const productRoutes = products.map((prod) => {
    let lastMod = now;
    if (prod.updatedAt) {
      const parsed = new Date(prod.updatedAt);
      if (!isNaN(parsed.getTime())) lastMod = parsed;
    }
    return {
      url: `${SITE_URL}/product/${prod.slug}`,
      lastModified: lastMod,
      changeFrequency: 'weekly',
      priority: 0.8
    };
  });

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
