import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import AppleProvider from "next-auth/providers/apple"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"
import prisma from "@/lib/prisma"
import { rateLimit } from "@/lib/rateLimit"
// NOTE: firebase-admin is NOT imported at the top level on purpose.
//
// src/proxy.ts imports this module and runs on the Edge runtime. firebase-admin
// depends on Node built-ins (fs/http2/crypto) that Edge cannot load, and a
// static import here breaks the whole proxy module — which surfaces as a
// misleading "Proxy file must export a function named `proxy`" error and 500s
// every route. It is loaded lazily inside authorize() below, which only ever
// executes in the Node runtime of the NextAuth route handler.

/**
 * Sign in with Apple is required by App Store guideline 4.8 because the app also
 * offers Google sign-in: an app using a third-party login service must offer an
 * equivalent privacy-preserving option.
 *
 * APPLE_SECRET is a JWT that Apple caps at 6 months. When it expires, Apple
 * sign-in simply stops working with no obvious cause, so warn as the date
 * approaches. Regenerate with `npm run apple:secret`.
 *
 * Decoded by hand rather than verified: this only needs the `exp` claim, and
 * pulling in a crypto library would put it in the Edge bundle that src/proxy.ts
 * compiles into.
 */
function warnIfAppleSecretExpiring(secret: string | undefined) {
    if (!secret) return;
    try {
        const payload = JSON.parse(
            Buffer.from(secret.split('.')[1], 'base64').toString('utf8')
        );
        if (typeof payload.exp !== 'number') return;

        const daysLeft = Math.floor((payload.exp * 1000 - Date.now()) / 86_400_000);
        if (daysLeft <= 0) {
            console.error(
                `APPLE_SECRET EXPIRED ${Math.abs(daysLeft)} day(s) ago. Sign in with Apple is broken. ` +
                `Regenerate with: npm run apple:secret`
            );
        } else if (daysLeft <= 30) {
            console.warn(
                `APPLE_SECRET expires in ${daysLeft} day(s). Regenerate with: npm run apple:secret`
            );
        }
    } catch {
        console.warn('APPLE_SECRET is set but could not be decoded; it may be malformed.');
    }
}

const appleId = process.env.APPLE_ID;
const appleSecret = process.env.APPLE_SECRET;
const appleConfigured = !!(appleId && appleSecret);

warnIfAppleSecretExpiring(appleSecret);

export const { handlers, signIn, signOut, auth } = NextAuth({
    trustHost: true,
    adapter: PrismaAdapter(prisma),
    secret: process.env.NEXTAUTH_SECRET,
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        // Spread so the provider simply isn't registered until credentials
        // exist, rather than registering a broken one that fails mid-flow.
        ...(appleConfigured
            ? [AppleProvider({
                clientId: appleId!,
                clientSecret: appleSecret!,
            })]
            : []),
        CredentialsProvider({
            name: "Email",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials, request) {
                if (!credentials?.email || !credentials?.password) {
                    return null
                }

                const email = String(credentials.email).trim();

                // Brute-force / credential-stuffing protection. Throttle by both
                // the targeted account (per-email) and the source IP. Returning
                // null surfaces the same generic "invalid credentials" message,
                // so we don't reveal whether the limit or the password failed.
                let ip = "unknown";
                try {
                    const fwd = request?.headers?.get?.("x-forwarded-for");
                    if (fwd) ip = fwd.split(",")[0].trim();
                    else ip = request?.headers?.get?.("x-real-ip") || "unknown";
                } catch { /* headers unavailable */ }

                const byEmail = rateLimit(`login:email:${email.toLowerCase()}`, { limit: 10, windowMs: 15 * 60 * 1000 });
                const byIp = rateLimit(`login:ip:${ip}`, { limit: 50, windowMs: 15 * 60 * 1000 });
                if (!byEmail.allowed || !byIp.allowed) {
                    return null
                }

                const user = await prisma.user.findFirst({
                    where: {
                        email: {
                            equals: email,
                            mode: 'insensitive'
                        }
                    }
                })

                if (!user || !user.password) {
                    return null
                }

                const isValidPassword = await bcrypt.compare(
                    credentials.password as string,
                    user.password
                )

                if (!isValidPassword) {
                    return null
                }

                const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];
                const isAdmin = !!user.email && adminEmails.includes(user.email.toLowerCase());

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                    isAdmin: isAdmin
                }
            }
        }),
        // Phone / OTP sign-in for the native apps.
        //
        // The OTP challenge itself happens on-device via Firebase Phone Auth; by
        // the time we get here the client already holds a Firebase ID token that
        // cryptographically proves ownership of the number. This provider's only
        // job is to validate that token and map it to one of our users.
        //
        // Implemented as a Credentials provider on purpose: it reuses the
        // existing JWT session strategy, the jwt/session callbacks, and the
        // signIn event below — so phone users get the welcome-credit grant with
        // no extra code.
        CredentialsProvider({
            id: "phone-otp",
            name: "Phone",
            credentials: {
                idToken: { label: "Firebase ID token", type: "text" }
            },
            async authorize(credentials, request) {
                if (!credentials?.idToken) {
                    return null
                }

                // Cheap IP throttle in front of the (network-bound) Firebase
                // verification call, mirroring the email provider above. Brute
                // force isn't feasible against a signed token, so this is really
                // about not letting anyone burn our Firebase quota.
                let ip = "unknown";
                try {
                    const fwd = request?.headers?.get?.("x-forwarded-for");
                    if (fwd) ip = fwd.split(",")[0].trim();
                    else ip = request?.headers?.get?.("x-real-ip") || "unknown";
                } catch { /* headers unavailable */ }

                const byIp = rateLimit(`phone-login:ip:${ip}`, { limit: 30, windowMs: 15 * 60 * 1000 });
                if (!byIp.allowed) {
                    return null
                }

                let phone: string;
                try {
                    // Lazy import keeps firebase-admin out of the Edge bundle
                    // (see the note at the top of this file).
                    const { verifyPhoneIdToken, isFirebaseConfigured } = await import("@/lib/firebaseAdmin");

                    if (!isFirebaseConfigured()) {
                        console.error("Phone sign-in attempted but Firebase Admin is not configured.");
                        return null
                    }

                    // Rejects tokens that aren't from the phone provider, or whose
                    // OTP was completed too long ago to count as fresh proof.
                    ({ phone } = await verifyPhoneIdToken(String(credentials.idToken)));
                } catch (error) {
                    console.warn("Phone sign-in rejected:", error instanceof Error ? error.message : error);
                    return null
                }

                const user = await prisma.user.findUnique({
                    where: { phone }
                })

                // No account for this number yet. The client is expected to have
                // called /api/auth/phone/check first and run the signup step, so
                // reaching here means the flow was skipped — fail closed rather
                // than silently creating an account with no email.
                if (!user) {
                    return null
                }

                const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];
                const isAdmin = !!user.email && adminEmails.includes(user.email.toLowerCase());

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                    isAdmin: isAdmin
                }
            }
        }),
        // Native Google sign-in, for the apps only.
        //
        // The web GoogleProvider above cannot work inside a WebView: Google
        // refuses to complete OAuth there (the `disallowed_useragent`
        // anti-phishing policy) and escapes to the system browser, where the
        // session cookie lands in the wrong cookie jar and the app stays signed
        // out. The apps run Google sign-in through the native SDK instead and
        // exchange the resulting Firebase ID token here.
        CredentialsProvider({
            id: "google-native",
            name: "Google",
            credentials: {
                idToken: { label: "Firebase ID token", type: "text" }
            },
            async authorize(credentials, request) {
                if (!credentials?.idToken) {
                    return null
                }

                let ip = "unknown";
                try {
                    const fwd = request?.headers?.get?.("x-forwarded-for");
                    if (fwd) ip = fwd.split(",")[0].trim();
                    else ip = request?.headers?.get?.("x-real-ip") || "unknown";
                } catch { /* headers unavailable */ }

                const byIp = rateLimit(`google-native:ip:${ip}`, { limit: 30, windowMs: 15 * 60 * 1000 });
                if (!byIp.allowed) {
                    return null
                }

                let identity;
                try {
                    // Lazy import keeps firebase-admin out of the Edge bundle
                    // (see the note at the top of this file).
                    const { verifyGoogleIdToken, isFirebaseConfigured } = await import("@/lib/firebaseAdmin");

                    if (!isFirebaseConfigured()) {
                        console.error("Native Google sign-in attempted but Firebase Admin is not configured.");
                        return null
                    }

                    // Asserts the provider is google.com AND that Google verified
                    // the email — matching accounts by an unverified address would
                    // let someone sign into an account they don't own.
                    identity = await verifyGoogleIdToken(String(credentials.idToken));
                } catch (error) {
                    console.warn("Native Google sign-in rejected:", error instanceof Error ? error.message : error);
                    return null
                }

                // Link by verified email. Safe here precisely because Google
                // asserted ownership of the address; this is the same guarantee
                // the web OAuth flow relies on.
                let user = await prisma.user.findFirst({
                    where: { email: { equals: identity.email, mode: 'insensitive' } }
                })

                if (!user) {
                    user = await prisma.user.create({
                        data: {
                            email: identity.email,
                            name: identity.name,
                            image: identity.picture,
                            // No password, same as any OAuth-created account.
                            password: null,
                            emailVerified: new Date(),
                        }
                    })
                } else if (!user.image && identity.picture) {
                    // Backfill only. Never overwrite a name the user has since
                    // edited with whatever Google currently reports.
                    user = await prisma.user.update({
                        where: { id: user.id },
                        data: { image: identity.picture }
                    })
                }

                const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];
                const isAdmin = !!user.email && adminEmails.includes(user.email.toLowerCase());

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                    isAdmin: isAdmin
                }
            }
        })
    ],
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/login",
        error: "/login",
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;

                // Server-side check for admin status
                const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];
                const userEmail = session.user.email?.toLowerCase();

                session.user.isAdmin = !!userEmail && adminEmails.includes(userEmail);
            }
            return session
        },
    },
    events: {
        async signIn({ user }) {
            try {
                if (user && user.id) {
                    const existingBonus = await prisma.creditPack.findFirst({
                        where: { userId: user.id, packType: "WELCOME_BONUS" }
                    });
                    if (!existingBonus) {
                        const welcomeBonusSetting = await prisma.serviceCost.findUnique({
                            where: { key: "WELCOME_BONUS" }
                        });
                        const bonusAmount = welcomeBonusSetting ? welcomeBonusSetting.credits : 10;

                        await prisma.creditPack.create({
                            data: {
                                userId: user.id,
                                packType: "WELCOME_BONUS",
                                questionsTotal: bonusAmount,
                                questionsUsed: 0,
                                paymentId: "FREE_WELCOME_BONUS",
                                amount: 0
                            }
                        });
                        await prisma.creditTransaction.create({
                            data: {
                                userId: user.id,
                                amount: bonusAmount,
                                description: `Welcome Bonus - ${bonusAmount} Free Credits`,
                                metadata: { source: "auth_event" }
                            }
                        });
                    }
                }
            } catch (error) {
                console.error("Error granting welcome bonus:", error);
            }
        }
    }
})

// Add type declaration for isAdmin
declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            isAdmin?: boolean;
            name?: string | null;
            email?: string | null;
            image?: string | null;
        }
    }
}
