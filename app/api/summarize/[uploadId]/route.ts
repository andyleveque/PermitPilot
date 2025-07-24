import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { openai } from '@/lib/openai'; // make sure this file exists

export async function POST(req: NextRequest, { params }: { params: { uploadId: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const upload = await prisma.upload.findUnique({
      where: { id: parseInt(params.uploadId) },
    });

    if (!upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
    }

    const aiSummary = await openai.chat.completions.create({
      messages: [
        {
          role: "user",
          content: `Summarize the following permit information:\n\n${upload.content}`,
        },
      ],
      model: "gpt-4",
    });

    const summary = aiSummary.choices[0]?.message?.content || "No summary generated";

    await prisma.upload.update({
      where: { id: upload.id },
      data: { summary },
    });

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("❌ AI summary regeneration error:", error);
    return NextResponse.json({ error: "Failed to regenerate summary" }, { status: 500 });
  }
}
