import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { uploads: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      uploads: user.uploads.map((u) => ({
        id: u.id,
        filename: u.filename,
        content: u.content,
        summary: u.summary,
        createdAt: u.createdAt,
        downloadUrl: `/api/download/${u.id}`,
      })),
    });
  } catch (error) {
    console.error('❌ Error fetching uploads:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
