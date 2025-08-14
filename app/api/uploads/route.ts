import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

const EXT_GROUPS: Record<string, string[]> = {
  pdf: ['pdf'],
  doc: ['doc', 'docx'],
  image: ['jpg', 'jpeg', 'png', 'gif'],
  excel: ['xls', 'xlsx', 'csv'],
  txt: ['txt'],
};

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const fileType = (searchParams.get('fileType') || 'all').toLowerCase();
  const search = (searchParams.get('search') || '').trim().toLowerCase();

  // Build where clause
  const where: any = {
    user: { email: session.user.email },
  };

  if (search) {
    // case-insensitive contains on filename
    where.name = { contains: search, mode: 'insensitive' };
  }

  if (fileType !== 'all') {
    const exts = EXT_GROUPS[fileType];
    if (exts?.length) {
      // match by filename extension
      where.AND = [
        where.name
          ? { name: where.name }
          : {}, // keep search if already set
        {
          OR: exts.map((ext) => ({
            name: { endsWith: `.${ext}`, mode: 'insensitive' },
          })),
        },
      ];
      delete where.name;
    }
  }

  // Only fetch ids to keep the payload small
  const rows = await prisma.upload.findMany({
    where,
    select: { id: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    ids: rows.map((r) => r.id),
    total: rows.length,
  });
}
