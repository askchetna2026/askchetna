import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateWhatsAppReply } from '@/lib/ai/geminiService';
import { whatsappClient } from '@/lib/whatsapp/client';
import { calculateChart } from '@/lib/astrology/calculator';

const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'askchetna_wa_verify_token';

/**
 * Handles the webhook verification request from Meta.
 * When configuring the webhook in the Meta App Dashboard, Meta will send a GET request
 * with a challenge token. We must echo it back.
 */
export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('WhatsApp Webhook Verified');
        return new NextResponse(challenge, { status: 200 });
    } else {
        return new NextResponse('Forbidden', { status: 403 });
    }
}

/**
 * Handles incoming webhook payloads from WhatsApp.
 * This includes message delivery statuses (sent, delivered, read) and
 * incoming messages from users.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log("Raw Webhook Payload received:", JSON.stringify(body, null, 2));

        if (body.object !== 'whatsapp_business_account') {
            return new NextResponse('Not Found', { status: 404 });
        }

        // Iterate through entries and changes to extract message details
        if (body.entry && body.entry.length > 0) {
            for (const entry of body.entry) {
                if (entry.changes && entry.changes.length > 0) {
                    for (const change of entry.changes) {
                        const value = change.value;

                        // 1. Handle incoming messages (Phase 2: AI Chat)
                        if (value.messages && value.messages.length > 0) {
                            for (const msg of value.messages) {
                                if (msg.type === 'text' && msg.text?.body) {
                                    console.log(`Received incoming WhatsApp message from ${msg.from}:`, msg.text.body);

                                    // We don't await this inside the loop to avoid blocking Meta's strict 200 OK timeout.
                                    // Process AI request asynchronously.
                                    processAIWhatsAppMessage(msg.from, msg.text.body).catch(e => {
                                        console.error('Failed to process WhatsApp AI message:', e);
                                    });
                                }
                            }
                        }

                        // 2. Handle message statuses (Sent, Delivered, Read)
                        if (value.statuses && value.statuses.length > 0) {
                            for (const status of value.statuses) {
                                console.log(`WhatsApp message status update: [${status.id}] is now ${status.status}`);
                                // We could log this to a WhatsAppMessageLog table in the future
                            }
                        }
                    }
                }
            }
        }

        // Meta requires a 200 OK response quickly, otherwise they will retry the webhook
        return new NextResponse('OK', { status: 200 });
    } catch (error) {
        console.error('Error handling WhatsApp webhook:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

async function processAIWhatsAppMessage(phone: string, text: string) {
    // 1. Look up user
    // Normalize phone by ensuring it has a + if Meta sends it without one
    const normalizedPhone = phone.startsWith('+') ? phone : `+${phone}`;
    
    let isTestUser = (normalizedPhone === '+16315551181' || phone === '16315551181');
    let user = null;
    let activeProfile = null;

    if (!isTestUser) {
        user = await prisma.user.findUnique({
            where: { phone: normalizedPhone },
            include: {
                profiles: {
                    where: { isActive: true },
                    take: 1
                }
            }
        });

        if (!user || !user.whatsappOptIn) {
            console.log(`WhatsApp message received from ${phone} but they are not a registered/opted-in user. Ignoring.`);
            return;
        }
        activeProfile = user.profiles[0];
    } else {
        console.log("Mocking Database lookup for Meta Dashboard Test Button...");
    }

    // 2. Fetch Chart Context
    let chartContext = undefined;
    
    if (isTestUser) {
        console.log("Generating Mock Chart Context for Test Button...");
        chartContext = await calculateChart(1990, 1, 1, 12.0, 0, 0);
    } else if (activeProfile) {
        const utcDate = new Date(activeProfile.dateOfBirth);
        // Extremely simple chart load just for AI context
        chartContext = await calculateChart(
            utcDate.getUTCFullYear(),
            utcDate.getUTCMonth() + 1,
            utcDate.getUTCDate(),
            activeProfile.timeOfBirth ? parseFloat(activeProfile.timeOfBirth) : 12.0,
            activeProfile.latitude || 0,
            activeProfile.longitude || 0
        );
    }

    // 3. Generate AI Reply
    console.log("Generating AI Reply...");
    const replyUserId = isTestUser ? 'test-user-id' : user!.id;
    const replyText = await generateWhatsAppReply(replyUserId, text, chartContext);
    console.log("-----------------------------------------");
    console.log(`AI RESPONSE GENERATED FOR ${phone}:`);
    console.log(replyText);
    console.log("-----------------------------------------");

    if (isTestUser) {
        console.log("Test Button flow complete! AI response printed above.");
        return; // Don't actually try to send a WhatsApp message to the fake test number
    }

    // 4. Send it back!
    await whatsappClient.sendTextMessage(normalizedPhone, replyText);
}
