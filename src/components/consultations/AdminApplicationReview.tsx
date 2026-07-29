'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Search, Check, X, HelpCircle, ArrowLeft } from 'lucide-react';
import { STATUS_LABELS } from '@/lib/astrologerApplication';
import styles from './AdminApplicationReview.module.css';

/**
 * Application review queue and detail (spec §23–25).
 *
 * A queue plus a detail panel rather than two pages: reviewing is a sequence —
 * open, decide, next — and a full navigation between each one makes a batch of
 * twenty tedious enough that they get rushed.
 *
 * The detail view groups answers under the same headings the applicant filled
 * in, so a reviewer reads them in the order they were written rather than in
 * database order.
 */

type ListRow = {
    id: string; ref: string; fullName: string; displayName: string;
    country: string; primaryPractice: string; yearsOfExperience: string;
    languages: string[]; status: string; submittedAt: string; reviewedBy: string | null;
};

type Detail = Record<string, unknown> & {
    id: string; ref: string; status: string; photoUrl: string | null;
    adminNotes: string | null;
};

const TABS = ['NEEDS_ACTION', 'SUBMITTED', 'SHORTLISTED', 'REJECTED', 'ALL'] as const;
const TAB_LABELS: Record<string, string> = {
    NEEDS_ACTION: 'Needs action', SUBMITTED: 'Submitted',
    SHORTLISTED: 'Shortlisted', REJECTED: 'Rejected', ALL: 'All',
};

export default function AdminApplicationReview() {
    const [tab, setTab] = useState<(typeof TABS)[number]>('NEEDS_ACTION');
    const [query, setQuery] = useState('');
    /** What the query settles on. Typing a reference fired a request per keystroke. */
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [rows, setRows] = useState<ListRow[] | null>(null);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [openId, setOpenId] = useState<string | null>(null);
    const [detail, setDetail] = useState<Detail | null>(null);
    const [notes, setNotes] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notesSaved, setNotesSaved] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedQuery(query), 300);
        return () => clearTimeout(t);
    }, [query]);

    const load = useCallback(async () => {
        setRows(null);
        setError(null);
        try {
            const url = `/api/admin/astrologer-applications?status=${tab}${debouncedQuery ? `&q=${encodeURIComponent(debouncedQuery)}` : ''}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error();
            const data = await res.json();
            setRows(data.applications ?? []);
            setCounts(data.counts ?? {});
        } catch {
            setRows([]);
            setError('Could not load applications.');
        }
    }, [tab, debouncedQuery]);

    useEffect(() => { void load(); }, [load]);

    const open = async (id: string) => {
        setOpenId(id);
        setDetail(null);
        setError(null);
        setNotesSaved(false);
        try {
            const res = await fetch(`/api/admin/astrologer-applications/${id}`);
            const data = await res.json();
            // Without this the detail pane sits on "Loading…" forever, because
            // a null detail is also how the loading state is expressed.
            if (!res.ok || !data.application) throw new Error();
            setDetail(data.application);
            setNotes(data.application.adminNotes ?? '');
        } catch {
            setOpenId(null);
            setError('Could not load that application.');
        }
    };

    const act = async (action: string, message?: string) => {
        if (!openId) return;
        setBusy(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/astrologer-applications/${openId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, message, adminNotes: notes }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error ?? 'Action failed.');
                return;
            }
            setOpenId(null);
            setDetail(null);
            await load();
        } catch {
            setError('Action failed. Check your connection.');
        } finally {
            setBusy(false);
        }
    };

    const saveNotes = async () => {
        if (!openId) return;
        setBusy(true);
        setError(null);
        setNotesSaved(false);
        try {
            const res = await fetch(`/api/admin/astrologer-applications/${openId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminNotes: notes }),
            });
            // A note that silently failed to save is worse than no note: the
            // reviewer moves on believing the next admin will read it.
            if (!res.ok) {
                setError('Could not save the notes. They have not been recorded.');
                return;
            }
            setNotesSaved(true);
        } catch {
            setError('Could not save the notes. Check your connection.');
        } finally {
            setBusy(false);
        }
    };

    const reject = () => {
        const reason = window.prompt(
            'Reason for rejection. THE APPLICANT WILL SEE THIS — keep internal reasoning in the notes field.'
        );
        if (reason === null || !reason.trim()) return;
        void act('REJECT', reason);
    };

    const requestInfo = () => {
        const message = window.prompt('What additional information is required?');
        if (message === null || !message.trim()) return;
        void act('REQUEST_INFO', message);
    };

    // ---- detail ----
    if (openId) {
        if (!detail) {
            return <p className={styles.loading}><Loader2 size={16} className={styles.spin} /> Loading…</p>;
        }

        const s = (k: string) => (detail[k] as string) || '—';
        const arr = (k: string) => {
            const v = detail[k] as string[] | undefined;
            return v?.length ? v.join(', ') : '—';
        };

        const groups: Array<[string, Array<[string, string]>]> = [
            ['Applicant', [
                ['Full name', s('fullName')], ['Display name', s('displayName')],
                ['Email', s('email')], ['Phone', s('phone')],
                ['Country', s('country')], ['City', s('city')],
            ]],
            ['Practice', [
                ['Primary practice', s('primaryPractice')],
                ['If other', s('primaryPracticeOther')],
                ['Additional practices', arr('additionalPractices')],
                ['Experience', s('yearsOfExperience')],
                ['How they learned', arr('learningMethods')],
                ['Teacher / institute', s('teacherGuruInstitute')],
                ['Formal qualification', detail.hasFormalQualification ? s('qualificationName') || 'Yes' : 'No'],
            ]],
            ['Expertise', [
                ['Areas', arr('areasOfExpertise')],
                ['If other', s('areasOfExpertiseOther')],
                ['Specialization', s('specialization')],
            ]],
            ['Languages & services', [
                ['Languages', arr('languages')],
                ['Consultation methods', arr('consultationMethods')],
                ['Availability', s('availabilityFrequency')],
            ]],
            ['Previous experience', [
                ['Experience', s('previousConsultationExperience')],
                ['Where', arr('previousConsultationLocations')],
                ['Profile URL', s('professionalProfileUrl')],
            ]],
        ];

        const essays: Array<[string, string]> = [
            ['About them and their practice', s('aboutYou')],
            ['Their consultation approach', s('consultationApproach')],
            ['Handling sensitive questions', s('sensitiveQuestionsApproach')],
            ['Why AskChetna', s('whyJoinAskchetna')],
            ['How they communicate predictions', s('predictionCommunication')],
        ];

        // Picking "Other." puts the actual answer in a separate column. Without
        // this the reviewer reads the word "Other." and never sees what was
        // written — which is the one case where the answer matters most.
        if (detail.predictionCommunicationOther) {
            essays.push(['Their own wording', s('predictionCommunicationOther')]);
        }

        return (
            <div className={styles.detail}>
                <button className={styles.back} onClick={() => { setOpenId(null); setDetail(null); }}>
                    <ArrowLeft size={15} /> Back to queue
                </button>

                <header className={styles.detailHead}>
                    {detail.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={detail.photoUrl} alt="" className={styles.photo} />
                    ) : (
                        <div className={styles.photoMissing}>No photo</div>
                    )}
                    <div>
                        <h2 className={styles.detailName}>{s('displayName')}</h2>
                        <p className={styles.detailRef}>
                            {detail.ref} · {STATUS_LABELS[detail.status] ?? detail.status}
                        </p>
                    </div>
                </header>

                {error && <p className={styles.error} role="alert">{error}</p>}

                {groups.map(([title, fields]) => (
                    <section key={title} className={styles.group}>
                        <h3 className={styles.groupTitle}>{title}</h3>
                        <dl className={styles.facts}>
                            {fields.map(([k, v]) => (
                                <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
                            ))}
                        </dl>
                    </section>
                ))}

                <section className={styles.group}>
                    <h3 className={styles.groupTitle}>Screening responses</h3>
                    {essays.map(([k, v]) => (
                        <div key={k} className={styles.essay}>
                            <h4 className={styles.essayTitle}>{k}</h4>
                            <p className={styles.essayBody}>{v}</p>
                        </div>
                    ))}
                </section>

                <section className={styles.group}>
                    <h3 className={styles.groupTitle}>Internal notes</h3>
                    {/* Never shown to the applicant — spec §25. */}
                    <p className={styles.notesHint}>Visible to admins only.</p>
                    <textarea
                        className={styles.notes}
                        value={notes}
                        onChange={(e) => { setNotes(e.target.value); setNotesSaved(false); }}
                        rows={4}
                        maxLength={5000}
                        placeholder="e.g. Strong Vedic background. Consider for interview."
                    />
                    <button className={styles.secondary} onClick={saveNotes} disabled={busy}>
                        Save notes
                    </button>
                    {notesSaved && <span className={styles.savedNote}>Notes saved.</span>}
                </section>

                <div className={styles.actions}>
                    <button className={styles.approve} onClick={() => act('SHORTLIST')} disabled={busy}>
                        <Check size={15} /> Shortlist
                    </button>
                    <button className={styles.secondary} onClick={requestInfo} disabled={busy}>
                        <HelpCircle size={15} /> Request more information
                    </button>
                    <button className={styles.reject} onClick={reject} disabled={busy}>
                        <X size={15} /> Reject
                    </button>
                </div>

                <p className={styles.footnote}>
                    Shortlisting records that the applicant passed first screening. It does
                    not publish a profile — verification, pricing and payout setup come
                    first.
                </p>
            </div>
        );
    }

    // ---- queue ----
    return (
        <div className={styles.wrap}>
            <div className={styles.tabs} role="tablist">
                {TABS.map((t) => (
                    <button
                        key={t}
                        role="tab"
                        aria-selected={tab === t}
                        className={`${styles.tab} ${tab === t ? styles.tabOn : ''}`}
                        onClick={() => setTab(t)}
                    >
                        {TAB_LABELS[t]}
                        {counts[t] !== undefined && <span className={styles.count}>{counts[t]}</span>}
                    </button>
                ))}
            </div>

            <div className={styles.searchRow}>
                <Search size={16} className={styles.searchIcon} aria-hidden="true" />
                <input
                    className={styles.search}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by reference, name, email or phone"
                    aria-label="Search applications"
                />
            </div>

            {error && <p className={styles.error} role="alert">{error}</p>}
            {rows === null && <p className={styles.loading}><Loader2 size={16} className={styles.spin} /> Loading…</p>}
            {rows?.length === 0 && <p className={styles.empty}>Nothing here.</p>}

            <div className={styles.list}>
                {rows?.map((r) => (
                    <button key={r.id} className={styles.row} onClick={() => open(r.id)}>
                        <span className={styles.rowMain}>
                            <span className={styles.rowName}>{r.displayName}</span>
                            <span className={styles.rowMeta}>
                                {r.ref} · {r.primaryPractice} · {r.yearsOfExperience} · {r.country}
                            </span>
                        </span>
                        <span className={`${styles.badge} ${styles[r.status.toLowerCase()] ?? ''}`}>
                            {STATUS_LABELS[r.status] ?? r.status}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
