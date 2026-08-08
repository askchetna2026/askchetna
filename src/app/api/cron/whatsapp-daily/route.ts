import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { whatsappClient } from '@/lib/whatsapp/client';

export async function GET(request: Request) {
    // 1. Verify Vercel Cron Secret for security
    const authHeader = request.headers.get('authorization');
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        console.log("Starting Daily WhatsApp Alerts Cron Job...");

        // 2. Fetch all users who have opted in and have a phone number
        const users = await prisma.user.findMany({
            where: {
                whatsappOptIn: true,
                phone: { not: null }
            },
            select: {
                id: true,
                phone: true,
                name: true
            }
        });

        console.log(`Found ${users.length} users opted in for WhatsApp alerts.`);

        let successCount = 0;
        let failureCount = 0;

        // 3. Loop through users and send the template message
        for (const user of users) {
            try {
                // IMPORTANT: For outbound alerts to physical phones outside the 24-hour window, 
                // Meta strictly requires a pre-approved Template Message. 
                // We are using 'hello_world' as the placeholder until a real Daily Horoscope template is approved.
                await whatsappClient.sendTemplateMessage(user.phone!, 'hello_world');
                successCount++;
                console.log(`Successfully sent daily alert to ${user.phone}`);
            } catch (error) {
                failureCount++;
                console.error(`Failed to send daily alert to ${user.phone}:`, error);
            }
        }

        console.log(`Cron Job Complete. Success: ${successCount}, Failed: ${failureCount}`);

        return NextResponse.json({
            message: 'Daily WhatsApp alerts processed',
            successCount,
            failureCount
        }, { status: 200 });

    } catch (error) {
        console.error('Fatal error in Daily WhatsApp Cron:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
