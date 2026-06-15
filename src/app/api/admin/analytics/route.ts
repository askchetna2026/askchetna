
import { NextResponse } from 'next/server';
import { checkAdminAccess } from '@/lib/admin';
import prisma from '@/lib/prisma';
import {
    ANALYTICS_EVENT_LABELS,
    FUNNEL_EVENT_ORDER,
    PAGE_VIEW_EVENT_TYPES,
} from '@/lib/analytics/events';

export async function GET() {
    if (!await checkAdminAccess()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];

        // Find user IDs for admin emails to exclude them from analytics
        const adminUsers = await prisma.user.findMany({
            where: { email: { in: adminEmails, mode: 'insensitive' } },
            select: { id: true }
        });
        const adminIds = adminUsers.map(u => u.id);
        const excludeAdminsWhere = adminIds.length > 0
            ? { NOT: { userId: { in: adminIds } } }
            : {};

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);

        const [
            totalUsers,
            totalQuestions,
            totalRevenue,
            activeProfiles,
            dailyViews,
            totalViews,
            topCountries,
            funnelCounts,
            topPages
        ] = await Promise.all([
            prisma.user.count(),
            prisma.question.count(),
            prisma.creditPack.aggregate({
                _sum: { amount: true }
            }),
            prisma.profile.count({ where: { isActive: true } }),
            // New Analytics excluding admins
            prisma.analyticsEvent.count({
                where: {
                    ...excludeAdminsWhere,
                    type: { in: PAGE_VIEW_EVENT_TYPES as unknown as string[] },
                    createdAt: { gte: today },
                }
            }),
            prisma.analyticsEvent.count({
                where: {
                    ...excludeAdminsWhere,
                    type: { in: PAGE_VIEW_EVENT_TYPES as unknown as string[] },
                }
            }),
            prisma.analyticsEvent.groupBy({
                where: excludeAdminsWhere,
                by: ['country'],
                _count: { country: true },
                orderBy: { _count: { country: 'desc' } },
                take: 5
            }),
            prisma.analyticsEvent.groupBy({
                where: {
                    ...excludeAdminsWhere,
                    createdAt: { gte: last30Days },
                    type: { in: FUNNEL_EVENT_ORDER as unknown as string[] },
                },
                by: ['type'],
                _count: { type: true },
            }),
            prisma.analyticsEvent.groupBy({
                where: {
                    ...excludeAdminsWhere,
                    createdAt: { gte: last30Days },
                    type: { in: PAGE_VIEW_EVENT_TYPES as unknown as string[] },
                    path: { not: null },
                },
                by: ['path'],
                _count: { path: true },
                orderBy: { _count: { path: 'desc' } },
                take: 5,
            })
        ]);

        const funnelCountMap = new Map(funnelCounts.map((item) => [item.type, item._count.type]));
        const funnel = FUNNEL_EVENT_ORDER.map((eventType) => ({
            key: eventType,
            label: ANALYTICS_EVENT_LABELS[eventType],
            count: funnelCountMap.get(eventType) || 0,
        }));

        return NextResponse.json({
            totalUsers,
            totalQuestions,
            totalRevenue: (totalRevenue._sum.amount || 0) / 100,
            activeProfiles,
            dailyViews,
            totalViews,
            topCountries,
            funnel,
            topPages: topPages.map((page) => ({
                path: page.path || '(unknown)',
                views: page._count.path,
            })),
            periodDays: 30,
        });
    } catch (error) {
        console.error('Analytics Error:', error);
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
    }
}
