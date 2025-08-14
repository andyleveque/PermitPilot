import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { writeFile } from 'fs/promises';
import path from 'path';
import { mkdir, existsSync } from 'fs';

export async function POST(req: Request, { params }: { params: { uploadId: string } }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const uploadId = parseInt(params.uploadId);
  if (isNaN(uploadId)) {
    return NextResponse.json({ error: 'Invalid upload ID' }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const upload = await prisma.upload.findUnique({
    where: { id: uploadId },
    include: { user: true },
  });

  if (!upload || upload.user.email !== session.user.email) {
    return NextResponse.json({ error: 'Not found or access denied' }, { status: 404 });
  }

  // Save new file to disk
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }

  const newFileName = `${Date.now()}-${file.name}`;
  const filePath = path.join(uploadDir, newFileName);
  await writeFile(filePath, buffer);

  const newUrl = `/uploads/${newFileName}`;

  // Update DB record
  const updated = await prisma.upload.update({
    where: { id: uploadId },
    data: {
      name: file.name,
      url: newUrl,
      createdAt: new Date(), // Optional: refresh timestamp if treating as new
    },
  });

  return NextResponse.json(updated); // return updated upload
}
