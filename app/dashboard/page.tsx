// app/dashboard/page.tsx
import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth"; // NextAuth v5; for v4 use getServerSession(authOptions)
import { getUploadsForUser, getUploadFacetsForUser, type UploadListOpts } from "@/lib/data/uploads";

function isChecked(value: string, selected: string[] | undefined) {
  return !!selected?.includes(value);
}
function parseArrayParam(p: string | string[] | undefined): string[] | undefined {
  if (!p) return undefined;
  if (Array.isArray(p)) return p;
  return p.split(",").map((s) => s.trim()).filter(Boolean);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const session = await auth();
  // const session = await getServerSession(authOptions); // if on NextAuth v4
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId) redirect("/api/auth/signin?callbackUrl=/dashboard");

  const qp_search = typeof searchParams.search === "string" ? searchParams.search : undefined;
  const qp_sort = typeof searchParams.sort === "string" && (searchParams.sort === "oldest" || searchParams.sort === "newest")
    ? (searchParams.sort as "oldest" | "newest")
    : "newest";
  const qp_page = (() => {
    const p = Number(searchParams.page);
    return Number.isFinite(p) && p > 0 ? p : 1;
  })();
  const qp_pageSize = (() => {
    const s = Number(searchParams.pageSize);
    return Number.isFinite(s) && s > 0 ? Math.min(100, s) : 20;
  })();
  const qp_tags = parseArrayParam(searchParams.tags);
  const qp_types = parseArrayParam(searchParams.types);
  const qp_dateFrom = typeof searchParams.dateFrom === "string" ? searchParams.dateFrom : undefined;
  const qp_dateTo = typeof searchParams.dateTo === "string" ? searchParams.dateTo : undefined;
  const qp_showSummary = searchParams.summary === "1" || searchParams.summary === "true";

  const opts: UploadListOpts = {
    search: qp_search,
    sort: qp_sort,
    page: qp_page,
    pageSize: qp_pageSize,
    tags: qp_tags,
    fileTypes: qp_types,
    dateFrom: qp_dateFrom,
    dateTo: qp_dateTo,
  };

  const [{ uploads, total, page, pageSize }, facets] = await Promise.all([
    getUploadsForUser(userId!, opts),
    getUploadFacetsForUser(userId!),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const formatDateTime = (d: Date | string) => new Date(d).toLocaleString();
  const isRecentlyReplaced = (d?: Date | string | null) =>
    !!d && Date.now() - new Date(d).getTime() < 1000 * 60 * 60 * 48; // 48h

  const qs = (params: Record<string, string | undefined>) => {
    const url = new URLSearchParams();
    if (qp_search) url.set("search", qp_search);
    if (qp_sort) url.set("sort", qp_sort);
    if (qp_dateFrom) url.set("dateFrom", qp_dateFrom);
    if (qp_dateTo) url.set("dateTo", qp_dateTo);
    if (qp_tags?.length) url.set("tags", qp_tags.join(","));
    if (qp_types?.length) url.set("types", qp_types.join(","));
    if (qp_showSummary) url.set("summary", "1");
    for (const [k, v] of Object.entries(params)) if (v) url.set(k, v);
    return `?${url.toString()}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Your uploads</h1>
      <p className="mt-1 text-sm text-neutral-600">
        {total} file{total === 1 ? "" : "s"} • page {page} of {totalPages}
      </p>

      {/* Filters */}
      <form method="GET" className="mt-6 grid grid-cols-1 gap-4 rounded-2xl border p-4 md:grid-cols-12">
        <div className="md:col-span-4">
          <label className="block text-xs font-medium text-neutral-600">Search</label>
          <input type="text" name="search" defaultValue={qp_search} placeholder="Filename…" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-neutral-600">From</label>
          <input type="date" name="dateFrom" defaultValue={qp_dateFrom} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-neutral-600">To</label>
          <input type="date" name="dateTo" defaultValue={qp_dateTo} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-neutral-600">Sort</label>
          <select name="sort" defaultValue={qp_sort} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-neutral-600">Page size</label>
          <select name="pageSize" defaultValue={String(qp_pageSize)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
            {[10,20,30,50,100].map((n)=> (<option key={n} value={n}>{n}</option>))}
          </select>
        </div>

        <div className="md:col-span-6">
          <label className="block text-xs font-medium text-neutral-600">Tags</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {facets.tags.length === 0 ? (
              <span className="text-xs text-neutral-500">No tags yet</span>
            ) : (
              facets.tags.map((t) => (
                <label key={t} className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs">
                  <input type="checkbox" name="tags" value={t} defaultChecked={isChecked(t, qp_tags)} className="accent-black" />
                  <span>{t}</span>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="md:col-span-6">
          <label className="block text-xs font-medium text-neutral-600">File types</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {facets.mimeTypes.length === 0 ? (
              <span className="text-xs text-neutral-500">No file types yet</span>
            ) : (
              facets.mimeTypes.map((mt) => (
                <label key={mt} className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs">
                  <input type="checkbox" name="types" value={mt} defaultChecked={isChecked(mt, qp_types)} className="accent-black" />
                  <span>{mt}</span>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="md:col-span-12">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" name="summary" value="1" defaultChecked={qp_showSummary} className="accent-black" />
            Show summaries
          </label>
        </div>

        <div className="md:col-span-12 flex items-center gap-2">
          <button type="submit" className="rounded-xl px-3 py-2 text-sm font-medium ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50">Apply filters</button>
          <Link href="/dashboard" className="rounded-xl px-3 py-2 text-sm font-medium ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50">Reset</Link>
        </div>
      </form>

      {/* Grid */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {uploads.map((u) => (
          <div key={u.id} className="rounded-xl border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium flex items-center gap-2">
                  <span>{u.name ?? "Untitled"}</span>
                  {isRecentlyReplaced(u.replacedAt) && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
                      Recently replaced
                    </span>
                  )}
                </div>
                <div className="text-xs text-neutral-500">
                  {formatDateTime(u.createdAt as any)} • {u.mimeType || "unknown"}
                </div>
                {u.tags?.length ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {u.tags.map((t: string) => (
                      <span key={t} className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700 ring-1 ring-inset ring-neutral-200">
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null}
                {qp_showSummary && u.summary && (
                  <p className="mt-2 line-clamp-5 text-sm text-neutral-700">{u.summary}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {u.url && (
                  <a href={u.url} className="rounded-lg px-2 py-1 text-xs font-medium ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50">
                    Download
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pager */}
      <div className="mt-6 flex items-center justify-between">
        <Link href={qs({ page: String(Math.max(1, page - 1)), pageSize: String(pageSize) })} className="rounded-lg px-3 py-1.5 text-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 aria-disabled:opacity-40" aria-disabled={page <= 1}>Previous</Link>
        <div className="text-xs text-neutral-500">Page {page} of {totalPages}</div>
        <Link href={qs({ page: String(Math.min(totalPages, page + 1)), pageSize: String(pageSize) })} className="rounded-lg px-3 py-1.5 text-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 aria-disabled:opacity-40" aria-disabled={page >= totalPages}>Next</Link>
      </div>
    </div>
  );
}
