/**
 * Regression check for the Razorpay webhook after credit-granting was extracted
 * into src/lib/credits.ts (grantCreditPack).
 *
 * READ-ONLY BY DESIGN. Every case below is chosen to stop before the database
 * write, so running this never inserts a CreditPack into the live database:
 *
 *   grantCreditPack order of operations:
 *     1. missing metadata          -> 400   (tested)
 *     2. dedupe on paymentId       -> read  (tested via a real duplicate)
 *     3. unknown plan              -> 400   (tested)
 *     4. plan.credits < 1          -> 400
 *     5. amount/currency mismatch  -> 400   (tested, with a REAL plan key)
 *     6. $transaction              -> WRITE (deliberately not exercised)
 *
 * Case 5 is the valuable one: it proves signature verification, metadata
 * parsing, plan lookup and price validation all still work end to end, while
 * returning before anything is persisted.
 *
 * Usage:  node --env-file=.env scripts/verify-payment-webhook.mjs [baseUrl]
 */

import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const ENDPOINT = `${BASE_URL}/api/payment/webhook`;
const SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

if (!SECRET) {
    console.error('RAZORPAY_WEBHOOK_SECRET is not set. Run with: node --env-file=.env ...');
    process.exit(1);
}

const prisma = new PrismaClient();

function sign(body) {
    return crypto.createHmac('sha256', SECRET).update(body).digest('hex');
}

async function post(bodyObject, { signature } = {}) {
    const body = JSON.stringify(bodyObject);
    const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(signature === null ? {} : { 'x-razorpay-signature': signature ?? sign(body) }),
        },
        body,
    });
    let json = null;
    try { json = await res.json(); } catch { /* non-JSON */ }
    return { status: res.status, json };
}

function capturedEvent({ paymentId, amount, currency, notes }) {
    return {
        event: 'payment.captured',
        payload: { payment: { entity: { id: paymentId, amount, currency, order_id: 'order_TEST', notes } } },
    };
}

const results = [];
function check(name, pass, detail) {
    results.push({ name, pass, detail });
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  -- ${detail}` : ''}`);
}

try {
    // A real, active, credit-bearing plan so the price-validation path is genuine.
    // Narrow select so this check still runs before the appleProductId
    // migration has been applied.
    const plan = await prisma.pricingPlan.findFirst({
        where: { isActive: true, credits: { gte: 1 } },
        orderBy: { price: 'asc' },
        select: { key: true, credits: true, price: true, currency: true },
    });

    if (!plan) {
        console.error('No active credit-bearing PricingPlan found; cannot run case 5.');
        process.exit(1);
    }
    console.log(`Using plan "${plan.key}" (${plan.credits} credits, ${plan.price} ${plan.currency})\n`);

    // --- signature handling ---
    let r = await post(capturedEvent({ paymentId: 'pay_x', amount: 1, currency: 'INR', notes: {} }), { signature: null });
    check('missing signature -> 400', r.status === 400 && r.json?.error === 'Missing signature', `got ${r.status}`);

    r = await post(capturedEvent({ paymentId: 'pay_x', amount: 1, currency: 'INR', notes: {} }), { signature: 'deadbeef' });
    check('bad signature -> 400', r.status === 400 && r.json?.error === 'Invalid signature', `got ${r.status}`);

    // --- metadata validation (behaviour preserved from before the refactor) ---
    r = await post(capturedEvent({ paymentId: 'pay_nometa', amount: 1, currency: 'INR', notes: {} }));
    check('missing metadata -> 400', r.status === 400 && r.json?.error === 'Missing payment metadata', `got ${r.status} ${JSON.stringify(r.json)}`);

    // --- unknown plan ---
    r = await post(capturedEvent({
        paymentId: 'pay_unknownplan',
        amount: 1, currency: 'INR',
        notes: { userId: 'user_does_not_exist', productType: 'NO_SUCH_PLAN_KEY' },
    }));
    check('unknown plan -> 400', r.status === 400 && /Unknown pricing plan/.test(r.json?.error ?? ''), `got ${r.status} ${JSON.stringify(r.json)}`);

    // --- price tampering, with a REAL plan (stops before any write) ---
    r = await post(capturedEvent({
        paymentId: 'pay_amountmismatch',
        amount: plan.price + 1,
        currency: plan.currency,
        notes: { userId: 'user_does_not_exist', productType: plan.key },
    }));
    check(
        'amount mismatch -> 400 (price tampering blocked)',
        r.status === 400 && /does not match the pricing plan/.test(r.json?.error ?? ''),
        `got ${r.status} ${JSON.stringify(r.json)}`
    );

    r = await post(capturedEvent({
        paymentId: 'pay_currencymismatch',
        amount: plan.price,
        currency: 'USD',
        notes: { userId: 'user_does_not_exist', productType: plan.key },
    }));
    check(
        'currency mismatch -> 400',
        r.status === 400 && /does not match the pricing plan/.test(r.json?.error ?? ''),
        `got ${r.status} ${JSON.stringify(r.json)}`
    );

    // --- idempotency, verified against a real historical payment if one exists ---
    const existing = await prisma.creditPack.findFirst({
        where: { paymentId: { not: '' } },
        orderBy: { purchasedAt: 'desc' },
        select: { paymentId: true, userId: true, packType: true, amount: true },
    });

    if (existing && existing.paymentId && !existing.paymentId.startsWith('FREE_')) {
        const before = await prisma.creditPack.count({ where: { paymentId: existing.paymentId } });
        r = await post(capturedEvent({
            paymentId: existing.paymentId,
            amount: existing.amount,
            currency: 'INR',
            notes: { userId: existing.userId, productType: existing.packType },
        }));
        const after = await prisma.creditPack.count({ where: { paymentId: existing.paymentId } });
        check(
            'replaying a real payment is a no-op',
            r.status === 200 && r.json?.note === 'Duplicate' && before === after,
            `status ${r.status}, note ${r.json?.note}, rows ${before} -> ${after}`
        );
    } else {
        console.log('SKIP  duplicate replay -- no prior paid CreditPack to replay');
    }

    // --- non-payment events are acknowledged, not errored ---
    r = await post({ event: 'payment.failed', payload: {} });
    check('unrelated event -> 200', r.status === 200, `got ${r.status}`);

    const failed = results.filter((x) => !x.pass);
    console.log(`\n${results.length - failed.length}/${results.length} passed`);
    process.exit(failed.length ? 1 : 0);
} finally {
    await prisma.$disconnect();
}
