import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Adjust path if needed
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
try {
// Parse incoming form data
const formData = await request.formData();
const file = formData.get('file') as File;

if (!file) {
return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
}

// Read file content as text
const text = await file.text();

// Get the user's session (optional: if you're associating uploads with users)
// const session = await getServerSession(authOptions);
// const userEmail = session?.user?.email;

// Save to database (optional: associate with user)
const saved = await prisma.upload.create({
data: {
filename: file.name,
content: text,
// user: { connect: { email: userEmail } } // if users are linked
},
});

// Send text to OpenAI for summarization
const analysisRes = await openai.chat.completions.create({
model: 'gpt-4o',
messages: [
{
role: 'system',
content:
'You are an expert permit assistant. Summarize key construction permit requirements clearly.',
},
{
role: 'user',
content: `Analyze this permit text:\n\n${text}`,
},
],
});

const summary = analysisRes.choices[0].message?.content || 'No summary returned';

return NextResponse.json({
filename: file.name,
contentPreview: summary,
});
} catch (error) {
console.error('Upload error:', error);
return NextResponse.json({ error: 'Upload or analysis failed' }, { status: 500 });
}
}
