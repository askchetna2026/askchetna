import Link from 'next/link';
import NewsletterSignupCard from '@/components/NewsletterSignupCard';
import { absoluteUrl } from '@/lib/site';
import type { SeoLandingPage as SeoLandingPageConfig } from '@/lib/seoLandingPages';
import styles from './SeoLandingPage.module.css';

type SeoLandingPageProps = {
    page: SeoLandingPageConfig;
};

export default function SeoLandingPage({ page }: SeoLandingPageProps) {
    const pageUrl = absoluteUrl(`/${page.slug}`);
    const schema = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'WebPage',
                name: page.metaTitle,
                description: page.metaDescription,
                url: pageUrl,
            },
            {
                '@type': 'BreadcrumbList',
                itemListElement: [
                    {
                        '@type': 'ListItem',
                        position: 1,
                        name: 'Home',
                        item: absoluteUrl('/'),
                    },
                    {
                        '@type': 'ListItem',
                        position: 2,
                        name: page.heroTitle,
                        item: pageUrl,
                    },
                ],
            },
            {
                '@type': 'FAQPage',
                mainEntity: page.faq.map((item) => ({
                    '@type': 'Question',
                    name: item.question,
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: item.answer,
                    },
                })),
            },
        ],
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
            />

            <div className={styles.pageShell}>
                <section className={styles.hero}>
                    <div className={styles.heroText}>
                        <span className={styles.eyebrow}>{page.eyebrow}</span>
                        <h1 className={styles.title}>{page.heroTitle}</h1>
                        <p className={styles.description}>{page.heroDescription}</p>

                        <div className={styles.heroActions}>
                            <Link href={page.primaryCta.href} className={styles.primaryButton}>
                                {page.primaryCta.label}
                            </Link>
                            <Link href={page.secondaryCta.href} className={styles.secondaryButton}>
                                {page.secondaryCta.label}
                            </Link>
                        </div>
                    </div>

                    <div className={styles.proofCard}>
                        <h2 className={styles.proofTitle}>Best for people who want to:</h2>
                        <ul className={styles.proofList}>
                            {page.proofPoints.map((point) => (
                                <li key={point}>{point}</li>
                            ))}
                        </ul>
                    </div>
                </section>

                <section className={styles.benefitsSection}>
                    <div className={styles.sectionHeader}>
                        <span className={styles.sectionEyebrow}>Why This Topic Matters</span>
                        <h2 className={styles.sectionTitle}>Use astrology as a lens for decisions, not as a substitute for them</h2>
                    </div>

                    <div className={styles.benefitsGrid}>
                        {page.benefits.map((benefit) => (
                            <article key={benefit.title} className={styles.benefitCard}>
                                <h3>{benefit.title}</h3>
                                <p>{benefit.description}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className={styles.sectionStack}>
                    {page.sections.map((section) => (
                        <article key={section.title} className={styles.storyCard}>
                            <h2>{section.title}</h2>
                            <p>{section.body}</p>
                        </article>
                    ))}
                </section>

                <section className={styles.faqSection}>
                    <div className={styles.sectionHeader}>
                        <span className={styles.sectionEyebrow}>Common Questions</span>
                        <h2 className={styles.sectionTitle}>Straight answers before you go deeper</h2>
                    </div>

                    <div className={styles.faqList}>
                        {page.faq.map((item) => (
                            <article key={item.question} className={styles.faqCard}>
                                <h3>{item.question}</h3>
                                <p>{item.answer}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <NewsletterSignupCard
                    title="Get weekly notes on astrology, timing, and patterns"
                    description="If this topic is already resonating, subscribe for grounded guidance that helps you reflect between sessions."
                    source={page.newsletterSource}
                    signupHref={page.primaryCta.href}
                />

                <section className={styles.linksSection}>
                    <div className={styles.sectionHeader}>
                        <span className={styles.sectionEyebrow}>Continue Exploring</span>
                        <h2 className={styles.sectionTitle}>Move through the rest of the product with context</h2>
                    </div>

                    <div className={styles.linksGrid}>
                        {page.internalLinks.map((link) => (
                            <Link key={link.href} href={link.href} className={styles.linkCard}>
                                <h3>{link.title}</h3>
                                <p>{link.description}</p>
                                <span>Open page</span>
                            </Link>
                        ))}
                    </div>
                </section>
            </div>
        </>
    );
}
