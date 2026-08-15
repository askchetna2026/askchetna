import type { Metadata } from 'next';
import JournalPageContent from './JournalPageContent';

export const metadata: Metadata = {
    title: 'Your Journal | AskChetna',
    description:
        'Your daily reflections, kept together — what you noticed, when you noticed it, and the patterns that show up across weeks rather than days.',
};

/**
 * The journal's own page.
 *
 * It did not exist. The header has linked to /journal since it was written, and
 * that link has been a 404 the whole time — a top-level navigation item leading
 * nowhere. It surfaced when journaling moved off the signed-in home, because
 * that move was made on the argument that the habit belongs here, where there
 * is room to write and to read back.
 */
export default function JournalPage() {
    return <JournalPageContent />;
}
