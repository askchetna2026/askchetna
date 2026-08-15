/**
 * The seeker's LOCAL calendar day, as the YYYY-MM-DD key the APIs store
 * against.
 *
 * Not `toISOString().split('T')[0]`. That is UTC, and for anywhere east of
 * Greenwich the two disagree for the first hours of every local day: in IST
 * (UTC+5:30) a reflection written at 01:00 on the 16th is filed under the
 * 15th, and "today's entry" then fails to load the thing that was just saved.
 *
 * DailyInsightCard worked this out first and kept a private copy; JournalWidget
 * did not, and used the UTC form. Shared here so the two cannot drift again —
 * they key against the same tables and must agree on what "today" is.
 */
export function localDay(d: Date = new Date()): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
