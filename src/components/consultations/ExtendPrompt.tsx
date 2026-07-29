'use client';

import { Clock, Plus } from 'lucide-react';
import styles from './ExtendPrompt.module.css';

/**
 * The "keep talking?" prompt, raised when the paid block is nearly spent.
 *
 * Three distinct states, because they need three different responses and
 * collapsing them would leave a user confused about why nothing happened:
 *
 *   can extend      offer it, with the cost stated plainly
 *   no credits      say so, and point at the top-up rather than a dead button
 *   already ending  nothing to offer
 *
 * The button only asks; the server decides, deducts and extends. A failed
 * extension therefore has to be survivable here, which is why `error` is
 * rendered rather than assumed impossible.
 */

type Props = {
    minutesPerCredit: number;
    creditBalance: number;
    extending: boolean;
    error?: string | null;
    onExtend: () => void;
    onDismiss: () => void;
};

export default function ExtendPrompt({
    minutesPerCredit,
    creditBalance,
    extending,
    error,
    onExtend,
    onDismiss,
}: Props) {
    const canAfford = creditBalance >= 1;

    return (
        <div className={styles.prompt} role="alertdialog" aria-labelledby="extend-title">
            <div className={styles.icon} aria-hidden="true">
                <Clock size={20} />
            </div>

            <div className={styles.body}>
                <p id="extend-title" className={styles.title}>
                    {canAfford ? 'Your time is nearly up' : 'Your time is nearly up'}
                </p>

                <p className={styles.detail}>
                    {canAfford ? (
                        <>
                            Add <strong>1 credit</strong> for another {minutesPerCredit} minutes.
                            You have {creditBalance} credit{creditBalance === 1 ? '' : 's'} left.
                        </>
                    ) : (
                        <>
                            You have no credits left, so this consultation will end shortly.
                            Top up to continue.
                        </>
                    )}
                </p>

                {error && <p className={styles.error}>{error}</p>}
            </div>

            <div className={styles.actions}>
                {canAfford ? (
                    <button
                        type="button"
                        className={styles.extend}
                        onClick={onExtend}
                        disabled={extending}
                    >
                        <Plus size={16} />
                        {extending ? 'Adding…' : `+${minutesPerCredit} min`}
                    </button>
                ) : (
                    <a className={styles.extend} href="/pricing">
                        Top up
                    </a>
                )}

                <button type="button" className={styles.dismiss} onClick={onDismiss}>
                    Not now
                </button>
            </div>
        </div>
    );
}
