import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { optIn } = await req.json();

        if (typeof optIn !== 'boolean') {
            return NextResponse.json({ error: "Invalid optIn value" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { phone: true }
        });

        if (!user?.phone && optIn) {
            return NextResponse.json({ error: "Phone number required for WhatsApp notifications" }, { status: 400 });
        }

        await prisma.user.update({
            where: { id: session.user.id },
            data: { whatsappOptIn: optIn }
        });

        return NextResponse.json({ success: true, optIn });
    } catch (error) {
        console.error("WhatsApp opt-in error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
