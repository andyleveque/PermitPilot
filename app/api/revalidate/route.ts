// app/api/revalidate/route.ts
import { revalidateTag } from "next/cache";

export async function POST(req: Request) {
  try {
    const { tag } = await req.json();
    if (!tag || typeof tag !== "string") {
      return new Response(JSON.stringify({ error: "Missing or invalid tag" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    revalidateTag(tag);
    return new Response(JSON.stringify({ revalidated: true, tag }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Bad request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
