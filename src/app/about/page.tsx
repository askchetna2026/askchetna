import styles from '../legal.module.css';
import Link from 'next/link';

export const metadata = {
    title: 'About AskChetna - Awareness, Not Prediction',
    description: 'Learn about AskChetna - an awareness-first astrology platform designed for self-reflection and conscious living.',
};

export default function AboutPage() {
    return (
        <main className={styles.legalPage}>
            <div className={styles.container}>
                <div className={styles.hero}>
                    <span className="cosmic-label">Our Vision · Darshana</span>
                    <h1 className="mystic-text">About AskChetna</h1>
                    <div className="sacred-divider"></div>
                    <p className={styles.heroSubtitle}>Awareness, Not Prediction</p>
                </div>

                <section>
                    <p style={{ fontSize: '1.15rem', lineHeight: 1.8 }}>
                        Most people come to astrology when something isn't working. A relationship that keeps unravelling the same way. A career that feels stuck. A quiet sense that you keep tripping over the same invisible wire — and you can't see why.
                    </p>
                    <p>
                        You don't need someone to tell you what will happen next. You need to understand the pattern you're already living inside. That's the moment AskChetna was built for.
                    </p>
                    <h2 className="mystic-text">What is AskChetna?</h2>
                    <p>
                        <strong>AskChetna</strong> (चेतना) is a Sanskrit word meaning "awareness" or "consciousness." It represents the essence of our platform: a space for self-reflection, understanding, and conscious decision-making through the lens of Vedic astrology.
                    </p>
                    <p>
                        We are not here to predict your future or tell you what to do. Instead, we provide tools and insights to help you understand yourself better, recognize patterns in your life, and make more aware choices aligned with your true nature.
                    </p>
                </section>

                <section>
                    <h2 className="mystic-text">Our Philosophy</h2>
                    <div className={`${styles.importantNotice} sacred-card`}>
                        <h3 className="mystic-text">What AskChetna Is:</h3>
                        <ul>
                            <li><strong>A tool for self-awareness</strong> — Understanding your strengths, challenges, and natural tendencies</li>
                            <li><strong>A guide for timing</strong> — Recognizing favorable and challenging periods in your life</li>
                            <li><strong>A framework for reflection</strong> — Making sense of your experiences through cosmic patterns</li>
                            <li><strong>A companion for growth</strong> — Supporting your journey toward conscious living</li>
                        </ul>

                        <h3>What AskChetna Is NOT:</h3>
                        <ul>
                            <li><strong>Not a fortune-telling service</strong> — We don't claim to predict the future with certainty</li>
                            <li><strong>Not a decision-making authority</strong> — You are responsible for your choices</li>
                            <li><strong>Not a substitute for professional help</strong> — For medical, legal, or financial matters, consult qualified experts</li>
                            <li><strong>Not a rigid belief system</strong> — Astrology is interpretive, not deterministic</li>
                        </ul>
                    </div>
                </section>

                <section>
                    <h2>Why Vedic Astrology?</h2>
                    <p>
                        Vedic astrology, also known as Jyotiṣa (the "science of light"), is an ancient system of knowledge that originated in India over 5,000 years ago. Unlike Western astrology, which focuses on the Sun sign, Vedic astrology uses:
                    </p>
                    <ul>
                        <li><strong>The Sidereal Zodiac</strong> — Based on the actual positions of constellations in the sky</li>
                        <li><strong>Divisional Charts (Vargas)</strong> — For deeper insights into specific life areas like relationships, career, and spirituality</li>
                        <li><strong>Dasha Systems</strong> — Planetary periods that reveal timing and life phases</li>
                        <li><strong>Nakshatras (Lunar Mansions)</strong> — 27 lunar constellations that add nuance to planetary influences</li>
                    </ul>
                    <p>
                        We believe Vedic astrology offers a profound framework for self-understanding, not because it's "true" in a scientific sense, but because it provides meaningful patterns and archetypes that resonate with human experience.
                    </p>
                </section>

                <section>
                    <h2>What Makes AskChetna Different?</h2>

                    <h3>1. Awareness-First Approach</h3>
                    <p>
                        Most astrology platforms focus on predictions: "You will meet someone special," "You'll get a promotion," etc. AskChetna takes a different path. We emphasize <strong>awareness over prediction</strong>. Instead of telling you what will happen, we help you understand the energies at play, the lessons being presented, and the choices available to you.
                    </p>

                    <h3>2. No Fear-Mongering</h3>
                    <p>
                        Traditional astrology often relies on fear—malefic planets, bad doshas, inauspicious transits. We reject this approach. Every planetary influence has both challenges and gifts. We help you see the full picture, not just the scary parts.
                    </p>

                    <h3>3. Personalized & Dynamic</h3>
                    <p>
                        Your birth chart is as unique as your fingerprint. We provide deeply personalized insights based on your exact birth time and location. Our AI-powered clarity sessions allow you to ask specific questions and receive tailored guidance, not generic horoscope text.
                    </p>

                    <h3>4. Modern Technology Meets Ancient Wisdom</h3>
                    <p>
                        We use cutting-edge AI and precise astronomical calculations to generate your charts and interpretations. Our platform combines the timeless wisdom of Vedic astrology with the convenience and accessibility of modern technology.
                    </p>

                    <h3>5. Transparency & Authenticity</h3>
                    <p>
                        We're honest about what astrology can and cannot do. We don't make false promises or exaggerated claims. Our disclaimers are clear: astrology is for awareness, not certainty. Your life is yours to create.
                    </p>
                </section>

                <section>
                    <h2>Our Services</h2>
                    <p>AskChetna offers a comprehensive suite of astrological tools:</p>
                    <ul>
                        <li><strong>Birth Chart Analysis</strong> — Detailed breakdown of your planetary positions, houses, and signs</li>
                        <li><strong>Divisional Charts</strong> — Navamsa (relationships), Dasamsa (career), and more</li>
                        <li><strong>Planetary Transits</strong> — Current cosmic influences affecting you</li>
                        <li><strong>Dasha & Bhukti Periods</strong> — Understanding your life phases and timing</li>
                        <li><strong>Synastry Reports</strong> — Relationship compatibility analysis</li>
                        <li><strong>AI Clarity Sessions</strong> — Ask specific questions and receive personalized insights</li>
                        <li><strong>Personalized PDF Reports</strong> — Downloadable charts and interpretations</li>
                        <li><strong>Cosmic Journal</strong> — Exclusive blog content with astrological wisdom</li>
                    </ul>
                </section>

                <section>
                    <h2>Who is AskChetna For?</h2>
                    <p>
                        AskChetna is designed for seekers, thinkers, and anyone curious about the deeper patterns of life. You don't need to "believe" in astrology to benefit from it. If you're interested in:
                    </p>
                    <ul>
                        <li>Understanding yourself more deeply</li>
                        <li>Recognizing patterns in your relationships, career, or personal growth</li>
                        <li>Exploring ancient wisdom with a modern mindset</li>
                        <li>Making more conscious, aligned decisions</li>
                        <li>Finding meaning and perspective during challenging times</li>
                    </ul>
                    <p>
                        ...then AskChetna is for you.
                    </p>
                </section>

                <section>
                    <h2>Our Commitment to You</h2>
                    <p>We are committed to:</p>
                    <ul>
                        <li><strong>Accuracy:</strong> Using precise astronomical calculations and quality interpretations</li>
                        <li><strong>Privacy:</strong> Protecting your personal data and birth information (see our <Link href="/privacy">Privacy Policy</Link>)</li>
                        <li><strong>Respect:</strong> Honoring your intelligence, autonomy, and personal beliefs</li>
                        <li><strong>Integrity:</strong> Being honest about what astrology is and isn't</li>
                        <li><strong>Continuous Improvement:</strong> Regularly updating our algorithms, interpretations, and features based on user feedback</li>
                    </ul>
                </section>

                <section>
                    <h2>A Note from the Creator</h2>
                    <p>
                        AskChetna was born from a simple realization: most people approach astrology looking for answers, but what they really need is <em>awareness</em>. Awareness of their patterns, their strengths, their blind spots, and the energies influencing their lives.
                    </p>
                    <p>
                        I wanted to create a platform that respects your intelligence, doesn't manipulate through fear, and genuinely helps you understand yourself better. AskChetna is not about dependency—it's about empowerment. Use it as a mirror, not a crutch.
                    </p>
                    <p>
                        Whether you're a lifelong astrology enthusiast or a curious skeptic, I hope AskChetna serves your journey toward greater self-awareness and conscious living.
                    </p>
                    <p style={{ fontStyle: 'italic', marginTop: '24px' }}>
                        — The AskChetna Team
                    </p>
                </section>

                <section>
                    <h2>Connect With Us</h2>
                    <p>
                        We'd love to hear from you! Whether you have questions, feedback, or just want to share your experience, reach out:
                    </p>
                    <ul>
                        <li>Email: <a href="mailto:hello@askchetna.com">hello@askchetna.com</a></li>
                        <li>Support: <a href="mailto:hello@askchetna.com">hello@askchetna.com</a></li>
                        {/* <li>Instagram: <a href="#">@chetna.astrology</a></li> */}
                        {/* <li>YouTube: <a href="#">AskChetna Insights</a></li> */}
                    </ul>
                </section>

                <div className={styles.backLink}>
                    <Link href="/">← Back to Home</Link>
                </div>
            </div>
        </main>
    );
}
