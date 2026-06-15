import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Calendar, Clock, ArrowLeft } from 'lucide-react';
import prisma from '@/lib/prisma';
import BlogShareButton from '@/components/BlogShareButton';
import DisclaimerNote from '@/components/DisclaimerNote';
import { absoluteUrl } from '@/lib/site';
import styles from '../Blog.module.css';

export const revalidate = 300;

async function getPost(id: string) {
    try {
        return await prisma.blogPost.findUnique({ where: { id } });
    } catch (error) {
        console.error('Failed to load blog post:', error);
        return null;
    }
}

const excerpt = (content: string, len = 155) => {
    const clean = content.replace(/\s+/g, ' ').trim();
    return clean.length > len ? `${clean.slice(0, len - 1)}…` : clean;
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const post = await getPost(id);
    if (!post) return { title: 'Post Not Found | AskChetna' };

    const description = excerpt(post.content);
    return {
        title: `${post.title} | AskChetna Blog`,
        description,
        alternates: { canonical: absoluteUrl(`/blog/${post.id}`) },
        openGraph: {
            title: post.title,
            description,
            type: 'article',
            url: absoluteUrl(`/blog/${post.id}`),
            publishedTime: new Date(post.createdAt).toISOString(),
        },
    };
}

const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

const formatTime = (date: Date) =>
    new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

export default async function BlogPostPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const post = await getPost(id);
    if (!post) notFound();

    const articleSchema = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.title,
        datePublished: new Date(post.createdAt).toISOString(),
        dateModified: new Date(post.updatedAt ?? post.createdAt).toISOString(),
        author: { '@type': 'Organization', name: 'AskChetna' },
        publisher: { '@type': 'Organization', name: 'AskChetna' },
        mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(`/blog/${post.id}`) },
        description: excerpt(post.content),
    };

    return (
        <main className={styles.main}>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
            />

            <div className={styles.container}>
                <div className={styles.detailView}>
                    <Link href="/blog" className={styles.backButton}>
                        <ArrowLeft size={18} />
                        <span>Back to Blogs</span>
                    </Link>

                    <div className={styles.fullPost}>
                        <div className={styles.detailMeta}>
                            <div className={styles.metaIcon}>
                                <Calendar size={16} />
                                <span>{formatDate(post.createdAt)}</span>
                            </div>
                            <div className={styles.metaIcon}>
                                <Clock size={16} />
                                <span>{formatTime(post.createdAt)}</span>
                            </div>
                        </div>
                        <h1 className={styles.detailTitle}>{post.title}</h1>

                        <BlogShareButton title={post.title} />

                        <div className={styles.fullContent}>
                            {post.content.split('\n').map((para, i) => (
                                <p key={i}>{para}</p>
                            ))}
                        </div>

                        <BlogShareButton title={post.title} />
                    </div>

                    <DisclaimerNote />
                </div>
            </div>
        </main>
    );
}
