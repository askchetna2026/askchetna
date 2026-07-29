'use client';

import { useEffect, useRef, useState } from 'react';
import { Upload, Loader2, Check } from 'lucide-react';
import styles from './AstrologerApplicationForm.module.css';

/**
 * Profile photo picker.
 *
 * Uploads immediately on selection rather than at submit, for two reasons: a
 * 5 MB image has no business travelling inside the form's JSON body, and a
 * validation failure elsewhere in a nine-section form should not cost the
 * applicant their photo.
 *
 * The preview is a local object URL, so it appears instantly rather than after
 * a round trip through storage and a signed URL.
 */
export default function PhotoUploadField({
    onUploaded,
}: {
    onUploaded: (path: string | null) => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    /** The live object URL, so it can be revoked without reading it back out of state. */
    const previewRef = useRef<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    // The last preview outlives the component otherwise — submitting the form
    // unmounts this while a blob is still held.
    useEffect(() => () => {
        if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    }, []);

    const pick = async (file: File) => {
        setUploadError(null);
        setDone(false);
        onUploaded(null);

        // Revoke the previous object URL before replacing it, otherwise each
        // re-pick leaks a blob for the life of the page. Kept out of the state
        // updater deliberately: React may call an updater more than once, and
        // creating or revoking a URL twice either leaks or kills a live preview.
        if (previewRef.current) URL.revokeObjectURL(previewRef.current);
        previewRef.current = URL.createObjectURL(file);
        setPreview(previewRef.current);

        setUploading(true);
        try {
            const body = new FormData();
            body.append('photo', file);
            const res = await fetch('/api/astrologer-applications/photo', {
                method: 'POST',
                body,
            });
            const data = await res.json();

            if (!res.ok) {
                setUploadError(data.message ?? data.error ?? 'Could not upload that image.');
                return;
            }
            onUploaded(data.path);
            setDone(true);
        } catch {
            setUploadError('Upload failed. Check your connection and try again.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className={styles.photoField}>
            <div className={styles.photoRow}>
                <div className={styles.photoPreview} aria-hidden={!preview}>
                    {preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={preview} alt="" className={styles.photoImg} />
                    ) : (
                        <Upload size={20} className={styles.photoIcon} />
                    )}
                </div>

                <div className={styles.photoActions}>
                    <button
                        type="button"
                        className={styles.photoBtn}
                        onClick={() => inputRef.current?.click()}
                        disabled={uploading}
                    >
                        {uploading && <Loader2 size={15} className={styles.spin} />}
                        {uploading ? 'Uploading…' : preview ? 'Choose a different photo' : 'Choose a photo'}
                    </button>

                    {done && !uploading && (
                        <span className={styles.photoDone}>
                            <Check size={14} /> Uploaded
                        </span>
                    )}

                    <span className={styles.hint}>
                        JPG, PNG or WebP, up to 5 MB. Converted to WebP and resized
                        automatically — location data is removed.
                    </span>
                </div>
            </div>

            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className={styles.fileInput}
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void pick(file);
                }}
            />

            {uploadError && (
                <span className={styles.error} role="alert">
                    {uploadError}
                </span>
            )}
        </div>
    );
}
