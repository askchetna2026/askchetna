import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { grantCreditPack } from '@/lib/credits';

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

            // Credit granting lives in grantCreditPack so Apple IAP cannot drift
            // from this behaviour. Semantics preserved exactly: dedupe on
            // payment id, reject unknown/non-credit plans, and — because the
            // amount is attacker-influencable here — require it to match the
            // plan's configured price.
            const result = await grantCreditPack({
                userId,
                planKey: productType,
                paymentId: payment.id,
                amount: payment.amount,
                currency: payment.currency,
                source: 'razorpay',
                validateAmount: true,
                visitorId,
                intent: payment.notes?.intent,
                headers: req.headers,
                extraMetadata: {
                    // Both keys are emitted because before this refactor the
                    // CreditTransaction recorded `razorpayOrderId` while the
                    // analytics event recorded `orderId`. extraMetadata now feeds
                    // both sinks, so keeping both names means no external
                    // dashboard querying either JSON field starts returning null.
                    razorpayOrderId: payment.order_id || null,
                    orderId: payment.order_id || null,
                },
                analyticsPath: '/api/payment/webhook',
            });

            if (result.status === 'duplicate') {
                return NextResponse.json({ success: true, note: 'Duplicate' });
            }

            if (result.status === 'error') {
                return NextResponse.json({ error: result.error }, { status: result.httpStatus });
            }

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
