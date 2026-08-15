import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireUser } from '@/lib/apiAuth';
import prisma from '@/lib/prisma';
import { storageConfigured } from '@/lib/photoUpload';
import {
    validateApplication,
    generateApplicationRef,
    BLOCKING_STATUSES,
    STATUS_LABELS,
    type ApplicationInput,
} from '@/lib/astrologerApplication';

/**
 * Submit a first-screening application.
 *
 * Creates an AstrologerApplication and nothing else. Per spec §28 it must NOT
 * create an Astrologer record — that is the published profile, and it comes into
 * existence only when an admin approves.
 *
 * Validation here is the real one. The form's `required` attributes are a
 * convenience for the person filling it in; this decides what is accepted.
 */
export async function POST(request: Request) {
    // requireUser, not auth(): this handler inserts a row with a userId
    // foreign key, and a JWT can outlive the user it names. Without the
    // existence check that surfaces as "Foreign key constraint violated"
    // — a 500 whose message says nothing about the one fix, signing in
    // again. See src/lib/apiAuth.ts.
    const authed = await requireUser();
    if (!authed.ok) return authed.response;
    const session = { user: { id: authed.userId } };

    let body: ApplicationInput;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    // One live application per person (spec §22). A rejection is deliberately
    // not blocking — reapplying after a decline is allowed.
    const existing = await prisma.astrologerApplication.findFirst({
        where: { userId: session.user.id, status: { in: [...BLOCKING_STATUSES] } },
        select: { ref: true, status: true },
    });
    if (existing) {
        return NextResponse.json(
            {
                error: 'Application already exists',
                message: `You already have an application (${existing.ref}) with status "${STATUS_LABELS[existing.status] ?? existing.status}".`,
                ref: existing.ref,
                status: existing.status,
            },
            { status: 409 }
        );
    }

    const errors = validateApplication(body, storageConfigured());
    if (Object.keys(errors).length > 0) {
        return NextResponse.json({ error: 'Validation failed', errors }, { status: 400 });
    }

    const clean = (v?: string | null) => (typeof v === 'string' ? v.trim() : null);
    const cleanRequired = (v?: string) => (typeof v === 'string' ? v.trim() : '');
    const strings = (v?: string[]) =>
        Array.isArray(v) ? v.filter((x) => typeof x === 'string').map((x) => x.trim()) : [];

    // A collision on `ref` is vanishingly unlikely (32^8) but the column is
    // unique, so retry rather than 500 on the astronomically unlucky case.
    let created: { ref: string } | null = null;
    for (let attempt = 0; attempt < 3 && !created; attempt++) {
        try {
            created = await prisma.astrologerApplication.create({
                data: {
                    ref: generateApplicationRef(),
                    userId: session.user.id,
                    status: 'SUBMITTED',

                    fullName: cleanRequired(body.fullName),
                    displayName: cleanRequired(body.displayName),
                    email: cleanRequired(body.email).toLowerCase(),
                    phone: cleanRequired(body.phone),
                    country: cleanRequired(body.country),
                    city: cleanRequired(body.city),
                    profilePhotoPath: clean(body.profilePhotoPath),

                    primaryPractice: cleanRequired(body.primaryPractice),
                    primaryPracticeOther: clean(body.primaryPracticeOther),
                    additionalPractices: strings(body.additionalPractices),
                    yearsOfExperience: cleanRequired(body.yearsOfExperience),
                    learningMethods: strings(body.learningMethods),
                    learningMethodOther: clean(body.learningMethodOther),
                    teacherGuruInstitute: clean(body.teacherGuruInstitute),
                    hasFormalQualification: Boolean(body.hasFormalQualification),
                    qualificationName: body.hasFormalQualification
                        ? clean(body.qualificationName)
                        : null,

                    areasOfExpertise: strings(body.areasOfExpertise),
                    areasOfExpertiseOther: clean(body.areasOfExpertiseOther),
                    specialization: clean(body.specialization),

                    languages: strings(body.languages),
                    languageOther: clean(body.languageOther),
                    consultationMethods: strings(body.consultationMethods),
                    availabilityFrequency: cleanRequired(body.availabilityFrequency),

                    previousConsultationExperience: cleanRequired(
                        body.previousConsultationExperience
                    ),
                    previousConsultationLocations: strings(body.previousConsultationLocations),
                    professionalProfileUrl: clean(body.professionalProfileUrl),

                    aboutYou: cleanRequired(body.aboutYou),
                    consultationApproach: cleanRequired(body.consultationApproach),
                    sensitiveQuestionsApproach: cleanRequired(body.sensitiveQuestionsApproach),
                    whyJoinAskchetna: cleanRequired(body.whyJoinAskchetna),
                    predictionCommunication: cleanRequired(body.predictionCommunication),
                    predictionCommunicationOther: clean(body.predictionCommunicationOther),

                    declarationAccuracy: true,
                    declarationNoGuarantee: true,
                    declarationTerms: true,
                    declarationAdditionalVerification: true,
                    declaredAt: new Date(),
                },
                select: { ref: true },
            });
        } catch (error) {
            const isUniqueViolation =
                typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                (error as { code?: string }).code === 'P2002';
            if (!isUniqueViolation) throw error;
        }
    }

    if (!created) {
        return NextResponse.json({ error: 'Could not create application' }, { status: 500 });
    }

    return NextResponse.json({
        ref: created.ref,
        status: 'SUBMITTED',
        message: 'Application received.',
    });
}

/** The caller's own most recent application, for the status screen. */
export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const application = await prisma.astrologerApplication.findFirst({
        where: { userId: session.user.id },
        orderBy: { submittedAt: 'desc' },
        select: {
            ref: true,
            status: true,
            submittedAt: true,
            // Internal notes are never returned here. Spec §25: they stay internal.
            rejectionReason: true,
            infoRequest: true,
            infoRequestedAt: true,
        },
    });

    if (!application) return NextResponse.json({ application: null });

    return NextResponse.json({
        application: {
            ...application,
            submittedAt: application.submittedAt.toISOString(),
            infoRequestedAt: application.infoRequestedAt?.toISOString() ?? null,
            statusLabel: STATUS_LABELS[application.status] ?? application.status,
        },
    });
}
