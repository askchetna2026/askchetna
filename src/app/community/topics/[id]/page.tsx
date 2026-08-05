'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, MessageSquare, Clock, User, Send } from 'lucide-react';
import styles from './page.module.css';

interface Post {
    id: string;
    content: string;
    user: {
        name: string;
        image: string | null;
    };
    createdAt: string;
}

interface Topic {
    id: string;
    title: string;
    content: string;
    user: {
        name: string;
        image: string | null;
    };
    posts: Post[];
    createdAt: string;
}

export default function TopicDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data: session } = useSession();
    const [topic, setTopic] = useState<Topic | null>(null);
    const [loading, setLoading] = useState(true);
    const [reply, setReply] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchTopic();
    }, [id]);

    const fetchTopic = async () => {
        try {
            const res = await fetch(`/api/community/topics/${id}`);
            if (res.ok) {
                const data = await res.json();
                setTopic(data);
            }
        } catch (error) {
            console.error('Failed to fetch topic:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reply || submitting) return;

        setSubmitting(true);
        try {
            const res = await fetch('/api/community/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: reply, topicId: id }),
            });

            if (res.ok) {
                setReply('');
                fetchTopic(); // Refresh to show new reply
            }
        } catch (error) {
            console.error('Failed to post reply:', error);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className={styles.loader}>
                <div style={{ width: '40px', height: '40px', border: '3px solid rgba(181, 137, 46, 0.1)', borderTopColor: 'var(--accent-gold)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!topic) {
        return (
            <div className={styles.container}>
                <p>Topic not found.</p>
                <Link href="/community" className={styles.backLink}>Back to Community</Link>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <Link href="/community" className={styles.backLink}>
                <ChevronLeft size={16} /> Back to Community
            </Link>

            <article className={styles.mainPost}>
                <h1 className={styles.topicTitle}>{topic.title}</h1>

                <div className={styles.postMeta}>
                    <div className={styles.authorInfo}>
                        {topic.user.image ? (
                            <Image src={topic.user.image} alt={topic.user.name} width={40} height={40} className={styles.avatar} />
                        ) : (
                            <div className={styles.avatar} style={{ background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <User size={20} color="var(--secondary)" />
                            </div>
                        )}
                        <div>
                            <span className={styles.authorName}>{topic.user.name}</span>
                            <span className={styles.date}>
                                <Clock size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                                {new Date(topic.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                        </div>
                    </div>
                </div>

                <div className={styles.content}>
                    {topic.content}
                </div>
            </article>

            <section className={styles.repliesSection}>
                <h2 className={styles.repliesHeader}>
                    Replies ({topic.posts.length})
                </h2>

                <div className={styles.repliesList}>
                    {topic.posts.length > 0 ? (
                        topic.posts.map((post) => (
                            <div key={post.id} className={styles.replyCard}>
                                <div className={styles.replyMeta}>
                                    {post.user.image ? (
                                        <Image src={post.user.image} alt={post.user.name} width={24} height={24} className={styles.avatarMini} style={{ borderRadius: '50%' }} />
                                    ) : (
                                        <User size={14} color="var(--accent-gold)" />
                                    )}
                                    <span style={{ fontWeight: 600, color: 'var(--foreground)', fontSize: '0.9rem' }}>{post.user.name}</span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--secondary)' }}>• {new Date(post.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className={styles.replyContent}>
                                    {post.content}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p style={{ opacity: 0.5, fontStyle: 'italic' }}>No replies yet. Join the conversation below.</p>
                    )}
                </div>

                {session ? (
                    <form className={styles.replyForm} onSubmit={handleReply}>
                        <textarea
                            className={styles.textarea}
                            placeholder="Share your perspective..."
                            value={reply}
                            onChange={(e) => setReply(e.target.value)}
                            required
                        />
                        <button
                            type="submit"
                            className={styles.submitBtn}
                            disabled={submitting || !reply}
                        >
                            {submitting ? "Sending..." : (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    Post Reply <Send size={16} />
                                </span>
                            )}
                        </button>
                    </form>
                ) : (
                    <div className={styles.guestPrompt}>
                        <MessageSquare size={24} color="var(--accent-gold)" style={{ marginBottom: '12px', opacity: 0.5 }} />
                        <p>Have something to add?</p>
                        <Link href={`/login?callbackUrl=/community/topics/${id}`} className={styles.loginLink}>
                            Sign in to join the conversation →
                        </Link>
                    </div>
                )}
            </section>
        </div>
    );
}
