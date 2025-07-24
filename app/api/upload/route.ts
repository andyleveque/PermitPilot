import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import OpenAI from 'openai';

const openai = new OpenAI();

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = session.user.email;

    // Ensure the user exists or create them
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email },
    });

    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: 'Invalid file uploaded' }, { status: 400 });
    }

    const content = await file.text();
    const filename = (file as File).name ?? 'unknown.txt';

    // Attempt AI summary (optional)
    let summary = '';
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Summarize the key information in a construction permit document.',
          },
          {
            role: 'user',
            content,
          },
        ],
      });

      summary = completion.choices[0]?.message?.content ?? '';
    } catch (error) {
      console.warn('⚠️ AI summary failed:', error);
    }

    const upload = await prisma.upload.create({
      data: {
        filename,
        content,
        summary,
        user: {
          connect: { email },
        },
      },
    });

    return NextResponse.json({ upload });
  } catch (error) {
    console.error('❌ Upload error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
