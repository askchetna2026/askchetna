import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

type AnalyticsMetadata = Prisma.InputJsonObject | Prisma.NullableJsonNullValueInput | undefined;

type RecordAnalyticsEventInput = {
    type: string;
    path?: string | null;
    userId?: string | null;
    visitorId?: string | null;
    country?: string | null;
    city?: string | null;
    metadata?: AnalyticsMetadata;
};

export function getRequestLocation(headers: Headers) {
    return {
        country: headers.get('x-vercel-ip-country') || headers.get('cf-ipcountry') || 'Unknown',
        city: headers.get('x-vercel-ip-city') || headers.get('cf-ipcity') || 'Unknown',
    };
}

export async function recordAnalyticsEvent(input: RecordAnalyticsEventInput) {
    try {
        await prisma.analyticsEvent.create({
            data: {
                type: input.type,
                path: input.path || null,
                userId: input.userId || null,
                visitorId: input.visitorId || null,
                country: input.country || 'Unknown',
                city: input.city || 'Unknown',
                metadata: input.metadata ?? {},
            },
        });
    } catch (error) {
        console.error('Analytics recording failed:', error);
    }
}
