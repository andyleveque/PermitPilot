// app/api/uploads/[id]/summary/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { summary } = body;

  const upload = await prisma.upload.update({
    where: {
      id: Number(params.id),
      user: { email: session.user.email }
    },
    data: { summary }
  });

  return NextResponse.json(upload);
}
