import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
const session = await getServerSession(authOptions);

if (!session?.user?.email) {
return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
}

const uploads = await prisma.upload.findMany({
where: {
user: {
email: session.user.email,
},
},
orderBy: {
createdAt: 'desc',
},
});

return NextResponse.json({ uploads });
}