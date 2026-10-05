import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Base URLs (always include)
  const baseUrls: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/customer`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/customer/orders`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  // Fetch active products (with error handling for build time)
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, updatedAt: true },
    });

    const productUrls = products.map((product) => ({
      url: `${baseUrl}/customer/product/${product.id}`,
      lastModified: product.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    return [...baseUrls, ...productUrls];
  } catch (error) {
    // If database is unavailable during build (e.g., first deploy),
    // return base URLs. Sitemap will be regenerated on-demand at runtime.
    console.warn('Could not fetch products for sitemap during build:', error);
    return baseUrls;
  }
}
