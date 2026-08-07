import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            // /today and /app-home are the native apps' home screens, served to
            // "/" by a rewrite. They exist as routes but are not web pages, and
            // indexing them would put a second, thinner homepage in search
            // results competing with the real one.
            disallow: ['/api/', '/admin', '/dashboard', '/onboarding', '/today', '/app-home'],
        },
        sitemap: absoluteUrl('/sitemap.xml'),
    };
}
