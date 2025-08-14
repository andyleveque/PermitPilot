import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '5');
  const searchQuery = searchParams.get('search') || '';
  const fileType = searchParams.get('fileType') || 'all';
  const sortOrder = searchParams.get('sort') === 'oldest' ? 'asc' : 'desc';

  const skip = (page - 1) * pageSize;

  const fileTypeConditions: Record<string, string[]> = {
    pdf: ['pdf'],
    doc: ['doc', 'docx'],
    image: ['jpg', 'jpeg', 'png', 'gif'],
    excel: ['xls', 'xlsx', 'csv'],
    txt: ['txt'],
  };

  const extensions = fileTypeConditions[fileType] || [];

  const allConditions = {
    user: { email: session.user.email },
    ...(searchQuery && {
      filename: {
        contains: searchQuery,
        mode: 'insensitive',
      },
    }),
    ...(fileType !== 'all' && {
      filename: {
        endsWith: extensions.length === 1 ? `.${extensions[0]}` : undefined,
        in: extensions.map(ext => ({
          endsWith: `.${ext}`,
        })),
        mode: 'insensitive',
      },
    }),
  };

  const [uploads, total] = await Promise.all([
    prisma.upload.findMany({
      where: allConditions,
      orderBy: { createdAt: sortOrder },
      skip,
      take: pageSize,
    }),
    prisma.upload.count({
      where: allConditions,
    }),
  ]);

  return NextResponse.json({ uploads, total });
}
