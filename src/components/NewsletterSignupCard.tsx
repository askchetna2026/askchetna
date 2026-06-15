'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mail, CheckCircle2 } from 'lucide-react';
import styles from './NewsletterSignupCard.module.css';

type NewsletterSignupCardProps = {
    title: string;
    description: string;
    source: string;
    ctaLabel?: string;
    successMessage?: string;
    signupHref?: string;
};

export default function NewsletterSignupCard({
    title,
    description,
    source,
    ctaLabel = 'Subscribe Free',
    successMessage = 'You are subscribed. Watch your inbox for new cosmic notes.',
    signupHref = '/login?mode=signup&callbackUrl=/dashboard',
}: NewsletterSignupCardProps) {
    const pathname = usePathname();
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const helperText = useMemo(() => {
        return 'Weekly astrology notes, product updates, and practical reflections. No spam, and you can unsubscribe any time.';
    }, []);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!email.trim()) {
            setError('Please enter your email address.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const response = await fetch('/api/newsletter/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    source,
                    pagePath: pathname,
                }),
            });

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                setError(data?.error || 'Unable to subscribe right now.');
                return;
            }

            setIsSuccess(true);
            setEmail('');
        } catch {
            setError('Unable to subscribe right now.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section className={styles.card}>
            <div className={styles.copyBlock}>
                <span className={styles.eyebrow}>Weekly Cosmic Notes</span>
                <h3 className={styles.title}>{title}</h3>
                <p className={styles.description}>{description}</p>
                <p className={styles.helper}>{helperText}</p>
            </div>

            <div className={styles.actionBlock}>
                <form className={styles.form} onSubmit={handleSubmit}>
                    <label className={styles.inputLabel} htmlFor={`newsletter-${source}`}>
                        Email
                    </label>
                    <div className={styles.inputRow}>
                        <div className={styles.inputWrap}>
                            <Mail size={16} />
                            <input
                                id={`newsletter-${source}`}
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                placeholder="you@example.com"
                                autoComplete="email"
                                className={styles.input}
                                disabled={isSubmitting || isSuccess}
                            />
                        </div>
                        <button
                            type="submit"
                            className={styles.submitButton}
                            disabled={isSubmitting || isSuccess}
                        >
                            {isSubmitting ? 'Subscribing...' : isSuccess ? 'Subscribed' : ctaLabel}
                        </button>
                    </div>
                </form>

                {isSuccess ? (
                    <div className={styles.successMessage}>
                        <CheckCircle2 size={16} />
                        <span>{successMessage}</span>
                    </div>
                ) : null}

                {error ? <p className={styles.errorMessage}>{error}</p> : null}

                <div className={styles.secondaryActions}>
                    <span className={styles.secondaryText}>Want hands-on insight right away?</span>
                    <Link href={signupHref} className={styles.secondaryLink}>
                        Create your free account
                    </Link>
                </div>
            </div>
        </section>
    );
}
