import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { phone: true, whatsappOptIn: true }
        });

        if (!user) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error('Account GET error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { name, phone } = body;

        // Clean up phone number: remove non-digits, perhaps format.
        // For simplicity, just store it as provided by the user.
        // If they want to use WhatsApp, they should include country code (e.g., +1)
        const cleanPhone = phone ? phone.trim() : null;

        const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data: {
                name: name ? name.trim() : null,
                phone: cleanPhone,
            }
        });

        return NextResponse.json({ 
            success: true, 
            user: { 
                name: updatedUser.name, 
                phone: updatedUser.phone 
            } 
        });

    } catch (error) {
        console.error('Account update error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
