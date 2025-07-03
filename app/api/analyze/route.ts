import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
try {
const { text } = await request.json();

if (!text) {
return NextResponse.json({ error: 'No text provided' }, { status: 400 });
}

const completion = await openai.chat.completions.create({
model: 'gpt-4o',
messages: [
{
role: 'system',
content: 'You are an expert permit assistant. Summarize key construction permit requirements clearly.',
},
{
role: 'user',
content: `Analyze this permit text:\n\n${text}`,
},
],
});

const summary = completion.choices[0].message?.content || 'No summary returned';

return NextResponse.json({ summary });
} catch (error) {
console.error(error);
return NextResponse.json({ error: 'OpenAI request failed' }, { status: 500 });
}
}