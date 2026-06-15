import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { getRequestLocation, recordAnalyticsEvent } from '@/lib/analytics/server';
import { isMonetizationIntent } from '@/lib/monetization';
import { sendTopUpSuccessLifecycleEmail } from '@/lib/lifecycleEmails';

export async function POST(req: NextRequest) {
    try {
        if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
            console.error('Razorpay webhook secret is missing from environment variables');
            return NextResponse.json(
                { error: 'Webhook configuration missing' },
                { status: 500 }
            );
        }

        const body = await req.text();
        const signature = req.headers.get('x-razorpay-signature');

        if (!signature) {
            return NextResponse.json(
                { error: 'Missing signature' },
                { status: 400 }
            );
        }

        // Verify signature
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
            .update(body)
            .digest('hex');

        const sigBuf = Buffer.from(signature);
        const expBuf = Buffer.from(expectedSignature);
        const signatureValid = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);

        if (!signatureValid) {
            return NextResponse.json(
                { error: 'Invalid signature' },
                { status: 400 }
            );
        }

        const event = JSON.parse(body);

        // Handle payment success
        if (event.event === 'payment.captured') {
            const payment = event.payload.payment.entity;
            const userId = payment.notes?.userId as string | undefined;
            const productType = (payment.notes?.productType || payment.notes?.productKey) as string | undefined;
            const visitorId = payment.notes?.visitorId as string | undefined;

            if (!userId || !productType) {
                return NextResponse.json(
                    { error: 'Missing payment metadata' },
                    { status: 400 }
                );
            }

            const existingPack = await prisma.creditPack.findFirst({
                where: { paymentId: payment.id }
            });

            if (existingPack) {
                return NextResponse.json({ success: true, note: 'Duplicate' });
            }

            const plan = await prisma.pricingPlan.findUnique({
                where: { key: productType }
            });

            if (!plan) {
                return NextResponse.json(
                    { error: `Unknown pricing plan: ${productType}` },
                    { status: 400 }
                );
            }

            if (plan.credits < 1) {
                return NextResponse.json(
                    { error: `Pricing plan ${productType} does not map to a credit pack.` },
                    { status: 400 }
                );
            }

            if (payment.amount !== plan.price || payment.currency !== plan.currency) {
                return NextResponse.json(
                    { error: 'Payment amount or currency does not match the pricing plan.' },
                    { status: 400 }
                );
            }

            await prisma.$transaction([
                prisma.creditPack.create({
                    data: {
                        userId,
                        packType: plan.key,
                        questionsTotal: plan.credits,
                        questionsUsed: 0,
                        paymentId: payment.id,
                        amount: payment.amount,
                    },
                }),
                prisma.creditTransaction.create({
                    data: {
                        userId,
                        amount: plan.credits,
                        description: `Purchased ${plan.name}`,
                        metadata: {
                            paymentId: payment.id,
                            productType: plan.key,
                            planName: plan.name,
                            planCredits: plan.credits,
                            razorpayOrderId: payment.order_id || null
                        }
                    }
                })
            ]);

            const location = getRequestLocation(req.headers);
            await recordAnalyticsEvent({
                type: ANALYTICS_EVENTS.PAYMENT_SUCCESS,
                path: '/api/payment/webhook',
                userId,
                visitorId: visitorId || null,
                country: location.country,
                city: location.city,
                metadata: {
                    paymentId: payment.id,
                    orderId: payment.order_id || null,
                    planKey: plan.key,
                    planName: plan.name,
                    credits: plan.credits,
                    amount: payment.amount,
                    currency: payment.currency,
                }
            });

            const checkoutIntent = payment.notes?.intent;
            const lifecycleIntent =
                typeof checkoutIntent === 'string' && isMonetizationIntent(checkoutIntent)
                    ? checkoutIntent
                    : undefined;

            void sendTopUpSuccessLifecycleEmail({
                userId,
                paymentId: payment.id,
                planName: plan.name,
                credits: plan.credits,
                intent: lifecycleIntent,
            }).catch((emailError) => {
                console.error('Top-up lifecycle email failed:', emailError);
            });

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Payment webhook error:', error);
        return NextResponse.json(
            { error: 'Webhook processing failed' },
            { status: 500 }
        );
    }
}
