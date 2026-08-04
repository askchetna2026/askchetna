/**
 * Vocabulary and validation for the astrologer first-screening application.
 *
 * Single source for both the form and the submit endpoint. Duplicating option
 * lists across a client form and a server validator is how a dropdown ends up
 * offering a value the API rejects, so the lists live here and both sides import
 * them.
 *
 * Server-side validation is not a mirror of the client's — it is the real one.
 * The form's `required` attributes are a convenience; `validateApplication` is
 * what actually decides.
 */

export const PRACTICES = [
    'Vedic Astrology / Jyotish',
    'Western Astrology',
    'KP Astrology',
    'Nadi Astrology',
    'Lal Kitab',
    'Numerology',
    'Tarot Reading',
    'Palmistry',
    'Vastu',
    'Prashna / Horary Astrology',
    'Other',
] as const;

export const EXPERIENCE_RANGES = [
    'Less than 1 year',
    '1–3 years',
    '3–5 years',
    '5–10 years',
    '10–15 years',
    '15+ years',
] as const;

export const LEARNING_METHODS = [
    'Self-taught',
    'Learned from a Guru / Teacher',
    'Formal Institute / Academy',
    'Family tradition',
    'Certification / Professional Course',
    'Other',
] as const;

export const EXPERTISE_AREAS = [
    'Career & Profession',
    'Business',
    'Finance & Wealth',
    'Marriage',
    'Relationships',
    'Compatibility / Kundli Matching',
    'Family',
    'Children',
    'Education',
    'Health & Wellbeing',
    'Life Decisions',
    'Spirituality',
    'Personal Growth',
    'Property & Real Estate',
    'Travel / Relocation',
    'Muhurat / Auspicious Timing',
    'Other',
] as const;

export const LANGUAGES = [
    'English', 'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Marathi', 'Gujarati',
    'Kannada', 'Malayalam', 'Punjabi', 'Urdu', 'Indonesian', 'Other',
] as const;

export const CONSULTATION_METHODS = [
    'Chat',
    'Audio Call',
    'Video Call',
    'Written Reading / Report',
] as const;

export const AVAILABILITY_FREQUENCIES = [
    'Daily',
    'Several times a week',
    'Weekends only',
    'Occasionally',
    'Flexible / Based on appointment',
] as const;

export const PREVIOUS_EXPERIENCE = [
    'No, I am starting now',
    'Yes, informally to friends or family',
    'Yes, independently to paying clients',
    'Yes, through another platform',
    'Yes, through my own practice or business',
] as const;

export const PREVIOUS_LOCATIONS = [
    'Own practice',
    'Another astrology platform',
    'Social media',
    'Personal website',
    'Through referrals',
    'Other',
] as const;

export const PREDICTION_COMMUNICATION = [
    'I provide guidance and possibilities and do not guarantee specific outcomes.',
    'I provide predictions with a high degree of certainty.',
    'My approach varies depending on the consultation.',
    'Other.',
] as const;

/** Character ceilings, matching spec §18. */
export const LIMITS = {
    fullName: 100,
    displayName: 100,
    city: 100,
    teacherGuruInstitute: 200,
    qualificationName: 200,
    otherText: 500,
    specialization: 1000,
    aboutYou: 2000,
    consultationApproach: 2000,
    sensitiveQuestionsApproach: 2000,
    whyJoinAskchetna: 1000,
    predictionCommunicationOther: 1000,
} as const;

/**
 * Statuses an applicant may not re-apply over.
 *
 * A rejected application is deliberately absent: spec §22 allows reapplication
 * after a rejection, and permanently locking someone out on a first decline is
 * harsher than intended.
 */
export const BLOCKING_STATUSES = [
    'DRAFT',
    'SUBMITTED',
    'UNDER_REVIEW',
    'REQUEST_MORE_INFORMATION',
    'APPLICANT_RESPONDED',
    'SHORTLISTED',
    'VERIFICATION_PENDING',
    'VERIFIED',
    'FINAL_APPROVAL',
    'ACTIVE',
] as const;

/** Applicant-facing labels. Internal review states are not exposed verbatim. */
/**
 * The admin review chain, as a table rather than as scattered `if`s.
 *
 * `from` is the point. Before this existed the API accepted any action from any
 * status, so an application could be published straight out of SUBMITTED — the
 * verification steps were advisory, which is the same as not having them. Every
 * transition is now checked against where the application actually is.
 *
 * The order below is the order a reviewer walks:
 *
 *   SUBMITTED -> UNDER_REVIEW -> SHORTLISTED -> VERIFICATION_PENDING
 *             -> VERIFIED -> FINAL_APPROVAL -> ACTIVE
 *
 * Only the last step creates a public `Astrologer` record. Everything before it
 * is review state and must never reach the directory (spec §28).
 *
 * Shared with the admin UI so the buttons on screen and the transitions the
 * server will accept cannot drift apart.
 */
export const APPLICATION_ACTIONS = {
    START_REVIEW: {
        to: 'UNDER_REVIEW',
        from: ['SUBMITTED', 'APPLICANT_RESPONDED'],
        label: 'Start review',
    },
    SHORTLIST: {
        to: 'SHORTLISTED',
        from: ['SUBMITTED', 'UNDER_REVIEW', 'APPLICANT_RESPONDED'],
        label: 'Shortlist',
    },
    START_VERIFICATION: {
        to: 'VERIFICATION_PENDING',
        from: ['SHORTLISTED'],
        label: 'Begin verification',
    },
    MARK_VERIFIED: {
        to: 'VERIFIED',
        from: ['VERIFICATION_PENDING'],
        label: 'Mark verified',
    },
    APPROVE: {
        to: 'FINAL_APPROVAL',
        from: ['VERIFIED'],
        label: 'Give final approval',
    },
    /** The only action that publishes anything. */
    PUBLISH: {
        to: 'ACTIVE',
        from: ['FINAL_APPROVAL'],
        label: 'Publish profile',
    },
    REQUEST_INFO: {
        to: 'REQUEST_MORE_INFORMATION',
        from: [
            'SUBMITTED',
            'UNDER_REVIEW',
            'APPLICANT_RESPONDED',
            'SHORTLISTED',
            'VERIFICATION_PENDING',
        ],
        label: 'Request more information',
    },
    REJECT: {
        to: 'REJECTED',
        // Rejectable at any point up to and including final approval. Not from
        // ACTIVE: a published astrologer is suspended on the Astrologer record,
        // which also forces them offline — rejecting the application would
        // leave them live in the directory.
        from: [
            'SUBMITTED',
            'UNDER_REVIEW',
            'APPLICANT_RESPONDED',
            'SHORTLISTED',
            'VERIFICATION_PENDING',
            'VERIFIED',
            'FINAL_APPROVAL',
        ],
        label: 'Reject',
    },
} as const;

export type ApplicationAction = keyof typeof APPLICATION_ACTIONS;

/** Which actions an admin may take on an application in `status`. */
export function allowedActions(status: string): ApplicationAction[] {
    return (Object.keys(APPLICATION_ACTIONS) as ApplicationAction[]).filter((a) =>
        (APPLICATION_ACTIONS[a].from as readonly string[]).includes(status)
    );
}

export const STATUS_LABELS: Record<string, string> = {
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    UNDER_REVIEW: 'Under review',
    REQUEST_MORE_INFORMATION: 'More information required',
    APPLICANT_RESPONDED: 'Under review',
    SHORTLISTED: 'Approved for next step',
    VERIFICATION_PENDING: 'Verification pending',
    VERIFIED: 'Verified',
    FINAL_APPROVAL: 'Approved',
    REJECTED: 'Not accepted',
    ACTIVE: 'Active',
};

export type ApplicationInput = {
    fullName?: string;
    displayName?: string;
    email?: string;
    phone?: string;
    country?: string;
    city?: string;
    primaryPractice?: string;
    primaryPracticeOther?: string;
    additionalPractices?: string[];
    yearsOfExperience?: string;
    learningMethods?: string[];
    learningMethodOther?: string;
    teacherGuruInstitute?: string;
    hasFormalQualification?: boolean;
    qualificationName?: string;
    areasOfExpertise?: string[];
    areasOfExpertiseOther?: string;
    specialization?: string;
    languages?: string[];
    languageOther?: string;
    consultationMethods?: string[];
    availabilityFrequency?: string;
    previousConsultationExperience?: string;
    previousConsultationLocations?: string[];
    professionalProfileUrl?: string;
    aboutYou?: string;
    consultationApproach?: string;
    sensitiveQuestionsApproach?: string;
    whyJoinAskchetna?: string;
    predictionCommunication?: string;
    predictionCommunicationOther?: string;
    declarationAccuracy?: boolean;
    declarationNoGuarantee?: boolean;
    declarationTerms?: boolean;
    declarationAdditionalVerification?: boolean;
    /** Storage path returned by the upload endpoint, not a URL. */
    profilePhotoPath?: string | null;
};

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const list = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

/**
 * Validates a submission. Returns field-keyed errors so the form can put each
 * message beside the input that caused it rather than in one anonymous banner.
 */
export function validateApplication(
    input: ApplicationInput,
    storageAvailable = true
): Record<string, string> {
    const e: Record<string, string> = {};

    const req = (key: keyof ApplicationInput, label: string, max?: number) => {
        const v = text(input[key]);
        if (!v) e[key] = `${label} is required.`;
        else if (max && v.length > max) e[key] = `${label} must be ${max} characters or fewer.`;
    };

    // Required by spec §6.7, but only enforced when storage is actually
    // available: with no bucket configured the upload endpoint returns 503, and
    // blocking every application on a field nobody can fill would be worse than
    // accepting one without a photo.
    if (storageAvailable && !text(input.profilePhotoPath)) {
        e.profilePhotoPath = 'A profile photo is required.';
    }

    req('fullName', 'Full name', LIMITS.fullName);
    req('displayName', 'Display name', LIMITS.displayName);
    req('city', 'City', LIMITS.city);
    req('country', 'Country');

    const email = text(input.email).toLowerCase();
    if (!email) e.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'That email address does not look right.';

    // Loose on purpose: this is an international application and rejecting an
    // unusual but valid number is worse than accepting one an admin must query.
    const phone = text(input.phone);
    if (!phone) e.phone = 'Mobile / WhatsApp number is required.';
    else if (!/^\+?[\d\s()-]{7,20}$/.test(phone)) e.phone = 'Enter a valid phone number including country code.';

    if (!PRACTICES.includes(text(input.primaryPractice) as never)) {
        e.primaryPractice = 'Select your primary practice.';
    } else if (input.primaryPractice === 'Other' && !text(input.primaryPracticeOther)) {
        e.primaryPracticeOther = 'Please specify your primary practice.';
    }

    if (!EXPERIENCE_RANGES.includes(text(input.yearsOfExperience) as never)) {
        e.yearsOfExperience = 'Select your years of experience.';
    }

    const learning = list(input.learningMethods);
    if (learning.length === 0) e.learningMethods = 'Select at least one.';
    else if (learning.includes('Other') && !text(input.learningMethodOther)) {
        e.learningMethodOther = 'Please specify how you learned your practice.';
    }

    if (input.hasFormalQualification && !text(input.qualificationName)) {
        e.qualificationName = 'Name the qualification or certification.';
    }

    const areas = list(input.areasOfExpertise);
    if (areas.length === 0) e.areasOfExpertise = 'Select at least one area.';
    else if (areas.includes('Other') && !text(input.areasOfExpertiseOther)) {
        e.areasOfExpertiseOther = 'Please specify the area.';
    }

    const langs = list(input.languages);
    if (langs.length === 0) e.languages = 'Select at least one language.';
    else if (langs.includes('Other') && !text(input.languageOther)) {
        e.languageOther = 'Please specify the language.';
    }

    if (list(input.consultationMethods).length === 0) {
        e.consultationMethods = 'Select at least one consultation method.';
    }

    if (!AVAILABILITY_FREQUENCIES.includes(text(input.availabilityFrequency) as never)) {
        e.availabilityFrequency = 'Select how often you are available.';
    }

    if (!PREVIOUS_EXPERIENCE.includes(text(input.previousConsultationExperience) as never)) {
        e.previousConsultationExperience = 'Select an option.';
    }

    const url = text(input.professionalProfileUrl);
    if (url) {
        try {
            const parsed = new URL(url);
            if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
        } catch {
            e.professionalProfileUrl = 'Enter a valid URL starting with https://';
        }
    }

    req('aboutYou', 'This', LIMITS.aboutYou);
    req('consultationApproach', 'This', LIMITS.consultationApproach);
    req('sensitiveQuestionsApproach', 'This', LIMITS.sensitiveQuestionsApproach);
    req('whyJoinAskchetna', 'This', LIMITS.whyJoinAskchetna);

    if (!PREDICTION_COMMUNICATION.includes(text(input.predictionCommunication) as never)) {
        e.predictionCommunication = 'Select an option.';
    } else if (
        input.predictionCommunication === 'Other.' &&
        !text(input.predictionCommunicationOther)
    ) {
        e.predictionCommunicationOther = 'Please explain your approach.';
    }

    // All four consents are mandatory and separately recorded — an audit needs
    // to show which was given, not merely that the form was submitted.
    if (!input.declarationAccuracy) e.declarationAccuracy = 'Required.';
    if (!input.declarationNoGuarantee) e.declarationNoGuarantee = 'Required.';
    if (!input.declarationTerms) e.declarationTerms = 'Required.';
    if (!input.declarationAdditionalVerification) e.declarationAdditionalVerification = 'Required.';

    return e;
}

/**
 * Human-quotable reference, e.g. AC-7F3A9C21.
 *
 * Crockford-ish alphabet: no I, O, 1 or 0, because these get read down a phone
 * line to support and those four are what people mishear.
 */
export function generateApplicationRef(): string {
    const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let out = '';
    for (let i = 0; i < 8; i++) {
        out += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return `AC-${out}`;
}
