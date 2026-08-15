import type { MetadataRoute } from 'next';
import prisma from '@/lib/prisma';
import { absoluteUrl } from '@/lib/site';
import { RASHIS } from '@/lib/rashis';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const now = new Date();

    // Public, indexable routes. Authenticated/admin/api routes are intentionally excluded.
    const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
        { path: '/', priority: 1.0, changeFrequency: 'weekly' },
        { path: '/about', priority: 0.8, changeFrequency: 'monthly' },
        { path: '/blog', priority: 0.9, changeFrequency: 'weekly' },
        { path: '/ai-astrologer', priority: 0.8, changeFrequency: 'monthly' },
        { path: '/relationship-astrology', priority: 0.8, changeFrequency: 'monthly' },
        { path: '/career-astrology', priority: 0.8, changeFrequency: 'monthly' },
        { path: '/dasha-timeline', priority: 0.8, changeFrequency: 'monthly' },
        { path: '/glossary', priority: 0.7, changeFrequency: 'monthly' },
        { path: '/how-we-calculate', priority: 0.6, changeFrequency: 'monthly' },
        { path: '/clarity', priority: 0.8, changeFrequency: 'monthly' },
        { path: '/chart', priority: 0.8, changeFrequency: 'monthly' },
        { path: '/timing', priority: 0.7, changeFrequency: 'monthly' },
        { path: '/synastry', priority: 0.7, changeFrequency: 'monthly' },
        { path: '/disclaimer', priority: 0.3, changeFrequency: 'yearly' },
        { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
        { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
        { path: '/refund', priority: 0.3, changeFrequency: 'yearly' },
        { path: '/contact', priority: 0.4, changeFrequency: 'yearly' },
    ];

    const staticEntries: MetadataRoute.Sitemap = routes.map((r) => ({
        url: absoluteUrl(r.path),
        lastModified: now,
        changeFrequency: r.changeFrequency,
        priority: r.priority,
    }));

    // The twelve rashi pages. Derived from RASHIS rather than listed by hand so
    // adding a sign can never silently leave it out of the sitemap.
    const rashiEntries: MetadataRoute.Sitemap = RASHIS.map((r) => ({
        url: absoluteUrl(`/rashi/${r.slug}`),
        lastModified: now,
        changeFrequency: 'monthly' as const,
        priority: 0.7,
    }));

    // Individual blog posts — indexable and addressable
    let postEntries: MetadataRoute.Sitemap = [];
    try {
        const posts = await prisma.blogPost.findMany({ select: { id: true, updatedAt: true } });
        postEntries = posts.map((p) => ({
            url: absoluteUrl(`/blog/${p.id}`),
            lastModified: p.updatedAt,
            changeFrequency: 'monthly' as const,
            priority: 0.6,
        }));
    } catch (error) {
        console.error('Sitemap: failed to load blog posts:', error);
    }

    return [...staticEntries, ...rashiEntries, ...postEntries];
}
