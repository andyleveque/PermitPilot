// lib/data/uploads.ts
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export type UploadListOpts = {
  search?: string;
  page?: number;
  pageSize?: number;
  sort?: "newest" | "oldest";
  tags?: string[];
  fileTypes?: string[];
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
};

const _getUploadsForUserCached = unstable_cache(
  async (userId: string, opts: UploadListOpts = {}) => {
    const page = Math.max(1, opts.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));
    const sort = opts.sort ?? "newest";

    const where: any = { userId };
    if (opts.search) where.name = { contains: opts.search, mode: "insensitive" };
    if (opts.tags?.length) where.tags = { hasSome: opts.tags };
    if (opts.fileTypes?.length) where.mimeType = { in: opts.fileTypes };
    if (opts.dateFrom || opts.dateTo) {
      where.createdAt = {};
      if (opts.dateFrom) (where.createdAt as any).gte = new Date(opts.dateFrom + "T00:00:00.000Z");
      if (opts.dateTo) (where.createdAt as any).lte = new Date(opts.dateTo + "T23:59:59.999Z");
    }

    const orderBy = sort === "oldest" ? { createdAt: "asc" } : { createdAt: "desc" };

    const [uploads, total] = await Promise.all([
      prisma.upload.findMany({
        where,
        orderBy,
        take: pageSize,
        skip: (page - 1) * pageSize,
        select: {
          id: true,
          name: true,
          size: true,
          mimeType: true,
          url: true,
          tags: true,
          createdAt: true,
          replacedAt: true,
          summary: true,
        },
      }),
      prisma.upload.count({ where }),
    ]);

    return { uploads, total, page, pageSize };
  },
  ["uploads-fn"],
  { tags: ["uploads"] }
);

export async function getUploadsForUser(userId: string, opts: UploadListOpts = {}) {
  return _getUploadsForUserCached(userId, opts);
}

export async function getUploadFacetsForUser(userId: string) {
  const rows = await prisma.upload.findMany({ where: { userId }, select: { tags: true, mimeType: true } });
  const tags = new Set<string>();
  const mimeTypes = new Set<string>();
  for (const r of rows) {
    if (Array.isArray(r.tags)) for (const t of r.tags) if (t) tags.add(t);
    if (r.mimeType) mimeTypes.add(r.mimeType);
  }
  return { tags: Array.from(tags).sort(), mimeTypes: Array.from(mimeTypes).sort() };
}
