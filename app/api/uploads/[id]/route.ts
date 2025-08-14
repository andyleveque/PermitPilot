import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = parseInt(params.id);
  const body = await req.json();
  const { summary, name } = body;

  try {
    const upload = await prisma.upload.update({
      where: {
        id,
        user: { email: session.user.email },
      },
      data: {
        ...(summary !== undefined && { summary }),
        ...(name !== undefined && { name }),
      },
    });

    return NextResponse.json(upload);
  } catch (error) {
    console.error('Error updating upload:', error);
    return NextResponse.json({ error: 'Failed to update upload' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = parseInt(params.id);

  try {
    await prisma.upload.delete({
      where: {
        id,
        user: { email: session.user.email },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting upload:', error);
    return NextResponse.json({ error: 'Failed to delete upload' }, { status: 500 });
  }
}
