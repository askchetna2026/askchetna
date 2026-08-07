import styles from '../legal.module.css';
import Link from 'next/link';

export const metadata = {
    title: 'Terms of Service - AskChetna',
    description: 'Terms of Service for using the AskChetna astrological platform.',
};

export default function TermsPage() {
    return (
        <main className={styles.legalPage}>
            <div className={styles.container}>
                <h1>Terms of Service</h1>
                <p className={styles.lastUpdated}>Last Updated: January 6, 2026</p>

                <section>
                    <h2>1. Acceptance of Terms</h2>
                    <p>
                        By accessing or using AskChetna ("the Platform," "our Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our Platform. These Terms constitute a legally binding agreement between you ("User," "you," or "your") and AskChetna.
                    </p>
                </section>

                <section>
                    <h2>2. Description of Services</h2>
                    <p>
                        AskChetna provides personalized astrological services, including but not limited to:
                    </p>
                    <ul>
                        <li>Birth chart calculations and interpretations</li>
                        <li>Planetary transit insights and daily horoscopes</li>
                        <li>Divisional charts (Navamsa, Dasamsa, and other Vargas)</li>
                        <li>Dasha and Bhukti period analysis</li>
                        <li>Synastry (relationship compatibility) reports</li>
                        <li>AI-powered astrological guidance and clarity sessions</li>
                        <li>Personalized PDF reports</li>
                        <li>Exclusive blog content and cosmic insights</li>
                    </ul>
                    <p>
                        We reserve the right to modify, suspend, or discontinue any part of our services at any time without prior notice.
                    </p>
                </section>

                <section>
                    <h2>3. User Accounts and Registration</h2>
                    <h3>3.1 Account Creation</h3>
                    <p>
                        To access certain features, you must create an account by providing accurate and complete information, including your name, email address, and birth details. You may register using Google OAuth or credentials-based authentication.
                    </p>

                    <h3>3.2 Account Security</h3>
                    <p>
                        You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.
                    </p>

                    <h3>3.3 Eligibility</h3>
                    <p>
                        You must be at least 18 years old to use our services. By creating an account, you represent and warrant that you meet this age requirement.
                    </p>
                </section>

                <section>
                    <h2>4. Astrological Services Disclaimer</h2>
                    <div className={styles.importantNotice}>
                        <p>
                            <strong>IMPORTANT:</strong> Astrological insights provided by AskChetna are for entertainment, self-reflection, and awareness purposes only. They are NOT a substitute for professional advice in areas including but not limited to:
                        </p>
                        <ul>
                            <li>Medical, mental health, or psychological counseling</li>
                            <li>Legal, financial, or investment advice</li>
                            <li>Career or employment decisions</li>
                            <li>Personal safety or critical life decisions</li>
                        </ul>
                        <p>
                            We do not claim to predict the future with certainty. Astrological interpretations are based on ancient systems of knowledge and should be used as tools for self-awareness, not as definitive guidance for life decisions.
                        </p>
                        <p>
                            <strong>You are solely responsible for your actions and decisions.</strong> AskChetna and its operators shall not be held liable for any consequences arising from reliance on astrological insights provided through our platform.
                        </p>
                    </div>
                </section>

                <section>
                    <h2>5. Credits and Payment Terms</h2>
                    <h3>5.1 Credit System</h3>
                    <p>
                        Certain services on our Platform require credits. You can purchase credits through our pricing plans or earn them through promotions. Credits are non-transferable and non-refundable except as required by law.
                    </p>

                    <h3>5.2 Pricing</h3>
                    <p>
                        We reserve the right to modify pricing and service costs at any time. Changes will be communicated to users, and continued use of the Platform constitutes acceptance of updated pricing.
                    </p>

                    <h3>5.3 Payment Processing</h3>
                    <p>
                        Payments are processed securely through third-party payment gateways (Razorpay). By making a purchase, you agree to their terms and conditions. All transactions are final, subject to our Refund Policy.
                    </p>

                    <h3>5.4 Taxes</h3>
                    <p>
                        You are responsible for any applicable taxes related to your purchases. Prices displayed may not include all taxes depending on your jurisdiction.
                    </p>
                </section>

                <section>
                    <h2>6. User Conduct and Prohibited Activities</h2>
                    <p>You agree NOT to:</p>
                    <ul>
                        <li>Use the Platform for any unlawful purpose or in violation of these Terms</li>
                        <li>Provide false, inaccurate, or misleading information</li>
                        <li>Attempt to gain unauthorized access to any part of the Platform, other user accounts, or our systems</li>
                        <li>Reverse engineer, decompile, or disassemble any part of our software or algorithms</li>
                        <li>Use automated tools (bots, scrapers) to access or extract data from the Platform</li>
                        <li>Harass, abuse, or harm other users</li>
                        <li>Upload malicious code, viruses, or any harmful content</li>
                        <li>Resell, redistribute, or commercially exploit our services without permission</li>
                        <li>Use the Platform to provide astrological services to third parties commercially</li>
                    </ul>
                    <p>
                        Violation of these rules may result in account suspension or termination without refund.
                    </p>
                </section>

                <section>
                    <h2>7. Intellectual Property Rights</h2>
                    <h3>7.1 Our Content</h3>
                    <p>
                        All content on the Platform, including but not limited to text, graphics, logos, algorithms, astrological interpretations, software code, and blog posts, are the intellectual property of AskChetna and are protected by copyright, trademark, and other laws. You may not copy, reproduce, distribute, or create derivative works without our express written permission.
                    </p>

                    <h3>7.2 Your Content</h3>
                    <p>
                        By submitting any content (feedback, questions, reviews), you grant us a worldwide, royalty-free, perpetual license to use, modify, and display such content for improving our services.
                    </p>
                </section>

                <section>
                    <h2>8. Privacy and Data Protection</h2>
                    <p>
                        Your use of the Platform is also governed by our <Link href="/privacy">Privacy Policy</Link>, which explains how we collect, use, and protect your personal information. By using our services, you consent to our data practices as described in the Privacy Policy.
                    </p>
                </section>

                <section>
                    <h2>9. Limitation of Liability</h2>
                    <div className={styles.importantNotice}>
                        <p>
                            TO THE MAXIMUM EXTENT PERMITTED BY LAW, AskChetna AND ITS OPERATORS, EMPLOYEES, AND AFFILIATES SHALL NOT BE LIABLE FOR:
                        </p>
                        <ul>
                            <li>Any indirect, incidental, special, consequential, or punitive damages</li>
                            <li>Loss of profits, revenue, data, or business opportunities</li>
                            <li>Personal injury or emotional distress arising from use of our services</li>
                            <li>Decisions made based on astrological insights provided</li>
                            <li>Interruptions, errors, or unavailability of the Platform</li>
                            <li>Third-party actions or services (payment processors, authentication providers)</li>
                        </ul>
                        <p>
                            Our total liability for any claim arising from your use of the Platform shall not exceed the amount you paid to us in the 12 months preceding the claim.
                        </p>
                    </div>
                </section>

                <section>
                    <h2>10. Indemnification</h2>
                    <p>
                        You agree to indemnify, defend, and hold harmless AskChetna and its affiliates from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from:
                    </p>
                    <ul>
                        <li>Your use or misuse of the Platform</li>
                        <li>Your violation of these Terms</li>
                        <li>Your violation of any third-party rights</li>
                        <li>Decisions or actions taken based on astrological insights</li>
                    </ul>
                </section>

                <section>
                    <h2>11. Termination</h2>
                    <p>
                        We reserve the right to suspend or terminate your account at any time, with or without cause, and with or without notice, including for violation of these Terms. Upon termination:
                    </p>
                    <ul>
                        <li>Your access to the Platform will be revoked</li>
                        <li>Unused credits will be forfeited (no refunds unless required by law)</li>
                        <li>Your data may be retained as per our Privacy Policy and legal obligations</li>
                    </ul>
                    <p>
                        You may terminate your account at any time through account settings or by contacting us.
                    </p>
                </section>

                <section>
                    <h2>12. Dispute Resolution and Governing Law</h2>
                    <h3>12.1 Governing Law</h3>
                    <p>
                        These Terms shall be governed by and construed in accordance with the laws of India, without regard to conflict of law principles.
                    </p>

                    <h3>12.2 Dispute Resolution</h3>
                    <p>
                        Any disputes arising from these Terms or your use of the Platform shall be resolved through good-faith negotiation. If unresolved, disputes shall be subject to the exclusive jurisdiction of courts in New Delhi, India.
                    </p>
                </section>

                <section>
                    <h2>13. Modifications to Terms</h2>
                    <p>
                        We may update these Terms from time to time. Significant changes will be communicated via email or a prominent notice on the Platform. Your continued use after changes constitutes acceptance of the updated Terms. If you do not agree, you must discontinue use of the Platform.
                    </p>
                </section>

                <section>
                    <h2>14. Severability</h2>
                    <p>
                        If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall remain in full force and effect.
                    </p>
                </section>

                <section>
                    <h2>15. Contact Information</h2>
                    <p>
                        For questions, concerns, or feedback regarding these Terms, please contact us:
                    </p>
                    <ul>
                        <li>Email: <a href="mailto:support@askchetna.com">support@askchetna.com</a></li>
                        <li>Legal: <a href="mailto:legal@askchetna.com">legal@askchetna.com</a></li>
                    </ul>
                </section>

                <div className={styles.backLink}>
                    <Link href="/">← Back to Home</Link>
                </div>
            </div>
        </main>
    );
}
