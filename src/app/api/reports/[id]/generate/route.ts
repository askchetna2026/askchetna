import { NextRequest, NextResponse } from 'next/server';
export const maxDuration = 60;
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { generateReportChapters } from '@/lib/ai/geminiService';
import { sendLifeReportEmail } from '@/lib/mail';
import { generateReportPDF, type ReportContent } from '@/lib/pdf';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { recordAnalyticsEvent } from '@/lib/analytics/server';
import { guardAiSpend } from '@/lib/ai/costGuard';
import { applyUserLanguage } from '@/lib/i18n/context';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // 1. Verify report is purchased and profile exists
        const report = await prisma.report.findUnique({
            where: { profileId: id },
            include: { profile: true }
        });

        if (!report || (report.status !== 'purchased' && report.status !== 'generated')) {
            return NextResponse.json({ error: 'Report not purchased or profile missing' }, { status: 403 });
        }

        if (report.profile.userId !== session.user.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        /**
         * Serve what was already written.
         *
         * `Report.content` exists to cache the finished chapters, but this route
         * regenerated them on every call and overwrote the cache with the
         * result — so one purchased report could drive an unlimited number of
         * the most expensive AI calls in the app, and a seeker re-opening their
         * report got a subtly different one each time.
         *
         * `regenerate` is the deliberate way back in, for a report whose stored
         * content is bad. It costs a fresh generation, so it goes through the
         * same spend guard as the ungated flows.
         */
        const body = await req.json().catch(() => ({}));
        const forceRegenerate = body?.regenerate === true;

        if (!forceRegenerate && report.status === 'generated' && report.content) {
            return NextResponse.json({
                success: true,
                cached: true,
                content: report.content,
            });
        }

        if (forceRegenerate) {
            // The seeker's language, attached to this request so every prompt
            // rendered below picks it up. See src/lib/i18n/context.ts.
            await applyUserLanguage(session.user.id);

            const limited = guardAiSpend(session.user.id, 'report-regenerate');
            if (limited) return limited;
        }

        // 2. Generate content using Gemini
        const content: ReportContent = await generateReportChapters({
            name: report.profile.name,
            gender: report.profile.gender,
            chartData: report.profile.chartData
        });

        // 3. Save content and update status
        const updatedReport = await prisma.report.update({
            where: { profileId: id },
            data: {
                status: 'generated',
                content: content as unknown as Prisma.InputJsonValue
            }
        });

        await recordAnalyticsEvent({
            type: ANALYTICS_EVENTS.REPORT_STARTED,
            path: `/report/${id}`,
            userId: session.user.id,
            metadata: {
                profileId: id,
                reportId: updatedReport.id,
                regenerated: report.status === 'generated',
            }
        });

        // 4. Generate PDF and Send Email (non-blocking)
        const userEmail = session.user?.email;
        if (userEmail) {
            (async () => {
                try {
                    const pdfBuffer = await generateReportPDF(report.profile.name, content, report.profile.chartData);
                    await sendLifeReportEmail(userEmail, report.profile.name, content, pdfBuffer);
                } catch (err) {
                    console.error('Post-generation processing failed:', err);
                }
            })();
        }

        return NextResponse.json({
            success: true,
            content: updatedReport.content
        });

    } catch (error: unknown) {
        console.error('Generation error:', error);
        return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
    }
}
