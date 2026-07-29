'use client';

import styles from './AstrologerApplicationForm.module.css';

/**
 * Field primitives for the application form.
 *
 * Split out so the form itself reads as its nine sections rather than as a wall
 * of markup. Each primitive owns its own error slot, because a message beside
 * the input that caused it is worth more than a list of failures at the top of
 * a form this long — on a phone the summary would be off-screen by the time you
 * reached the field.
 */

export function Field({
    label, error, hint, required, children, counter,
}: {
    label: string;
    error?: string;
    hint?: string;
    required?: boolean;
    children: React.ReactNode;
    counter?: string;
}) {
    return (
        <div className={styles.field}>
            <span className={styles.label}>
                {label}
                {required && <span className={styles.req} aria-hidden="true"> *</span>}
            </span>
            {hint && <span className={styles.hint}>{hint}</span>}
            {children}
            <div className={styles.fieldFoot}>
                {error ? <span className={styles.error} role="alert">{error}</span> : <span />}
                {counter && <span className={styles.counter}>{counter}</span>}
            </div>
        </div>
    );
}

export function TextInput({
    value, onChange, placeholder, type = 'text', maxLength, invalid,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    type?: string;
    maxLength?: number;
    invalid?: boolean;
}) {
    return (
        <input
            type={type}
            className={`${styles.input} ${invalid ? styles.inputInvalid : ''}`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            aria-invalid={invalid || undefined}
        />
    );
}

export function TextArea({
    value, onChange, placeholder, maxLength, rows = 5, invalid,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    maxLength: number;
    rows?: number;
    invalid?: boolean;
}) {
    return (
        <textarea
            className={`${styles.textarea} ${invalid ? styles.inputInvalid : ''}`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            rows={rows}
            aria-invalid={invalid || undefined}
        />
    );
}

export function Select({
    value, onChange, options, placeholder = 'Select…', invalid,
}: {
    value: string;
    onChange: (v: string) => void;
    options: readonly string[];
    placeholder?: string;
    invalid?: boolean;
}) {
    return (
        <select
            className={`${styles.select} ${invalid ? styles.inputInvalid : ''}`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={invalid || undefined}
        >
            <option value="">{placeholder}</option>
            {options.map((o) => (
                <option key={o} value={o}>{o}</option>
            ))}
        </select>
    );
}

/**
 * Multi-select chips. Selection is carried by aria-pressed as well as colour, so
 * it survives for anyone who cannot separate the gold from the muted border.
 */
export function Chips({
    options, selected, onToggle, exclude,
}: {
    options: readonly string[];
    selected: string[];
    onToggle: (v: string) => void;
    /** Hidden from this list — used to stop a primary practice reappearing as an additional one. */
    exclude?: string;
}) {
    return (
        <div className={styles.chips}>
            {options.filter((o) => o !== exclude).map((o) => {
                const on = selected.includes(o);
                return (
                    <button
                        key={o}
                        type="button"
                        className={`${styles.chip} ${on ? styles.chipOn : ''}`}
                        onClick={() => onToggle(o)}
                        aria-pressed={on}
                    >
                        {o}
                    </button>
                );
            })}
        </div>
    );
}

export function Radios({
    name, value, onChange, options,
}: {
    name: string;
    value: string;
    onChange: (v: string) => void;
    options: readonly string[];
}) {
    return (
        <div className={styles.radios}>
            {options.map((o) => (
                <label key={o} className={styles.radio}>
                    <input
                        type="radio"
                        name={name}
                        checked={value === o}
                        onChange={() => onChange(o)}
                    />
                    <span>{o}</span>
                </label>
            ))}
        </div>
    );
}

export function Section({
    number, title, children,
}: {
    number: number;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
                <span className={styles.sectionNo}>{number}</span>
                {title}
            </h2>
            <div className={styles.sectionBody}>{children}</div>
        </section>
    );
}
