'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2 } from 'lucide-react';
import {
    PRACTICES, EXPERIENCE_RANGES, LEARNING_METHODS, EXPERTISE_AREAS, LANGUAGES,
    CONSULTATION_METHODS, AVAILABILITY_FREQUENCIES, PREVIOUS_EXPERIENCE,
    PREVIOUS_LOCATIONS, PREDICTION_COMMUNICATION, LIMITS,
} from '@/lib/astrologerApplication';
import { COUNTRIES } from '@/lib/countries';
import { Field, TextInput, TextArea, Select, Chips, Radios, Section } from './ApplicationFields';
import PhotoUploadField from './PhotoUploadField';
import styles from './AstrologerApplicationForm.module.css';

/**
 * The first-screening application (spec §5–§16).
 *
 * One page with section cards rather than a wizard, per spec §5: it makes the
 * whole application visible at once, which suits something being filled in
 * carefully rather than raced through. If it grows further it can become
 * multi-step without touching the data model.
 *
 * Entered data survives a failed submit — losing thirty fields to one bad phone
 * number is the fastest way to lose an applicant.
 */

type Props = {
    prefillEmail: string;
    prefillName: string;
    prefillPhone: string;
    existing: { ref: string; statusLabel: string; status: string; rejectionReason?: string | null; infoRequest?: string | null } | null;
};

export default function AstrologerApplicationForm({
    prefillEmail, prefillName, prefillPhone, existing,
}: Props) {
    const [f, setF] = useState({
        fullName: prefillName,
        displayName: '',
        email: prefillEmail,
        phone: prefillPhone,
        country: '',
        city: '',
        primaryPractice: '',
        primaryPracticeOther: '',
        additionalPractices: [] as string[],
        yearsOfExperience: '',
        learningMethods: [] as string[],
        learningMethodOther: '',
        teacherGuruInstitute: '',
        hasFormalQualification: false,
        qualificationName: '',
        areasOfExpertise: [] as string[],
        areasOfExpertiseOther: '',
        specialization: '',
        languages: [] as string[],
        languageOther: '',
        consultationMethods: [] as string[],
        availabilityFrequency: '',
        previousConsultationExperience: '',
        previousConsultationLocations: [] as string[],
        professionalProfileUrl: '',
        aboutYou: '',
        consultationApproach: '',
        sensitiveQuestionsApproach: '',
        whyJoinAskchetna: '',
        predictionCommunication: '',
        predictionCommunicationOther: '',
        declarationAccuracy: false,
        declarationNoGuarantee: false,
        declarationTerms: false,
        declarationAdditionalVerification: false,
        profilePhotoPath: null as string | null,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [banner, setBanner] = useState<string | null>(null);
    const [done, setDone] = useState<{ ref: string } | null>(null);
    /** Bumped on every rejected submit, so a second failure scrolls again. */
    const [errorNonce, setErrorNonce] = useState(0);

    // Scrolling has to wait for the commit. Querying the DOM straight after
    // setErrors finds the markup as it was BEFORE the error state rendered —
    // no aria-invalid, no messages — so it would scroll to nothing.
    useEffect(() => {
        if (errorNonce === 0) return;
        const first = document.querySelector('[aria-invalid="true"], [role="alert"]');
        first?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, [errorNonce]);

    const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) =>
        setF((prev) => ({ ...prev, [k]: v }));

    const toggle = (k: 'additionalPractices' | 'learningMethods' | 'areasOfExpertise' | 'languages' | 'consultationMethods' | 'previousConsultationLocations', v: string) =>
        setF((prev) => ({
            ...prev,
            [k]: prev[k].includes(v) ? prev[k].filter((x) => x !== v) : [...prev[k], v],
        }));

    const count = (v: string, max: number) => `${v.length}/${max}`;

    if (existing) {
        return (
            <div className={styles.status}>
                <h2 className={styles.statusTitle}>Your application is {existing.statusLabel.toLowerCase()}</h2>
                <p className={styles.statusRef}>Application ID: <strong>{existing.ref}</strong></p>
                {existing.infoRequest && (
                    <div className={styles.infoRequest}>
                        <p className={styles.infoRequestTitle}>We need a little more from you</p>
                        <p>{existing.infoRequest}</p>
                    </div>
                )}
                {existing.rejectionReason && (
                    <p className={styles.statusDetail}>{existing.rejectionReason}</p>
                )}
                {!existing.infoRequest && !existing.rejectionReason && (
                    <p className={styles.statusDetail}>
                        Our team will review your application and contact you if additional
                        information is required.
                    </p>
                )}
                <Link href="/" className={styles.back}>Back to AskChetna</Link>
            </div>
        );
    }

    if (done) {
        return (
            <div className={styles.status}>
                <CheckCircle2 size={42} className={styles.tick} aria-hidden="true" />
                <h2 className={styles.statusTitle}>Application received</h2>
                <p className={styles.statusRef}>Application ID: <strong>{done.ref}</strong></p>
                <p className={styles.statusDetail}>
                    Thank you for applying to become an AskChetna astrologer. Your application
                    has been submitted and is now under review. Our team will contact you if
                    additional information is required.
                </p>
                <Link href="/" className={styles.back}>Back to AskChetna</Link>
            </div>
        );
    }

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setBanner(null);
        setErrors({});
        try {
            const res = await fetch('/api/astrologer-applications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(f),
            });
            const data = await res.json();

            if (!res.ok) {
                if (data.errors) {
                    setErrors(data.errors);
                    setBanner('Some answers need attention. They are marked below.');
                    // Takes them to the first problem rather than leaving them to
                    // hunt through nine sections for it. The scroll itself happens
                    // in an effect, once the errors have actually rendered.
                    setErrorNonce((n) => n + 1);
                } else {
                    setBanner(data.message ?? data.error ?? 'Could not submit your application.');
                }
                return;
            }
            setDone({ ref: data.ref });
        } catch {
            setBanner('Could not submit. Check your connection and try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const showPrevLocations =
        f.previousConsultationExperience !== '' &&
        f.previousConsultationExperience !== 'No, I am starting now';

    return (
        <form className={styles.form} onSubmit={submit} noValidate>
            <p className={styles.notice}>
                Submitting an application does not guarantee approval or access to the
                AskChetna platform. Our team reviews every application before an astrologer
                profile is published.
            </p>

            <Section number={1} title="About you">
                <Field label="Full name" required error={errors.fullName} hint="Your legal or full name">
                    <TextInput value={f.fullName} onChange={(v) => set('fullName', v)} maxLength={LIMITS.fullName} invalid={!!errors.fullName} />
                </Field>
                <Field label="Display name" required error={errors.displayName} hint="The name seekers will see on your profile">
                    <TextInput value={f.displayName} onChange={(v) => set('displayName', v)} maxLength={LIMITS.displayName} placeholder="e.g. Acharya Rahul" invalid={!!errors.displayName} />
                </Field>
                <Field label="Email address" required error={errors.email}>
                    <TextInput type="email" value={f.email} onChange={(v) => set('email', v)} invalid={!!errors.email} />
                </Field>
                <Field label="Mobile / WhatsApp number" required error={errors.phone} hint="Include your country code, e.g. +91">
                    <TextInput type="tel" value={f.phone} onChange={(v) => set('phone', v)} placeholder="+91 98765 43210" invalid={!!errors.phone} />
                </Field>
                <Field label="Country" required error={errors.country}>
                    <Select value={f.country} onChange={(v) => set('country', v)} options={COUNTRIES} invalid={!!errors.country} />
                </Field>
                <Field label="City" required error={errors.city}>
                    <TextInput value={f.city} onChange={(v) => set('city', v)} maxLength={LIMITS.city} invalid={!!errors.city} />
                </Field>
                <Field
                    label="Profile photo"
                    error={errors.profilePhotoPath}
                    hint="A clear, recent photograph. This may appear on your public profile if your application is approved."
                >
                    {/* The validation error is the Field's to show; the upload's
                        own failures are the only thing PhotoUploadField reports,
                        otherwise a rejected submit prints the same line twice. */}
                    <PhotoUploadField onUploaded={(path) => set('profilePhotoPath', path)} />
                </Field>
            </Section>

            <Section number={2} title="Your astrology practice">
                <Field label="Primary practice" required error={errors.primaryPractice}>
                    <Select value={f.primaryPractice} onChange={(v) => set('primaryPractice', v)} options={PRACTICES} invalid={!!errors.primaryPractice} />
                </Field>
                {f.primaryPractice === 'Other' && (
                    <Field label="Please specify your primary practice" required error={errors.primaryPracticeOther}>
                        <TextInput value={f.primaryPracticeOther} onChange={(v) => set('primaryPracticeOther', v)} maxLength={LIMITS.otherText} invalid={!!errors.primaryPracticeOther} />
                    </Field>
                )}
                <Field label="Additional practices" hint="Optional. Your primary practice is not listed again.">
                    <Chips options={PRACTICES} selected={f.additionalPractices} onToggle={(v) => toggle('additionalPractices', v)} exclude={f.primaryPractice} />
                </Field>
                <Field label="Years of experience" required error={errors.yearsOfExperience}>
                    <Select value={f.yearsOfExperience} onChange={(v) => set('yearsOfExperience', v)} options={EXPERIENCE_RANGES} invalid={!!errors.yearsOfExperience} />
                </Field>
                <Field label="How did you learn or develop your practice?" required error={errors.learningMethods}>
                    <Chips options={LEARNING_METHODS} selected={f.learningMethods} onToggle={(v) => toggle('learningMethods', v)} />
                </Field>
                {f.learningMethods.includes('Other') && (
                    <Field label="Please specify" required error={errors.learningMethodOther}>
                        <TextInput value={f.learningMethodOther} onChange={(v) => set('learningMethodOther', v)} maxLength={LIMITS.otherText} invalid={!!errors.learningMethodOther} />
                    </Field>
                )}
                <Field label="Teacher, guru, institute or academy" hint="Optional — not every practitioner has formal training.">
                    <TextInput value={f.teacherGuruInstitute} onChange={(v) => set('teacherGuruInstitute', v)} maxLength={LIMITS.teacherGuruInstitute} />
                </Field>
                <Field label="Do you hold any formal qualification or certification?" required>
                    <Radios name="qual" value={f.hasFormalQualification ? 'Yes' : 'No'} onChange={(v) => set('hasFormalQualification', v === 'Yes')} options={['Yes', 'No']} />
                </Field>
                {f.hasFormalQualification && (
                    <Field label="Qualification / certification name" required error={errors.qualificationName}>
                        <TextInput value={f.qualificationName} onChange={(v) => set('qualificationName', v)} maxLength={LIMITS.qualificationName} placeholder="e.g. Diploma in Vedic Astrology" invalid={!!errors.qualificationName} />
                    </Field>
                )}
            </Section>

            <Section number={3} title="Areas of expertise">
                <Field label="What can seekers consult you about?" required error={errors.areasOfExpertise}>
                    <Chips options={EXPERTISE_AREAS} selected={f.areasOfExpertise} onToggle={(v) => toggle('areasOfExpertise', v)} />
                </Field>
                {f.areasOfExpertise.includes('Other') && (
                    <Field label="Please specify the area" required error={errors.areasOfExpertiseOther}>
                        <TextInput value={f.areasOfExpertiseOther} onChange={(v) => set('areasOfExpertiseOther', v)} maxLength={LIMITS.otherText} invalid={!!errors.areasOfExpertiseOther} />
                    </Field>
                )}
                <Field label="Your specialization" hint="What makes your approach distinctive?" counter={count(f.specialization, LIMITS.specialization)}>
                    <TextArea value={f.specialization} onChange={(v) => set('specialization', v)} maxLength={LIMITS.specialization} rows={4} />
                </Field>
            </Section>

            <Section number={4} title="Languages & consultation methods">
                <Field label="Languages you can consult in" required error={errors.languages}>
                    <Chips options={LANGUAGES} selected={f.languages} onToggle={(v) => toggle('languages', v)} />
                </Field>
                {f.languages.includes('Other') && (
                    <Field label="Please specify the language" required error={errors.languageOther}>
                        <TextInput value={f.languageOther} onChange={(v) => set('languageOther', v)} maxLength={LIMITS.otherText} invalid={!!errors.languageOther} />
                    </Field>
                )}
                <Field label="How can seekers consult with you?" required error={errors.consultationMethods}>
                    <Chips options={CONSULTATION_METHODS} selected={f.consultationMethods} onToggle={(v) => toggle('consultationMethods', v)} />
                </Field>
                <Field label="How often are you available for consultations?" required error={errors.availabilityFrequency}>
                    <Select value={f.availabilityFrequency} onChange={(v) => set('availabilityFrequency', v)} options={AVAILABILITY_FREQUENCIES} invalid={!!errors.availabilityFrequency} />
                </Field>
            </Section>

            <Section number={5} title="Previous consultation experience">
                <Field label="Have you provided astrology or spiritual consultations before?" required error={errors.previousConsultationExperience}>
                    <Select value={f.previousConsultationExperience} onChange={(v) => set('previousConsultationExperience', v)} options={PREVIOUS_EXPERIENCE} invalid={!!errors.previousConsultationExperience} />
                </Field>
                {showPrevLocations && (
                    <Field label="Where have you provided consultations?">
                        <Chips options={PREVIOUS_LOCATIONS} selected={f.previousConsultationLocations} onToggle={(v) => toggle('previousConsultationLocations', v)} />
                    </Field>
                )}
                <Field label="Existing professional profile or website" error={errors.professionalProfileUrl} hint="Optional">
                    <TextInput type="url" value={f.professionalProfileUrl} onChange={(v) => set('professionalProfileUrl', v)} placeholder="https://…" invalid={!!errors.professionalProfileUrl} />
                </Field>
            </Section>

            <Section number={6} title="About your approach">
                <Field label="Tell us about yourself and your practice" required error={errors.aboutYou} counter={count(f.aboutYou, LIMITS.aboutYou)}>
                    <TextArea value={f.aboutYou} onChange={(v) => set('aboutYou', v)} maxLength={LIMITS.aboutYou} placeholder="Your background, your approach, and how long you have been practising." invalid={!!errors.aboutYou} />
                </Field>
                <Field label="Describe your approach to an astrology consultation" required error={errors.consultationApproach} hint="How do you understand a seeker's question and guide them?" counter={count(f.consultationApproach, LIMITS.consultationApproach)}>
                    <TextArea value={f.consultationApproach} onChange={(v) => set('consultationApproach', v)} maxLength={LIMITS.consultationApproach} invalid={!!errors.consultationApproach} />
                </Field>
                <Field label="How do you handle sensitive or emotionally difficult questions?" required error={errors.sensitiveQuestionsApproach} hint="How do you keep empathy, professionalism and appropriate boundaries?" counter={count(f.sensitiveQuestionsApproach, LIMITS.sensitiveQuestionsApproach)}>
                    <TextArea value={f.sensitiveQuestionsApproach} onChange={(v) => set('sensitiveQuestionsApproach', v)} maxLength={LIMITS.sensitiveQuestionsApproach} invalid={!!errors.sensitiveQuestionsApproach} />
                </Field>
            </Section>

            <Section number={7} title="Why AskChetna">
                <Field label="Why would you like to join AskChetna?" required error={errors.whyJoinAskchetna} counter={count(f.whyJoinAskchetna, LIMITS.whyJoinAskchetna)}>
                    <TextArea value={f.whyJoinAskchetna} onChange={(v) => set('whyJoinAskchetna', v)} maxLength={LIMITS.whyJoinAskchetna} rows={4} invalid={!!errors.whyJoinAskchetna} />
                </Field>
            </Section>

            <Section number={8} title="Professional conduct">
                <Field label="How do you communicate predictions and guidance to seekers?" required error={errors.predictionCommunication}>
                    <Radios name="pred" value={f.predictionCommunication} onChange={(v) => set('predictionCommunication', v)} options={PREDICTION_COMMUNICATION} />
                </Field>
                {f.predictionCommunication === 'Other.' && (
                    <Field label="Please explain your approach" required error={errors.predictionCommunicationOther} counter={count(f.predictionCommunicationOther, LIMITS.predictionCommunicationOther)}>
                        <TextArea value={f.predictionCommunicationOther} onChange={(v) => set('predictionCommunicationOther', v)} maxLength={LIMITS.predictionCommunicationOther} rows={3} invalid={!!errors.predictionCommunicationOther} />
                    </Field>
                )}
            </Section>

            <Section number={9} title="Declaration">
                {[
                    ['declarationAccuracy', 'I confirm that the information provided in this application is accurate to the best of my knowledge.'],
                    ['declarationNoGuarantee', 'I understand that submitting this application does not guarantee approval or access to the AskChetna platform.'],
                    ['declarationTerms', 'I agree to the AskChetna Astrologer Terms & Guidelines.'],
                    ['declarationAdditionalVerification', 'I understand that AskChetna may contact me for additional information or verification if my application progresses.'],
                ].map(([key, label]) => (
                    <label key={key} className={`${styles.check} ${errors[key] ? styles.checkInvalid : ''}`}>
                        <input
                            type="checkbox"
                            checked={f[key as keyof typeof f] as boolean}
                            onChange={(e) => set(key as keyof typeof f, e.target.checked as never)}
                        />
                        <span>
                            {label}
                            {key === 'declarationTerms' && (
                                <>
                                    {' '}
                                    <Link href="/terms" className={styles.inlineLink} target="_blank">Terms</Link>
                                    {' · '}
                                    <Link href="/privacy" className={styles.inlineLink} target="_blank">Privacy Policy</Link>
                                </>
                            )}
                        </span>
                    </label>
                ))}
            </Section>

            {banner && <p className={styles.banner} role="alert">{banner}</p>}

            <button type="submit" className={styles.submit} disabled={submitting}>
                {submitting && <Loader2 size={17} className={styles.spin} />}
                {submitting ? 'Submitting…' : 'Submit Application'}
            </button>
        </form>
    );
}
