import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { openai } from '@/lib/openai';

export async function POST(
  req: NextRequest,
  { params }: { params: { uploadId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const uploadId = parseInt(params.uploadId);
    const upload = await prisma.upload.findUnique({
      where: { id: uploadId },
    });

    if (!upload || upload.userEmail !== session.user.email) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    }

    if (!upload.content) {
      return NextResponse.json({ error: 'No content to summarize' }, { status: 400 });
    }

    const aiSummary = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You summarize construction permit documents clearly and briefly.',
        },
        {
          role: 'user',
          content: `Summarize the following file content:\n\n${upload.content}`,
        },
      ],
    });

    const summary = aiSummary.choices[0]?.message?.content?.trim() || 'No summary generated.';

    await prisma.upload.update({
      where: { id: uploadId },
      data: { summary },
    });

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('❌ Summary generation error:', error);
    return NextResponse.json({ error: 'Failed to regenerate summary' }, { status: 500 });
  }
}
