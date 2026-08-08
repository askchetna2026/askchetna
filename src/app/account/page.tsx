import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import AccountSettingsClient from './AccountSettingsClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Account Settings | AskChetna',
    description: 'Manage your AskChetna account, notifications and data.',
    robots: { index: false, follow: false },
};

/**
 * Account settings.
 *
 * Exists primarily because both stores require an in-app account deletion path:
 * App Store guideline 5.1.1(v) and Google Play's data deletion policy. Neither
 * accepts "email us to delete your account".
 *
 * Also hosts notification preferences (needed so push permission has somewhere
 * to be turned off) and phone linking.
 */
export default async function AccountPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect('/login?callbackUrl=%2Faccount');
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            email: true,
            name: true,
            phone: true,
            password: true,
            isSubscribed: true,
            whatsappOptIn: true,
            createdAt: true,
        },
    });

    if (!user) {
        redirect('/login');
    }

    return (
        <AccountSettingsClient
            email={user.email}
            name={user.name}
            phone={user.phone}
            // Only whether a password exists is sent, never the hash. Password
            // accounts must reauthenticate before deletion; Google and phone
            // accounts have nothing to confirm against.
            hasPassword={!!user.password}
            isSubscribed={user.isSubscribed}
            whatsappOptIn={user.whatsappOptIn}
            memberSince={user.createdAt.toISOString()}
        />
    );
}
