import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"
import prisma from "@/lib/prisma"

export const { handlers, signIn, signOut, auth } = NextAuth({
    trustHost: true,
    adapter: PrismaAdapter(prisma),
    secret: process.env.NEXTAUTH_SECRET,
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        CredentialsProvider({
            name: "Email",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null
                }

                const email = String(credentials.email).trim();

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
