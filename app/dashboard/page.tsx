'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { getFileTypeIcon } from '../../utils/fileType';

type Upload = {
  id: number;
  name: string;
  url: string;
  summary?: string | null;
  createdAt: string;
  replacedAt?: string | null;
  tags?: string[];
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editedSummary, setEditedSummary] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 5;

  const fetchUploads = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      const res = await fetch(`/api/uploads-for-user?${params}`);
      const json = await res.json();

      if (Array.isArray(json.uploads)) {
        setUploads(json.uploads);
        setTotal(json.total || 0);
      } else {
        console.error('Unexpected response format:', json);
      }
    } catch (error) {
      console.error('Error fetching uploads:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) fetchUploads();
  }, [session, page]);

  const getFilteredUploads = () => {
    return uploads
      .filter((upload) => {
        if (fileTypeFilter === 'all') return true;
        const ext = upload.name?.split('.').pop()?.toLowerCase();
        if (!ext) return false;
        const filters: Record<string, string[]> = {
          pdf: ['pdf'],
          doc: ['doc', 'docx'],
          image: ['jpg', 'jpeg', 'png', 'gif'],
          excel: ['xls', 'xlsx', 'csv'],
          txt: ['txt'],
        };
        return filters[fileTypeFilter]?.includes(ext);
      })
      .filter((upload) =>
        upload.name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) =>
        sortOrder === 'newest'
          ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
  };

  const filteredUploads = useMemo(getFilteredUploads, [
    uploads,
    fileTypeFilter,
    searchQuery,
    sortOrder,
  ]);

  const handleEdit = (id: number, currentSummary: string | null) => {
    setEditingId(id);
    setEditedSummary(currentSummary ?? '');
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditedSummary('');
  };

  const handleSave = async (id: number) => {
    const savingToast = toast.loading('Saving summary...');
    try {
      const res = await fetch(`/api/uploads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: editedSummary }),
      });

      if (res.ok) {
        const updated = await res.json();
        setUploads((prev) =>
          prev.map((u) => (u.id === id ? { ...u, summary: updated.summary } : u))
        );
        toast.success('Summary updated!', { id: savingToast });
        handleCancel();
      } else {
        toast.error('Failed to update summary.', { id: savingToast });
      }
    } catch (error) {
      console.error('Error saving summary:', error);
      toast.error('Unexpected error while saving.', { id: savingToast });
    }
  };

  const handleDelete = async (id: number) => {
    const confirm = window.confirm('Are you sure you want to delete this file?');
    if (!confirm) return;

    const deletingToast = toast.loading('Deleting...');
    try {
      const res = await fetch(`/api/uploads/${id}`, { method: 'DELETE' });

      if (res.ok) {
        setUploads((prev) => prev.filter((u) => u.id !== id));
        toast.success('File deleted.', { id: deletingToast });
      } else {
        toast.error('Failed to delete file.', { id: deletingToast });
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Unexpected error while deleting.', { id: deletingToast });
    }
  };

  const handleReplace = async (id: number, file: File) => {
    const replacingToast = toast.loading('Replacing file...');
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/replace-file/${id}`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const updated = await res.json();
        setUploads((prev) =>
          prev.map((u) =>
            u.id === id
              ? { ...u, name: file.name, url: updated.url, replacedAt: new Date().toISOString() }
              : u
          )
        );
        toast.success('File replaced!', { id: replacingToast });
      } else {
        toast.error('Failed to replace file.', { id: replacingToast });
      }
    } catch (error) {
      console.error('Error replacing file:', error);
      toast.error('Unexpected error while replacing.', { id: replacingToast });
    }
  };

  if (!session) {
    return <div className="p-4 text-center">Please sign in to view your dashboard.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-4 items-center">
        <input
          type="text"
          placeholder="Search by filename"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border px-2 py-1 rounded text-sm w-48"
        />

        <select
          value={fileTypeFilter}
          onChange={(e) => setFileTypeFilter(e.target.value)}
          className="border px-2 py-1 rounded text-sm"
        >
          <option value="all">All Types</option>
          <option value="pdf">PDF</option>
          <option value="doc">DOC/DOCX</option>
          <option value="image">Image</option>
          <option value="excel">Excel/CSV</option>
          <option value="txt">Text</option>
        </select>

        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
          className="border px-2 py-1 rounded text-sm"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      {loading ? (
        <p>Loading your uploaded files...</p>
      ) : filteredUploads.length === 0 ? (
        <p>No uploads found.</p>
      ) : (
        <ul className="space-y-4">
          {filteredUploads.map((upload) => (
            <li
              key={upload.id}
              className="border border-gray-200 rounded-lg p-4 shadow-sm bg-white flex items-start"
            >
              <span className="text-2xl mr-4">{getFileTypeIcon(upload.name)}</span>
              <div className="flex-1">
                <p className="font-medium">{upload.name}</p>
                <p className="text-sm text-gray-500">
                  Uploaded: {new Date(upload.createdAt).toLocaleString()}
                </p>
                {upload.replacedAt && (
                  <span className="inline-block mt-1 bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded">
                    Replaced: {new Date(upload.replacedAt).toLocaleString()}
                  </span>
                )}

                {upload.tags?.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {upload.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {editingId === upload.id ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      className="w-full border rounded p-2 text-sm"
                      rows={4}
                      value={editedSummary}
                      onChange={(e) => setEditedSummary(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                        onClick={() => handleSave(upload.id)}
                      >
                        Save
                      </button>
                      <button
                        className="px-3 py-1 bg-gray-300 rounded text-sm"
                        onClick={handleCancel}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : upload.summary ? (
                  <div className="mt-2 text-gray-700">
                    <p>
                      <strong>Summary:</strong> {upload.summary}
                    </p>
                    <button
                      className="mt-1 text-blue-600 text-sm underline"
                      onClick={() => handleEdit(upload.id, upload.summary)}
                    >
                      Edit Summary
                    </button>
                  </div>
                ) : null}

                {/* Replace file */}
                <div className="mt-2 flex gap-2 items-center">
                  <input
                    type="file"
                    onChange={(e) =>
                      e.target.files && handleReplace(upload.id, e.target.files[0])
                    }
                    className="text-sm"
                  />
                  <button
                    className="text-red-600 text-sm underline"
                    onClick={() => handleDelete(upload.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Pagination Controls */}
      <div className="mt-6 flex justify-between items-center text-sm">
        <button
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          onClick={() => setPage((p) => Math.max(p - 1, 1))}
          disabled={page === 1}
        >
          Previous
        </button>
        <span>
          Page {page} of {Math.ceil(total / pageSize)}
        </span>
        <button
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          onClick={() => setPage((p) => p + 1)}
          disabled={page * pageSize >= total}
        >
          Next
        </button>
      </div>
    </div>
  );
}
