import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const uploadId = Number(params.id);

  const upload = await prisma.upload.findUnique({
    where: { id: uploadId },
    include: { user: true },
  });

  if (!upload || upload.user.email !== session.user.email) {
    return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
  }

  await prisma.upload.delete({
    where: { id: uploadId },
  });

  return NextResponse.json({ message: 'Upload deleted' });
}
