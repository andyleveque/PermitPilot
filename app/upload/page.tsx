// app/upload/page.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Toaster, toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

type ItemStatus = "queued" | "uploading" | "success" | "error" | "canceled";

interface UploadItem {
  id: string;
  file: File;
  progress: number; // 0..100
  status: ItemStatus;
  error?: string;
}

// === Configuration ===
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB
const ACCEPT: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "text/plain": [".txt"],
  "text/csv": [".csv"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-powerpoint": [".ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
};
const ACCEPT_READABLE = "PDF, DOC/DOCX, TXT, CSV, XLS/XLSX, PPT/PPTX, PNG, JPG";

const MAX_CONCURRENT = 3;

const AUTO_NAVIGATE_ON_COMPLETE = true;
const DASHBOARD_PATH = "/dashboard";

export default function UploadPage() {
  const router = useRouter();
  const [items, setItems] = useState<UploadItem[]>([]);

  const xhrMapRef = useRef<Map<string, XMLHttpRequest>>(new Map());
  const activeIdsRef = useRef<Set<string>>(new Set());
  const itemsRef = useRef<UploadItem[]>(items);
  const hadAnySuccessRef = useRef(false);

  useEffect(() => {
    itemsRef.current = items;

    if (items.some((it) => it.status === "success")) {
      hadAnySuccessRef.current = true;
    }

    pumpQueue();

    if (AUTO_NAVIGATE_ON_COMPLETE) {
      const hasInFlight = items.some((it) => it.status === "queued" || it.status === "uploading"));
      if (!hasInFlight && hadAnySuccessRef.current) {
        setTimeout(() => {
          router.push(DASHBOARD_PATH);
        }, 300);
      }
    }
  }, [items, router]);

  useEffect(() => {
    router.prefetch(DASHBOARD_PATH);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatBytes = useCallback((bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
  }, []);

  const humanizeRejection = useCallback((rej: FileRejection) => {
    const name = rej.file.name;
    const reasons = rej.errors
      .map((e) => {
        switch (e.code) {
          case "file-invalid-type":
            return `Unsupported type`;
          case "file-too-large":
            return `Too large (> ${Math.round(MAX_BYTES / (1024 * 1024))} MB)`;
          case "file-too-small":
            return `Too small`;
          case "too-many-files":
            return `Too many files`;
          default:
            return e.message || "Rejected";
        }
      })
      .join(", ");
    return `${name} — ${reasons}`;
  }, []);

  function pumpQueue() {
    const active = activeIdsRef.current.size;
    const canStart = Math.max(0, MAX_CONCURRENT - active);
    if (canStart === 0) return;
    const queued = itemsRef.current.filter((it) => it.status === "queued").slice(0, canStart);
    queued.forEach((it) => startUpload(it));
  }

  async function revalidateUploadsTag() {
    try {
      await fetch("/api/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag: "uploads" }),
      });
    } catch (e) {
      console.error("Revalidate call failed", e);
    }
  }

  const startUpload = useCallback((item: UploadItem) => {
    if (activeIdsRef.current.has(item.id)) return;

    activeIdsRef.current.add(item.id);

    setItems((prev) =>
      prev.map((it) =>
        it.id === item.id ? { ...it, status: "uploading", progress: 0, error: undefined } : it
      )
    );

    const formData = new FormData();
    formData.append("file", item.file); // adjust if your API expects a different key

    const xhr = new XMLHttpRequest();
    xhrMapRef.current.set(item.id, xhr);

    xhr.open("POST", "/api/upload");

    xhr.upload.onprogress = (evt) => {
      if (!evt.lengthComputable) return;
      const pct = Math.round((evt.loaded / evt.total) * 100);
      setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, progress: pct } : it)));
    };

    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        xhrMapRef.current.delete(item.id);
        activeIdsRef.current.delete(item.id);

        if (xhr.status >= 200 && xhr.status < 300) {
          setItems((prev) =>
            prev.map((it) =>
              it.id === item.id ? { ...it, status: "success", progress: 100 } : it
            )
          );
          toast.success(`Uploaded ${item.file.name}`);
          revalidateUploadsTag();
        } else {
          let msg = "Upload failed";
          try {
            const parsed = JSON.parse(xhr.responseText);
            if (parsed?.error) msg = parsed.error;
          } catch {
            msg = xhr.responseText || msg;
          }
          setItems((prev) =>
            prev.map((it) => (it.id === item.id ? { ...it, status: "error", error: msg } : it))
          );
          toast.error(`${item.file.name}: ${msg}`);
        }

        pumpQueue();
      }
    };

    xhr.onerror = () => {
      xhrMapRef.current.delete(item.id);
      activeIdsRef.current.delete(item.id);
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, status: "error", error: "Network error" } : it))
      );
      toast.error(`${item.file.name}: Network error`);
      pumpQueue();
    };

    xhr.onabort = () => {
      xhrMapRef.current.delete(item.id);
      activeIdsRef.current.delete(item.id);
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, status: "canceled", error: undefined } : it))
      );
      toast(`Canceled ${item.file.name}`);
      pumpQueue();
    };

    xhr.send(formData);
  }, []);

  const cancelUpload = useCallback((id: string) => {
    const xhr = xhrMapRef.current.get(id);
    if (xhr) xhr.abort();
  }, []);

  const retryUpload = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, status: "queued", progress: 0, error: undefined } : it))
    );
    // effect will pump the queue
  }, []);

  const removeItem = useCallback((id: string) => {
    const xhr = xhrMapRef.current.get(id);
    if (xhr) xhr.abort();
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setItems((prev) => prev.filter((it) => it.status === "uploading" || it.status === "queued"));
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!acceptedFiles?.length) return;
    const newItems: UploadItem[] = acceptedFiles.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
      file,
      progress: 0,
      status: "queued",
    }));
    setItems((prev) => [...newItems, ...prev]);
    // queue pumps via effect
  }, []);

  const onDropRejected = useCallback((rejections: FileRejection[]) => {
    if (!rejections?.length) return;
    const lines = rejections.map(humanizeRejection).join("\\n"); // keep as a single-line string literal
    toast.error(<span style={{ whiteSpace: "pre-wrap" }}>{lines}</span>, { duration: 7000 });
  }, [humanizeRejection]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    onDropRejected,
    noClick: true,
    multiple: true,
    accept: ACCEPT,
    maxSize: MAX_BYTES,
  });

  const hasItems = items.length > 0;
  const anyUploading = useMemo(() => items.some((it) => it.status === "uploading"), [items]);
  const anySuccess = useMemo(() => items.some((it) => it.status === "success"), [items]);
  const allSettled = useMemo(
    () => items.length > 0 && items.every((it) => it.status !== "queued" && it.status !== "uploading"),
    [items]
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Toaster position="top-right" />

      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Upload</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Drag & drop files below, or use the button to pick multiple files.
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Allowed: {ACCEPT_READABLE} • Max {Math.round(MAX_BYTES / (1024 * 1024))} MB each • Up to {MAX_CONCURRENT} uploading at once
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasItems && (
            <button
              type="button"
              onClick={clearCompleted}
              className="rounded-xl px-3 py-2 text-sm font-medium ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 disabled:opacity-50"
              disabled={anyUploading}
              title={anyUploading ? "Finish uploads before clearing" : "Remove completed items"}
            >
              Clear completed
            </button>
          )}
          {allSettled && anySuccess && (
            <button
              type="button"
              onClick={() => router.push(DASHBOARD_PATH)}
              className="rounded-xl px-3 py-2 text-sm font-medium ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50"
              title="View uploaded files on your dashboard"
            >
              View on Dashboard
            </button>
          )}
        </div>
      </div>

      <div
        {...getRootProps({
          className:
            "mt-6 rounded-2xl border border-dashed p-8 transition-colors " +
            (isDragActive ? "border-blue-500 bg-blue-50" : "border-neutral-300 hover:border-neutral-400"),
        })}
        aria-label="File drop zone"
      >
        <input {...getInputProps()} aria-label="Upload files" />

        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-12 w-12 opacity-60" aria-hidden>
            <path d="M12 2a5 5 0 00-5 5v3H6a4 4 0 000 8h12a4 4 0 000-8h-1V7a5 5 0 00-5-5zm-1 13.586V9a1 1 0 112 0v6.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L11 15.586z" />
          </svg>

          <div className="space-y-1">
            <p className="text-base font-medium">
              {isDragActive ? "Drop the files here" : "Drag & drop your files here"}
            </p>
            <p className="text-sm text-neutral-500">or</p>
          </div>

          <button
            type="button"
            onClick={open}
            className="rounded-xl px-4 py-2 text-sm font-medium shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50"
          >
            Choose files
          </button>
        </div>
      </div>

      {hasItems && (
        <ul className="mt-8 space-y-4">
          {items.map((it) => (
            <li key={it.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{it.file.name}</div>
                  <div className="text-xs text-neutral-500">
                    {formatBytes(it.file.size)} • {it.file.type || "Unknown type"}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {it.status === "uploading" && (
                    <button
                      type="button"
                      onClick={() => cancelUpload(it.id)}
                      className="rounded-lg px-2 py-1 text-xs font-medium ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50"
                    >
                      Cancel
                    </button>
                  )}
                  {it.status === "error" && (
                    <button
                      type="button"
                      onClick={() => retryUpload(it.id)}
                      className="rounded-lg px-2 py-1 text-xs font-medium ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50"
                    >
                      Retry
                    </button>
                  )}
                  {it.status !== "uploading" && (
                    <button
                      type="button"
                      onClick={() => removeItem(it.id)}
                      className="rounded-lg px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-200 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3">
                {it.status === "uploading" && (
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-neutral-600">Uploading…</span>
                      <span className="tabular-nums">{it.progress}%</span>
                    </div>
                    <div
                      className="relative h-2 w-full overflow-hidden rounded-full bg-neutral-200"
                      role="progressbar"
                      aria-valuenow={it.progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Upload progress for ${it.file.name}`}
                    >
                      <div
                        className="h-full w-0 bg-neutral-800 transition-[width] duration-150"
                        style={{ width: `${it.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {it.status === "success" && <div className="text-sm text-green-700">Uploaded</div>}
                {it.status === "error" && <div className="text-sm text-red-700">{it.error || "Upload failed"}</div>}
                {it.status === "canceled" && <div className="text-sm text-neutral-600">Canceled</div>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
