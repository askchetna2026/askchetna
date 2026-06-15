import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { PAYMENTS_ENABLED, PAYMENTS_PAUSED_MESSAGE } from '@/lib/paymentConfig';

export async function POST(req: NextRequest) {
    try {
        if (!PAYMENTS_ENABLED) {
            return NextResponse.json(
                { error: PAYMENTS_PAUSED_MESSAGE },
                { status: 503 }
            );
        }

        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            console.error('Razorpay keys are missing from environment variables');
            return NextResponse.json(
                { error: 'Payment gateway configuration missing' },
                { status: 500 }
            );
        }

        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        const { productKey, visitorId, intent, source, focus, returnTo } = await req.json();

        if (!productKey) {
            return NextResponse.json(
                { error: 'Product key is required' },
                { status: 400 }
            );
        }

        // Fetch price from DB to prevent tampering
        const plan = await prisma.pricingPlan.findFirst({
            where: {
                key: productKey,
                isActive: true
            }
        });

        if (!plan) {
            return NextResponse.json(
                { error: 'Invalid product plan' },
                { status: 400 }
            );
        }

        // Create Razorpay order
        const order = await razorpay.orders.create({
            amount: plan.price, // Use DB price (in paise)
            currency: plan.currency,
            receipt: `receipt_${Date.now()}`,
            notes: {
                userId: session.user.id,
                productKey: plan.key,
                productType: plan.key,
                productName: plan.name, // Use DB name preferred, but can fallback
                visitorId: typeof visitorId === 'string' ? visitorId : null,
                intent: typeof intent === 'string' ? intent : null,
                source: typeof source === 'string' ? source : null,
                focus: typeof focus === 'string' ? focus : null,
                returnTo: typeof returnTo === 'string' ? returnTo : null,
            },
        });

        return NextResponse.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID,
        });
    } catch (error) {
        console.error('Payment order creation error:', error);
        return NextResponse.json(
            { error: 'Failed to create payment order' },
            { status: 500 }
        );
    }
}
