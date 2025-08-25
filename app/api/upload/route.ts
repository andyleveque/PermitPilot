// app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth"; // If you're on NextAuth v4, swap to getServerSession(authOptions)
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // (Optional) get signed-in user
    let userEmail: string | undefined;
    try {
      const session = await auth();
      userEmail = (session as any)?.user?.email as string | undefined;
    } catch {
      // ignore if unauthenticated; make sure schema allows nullable user
    }

    // Expect multipart/form-data with a "file" field
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided (expected 'file' field)" }, { status: 400 });
    }

    const f = file as File;
    const name = f.name || "upload";
    const mimeType = f.type || "application/octet-stream";
    const size = f.size ?? 0;

    // (Optional) capture text for text/* (handy for search/summaries later)
    let content: string | null = null;
    if (mimeType.startsWith("text/")) {
      const text = await f.text();
      content = text.slice(0, 100_000); // keep it reasonable
    }

    // TODO: store bytes in S3/Vercel Blob and set `url`
    const url: string | null = null;

    const data: any = {
      name,                // REQUIRED: fixes "Argument `name` is missing"
      filename: name,      // keep if your schema also defines `filename`
      mimeType,
      size,
      url,
      content,
      summary: null,       // can be populated later by a job
      ...(userEmail ? { user: { connect: { email: userEmail } } } : {}),
    };

    const created = await prisma.upload.create({
      data,
      select: { id: true, name: true },
    });

    return NextResponse.json({ ok: true, id: created.id, name: created.name }, { status: 200 });
  } catch (e: any) {
    console.error("❌ Upload error:", e);
    return NextResponse.json({ error: e?.message ?? "Upload failed" }, { status: 500 });
  }
}
