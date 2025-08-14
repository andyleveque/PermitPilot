import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import archiver from 'archiver';
import path from 'path';
import fs from 'fs';

export const runtime = 'nodejs'; // ensure Node runtime for streams

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get('ids') || '';
  const ids = idsParam
    .split(',')
    .map((s) => parseInt(s, 10))
    .filter((n) => !isNaN(n));

  if (ids.length === 0) {
    return new Response(JSON.stringify({ error: 'No ids provided' }), { status: 400 });
  }

  // Only zip files that belong to the user
  const uploads = await prisma.upload.findMany({
    where: { id: { in: ids }, user: { email: session.user.email } },
  });

  if (uploads.length === 0) {
    return new Response(JSON.stringify({ error: 'No files found' }), { status: 404 });
  }

  // Build a web ReadableStream and feed archiver output into it
  const stream = new ReadableStream({
    start(controller) {
      const archive = archiver('zip', { zlib: { level: 9 } });

      archive.on('data', (chunk) => controller.enqueue(chunk));
      archive.on('end', () => controller.close());
      archive.on('warning', (err) => {
        console.warn('archiver warning:', err);
      });
      archive.on('error', (err) => {
        console.error('archiver error:', err);
        controller.error(err);
      });

      // Add files
      for (const u of uploads) {
        if (!u.url) continue;
        // u.url like /uploads/filename.ext
        const rel = u.url.replace(/^\//, ''); // remove leading slash
        const filePath = path.join(process.cwd(), 'public', rel);

        if (fs.existsSync(filePath)) {
          // Prefer original display name if present
          const entryName = u.name || path.basename(filePath);
          archive.file(filePath, { name: entryName });
        }
      }

      archive.finalize().catch((e) => {
        console.error('archive finalize error:', e);
        controller.error(e);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="permitpilot-selected.zip"`,
    },
  });
}
