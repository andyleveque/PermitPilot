'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getFileTypeIcon } from '@/utils/fileTypes'; // ✅ Uses path alias

type Upload = {
  id: number;
  filename: string;
  content: string;
  summary: string | null;
  createdAt: string;
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [filtered, setFiltered] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [onlyWithSummaries, setOnlyWithSummaries] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [uploadToDelete, setUploadToDelete] = useState<Upload | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      const fetchUploads = async () => {
        const res = await fetch('/api/uploads');
        const data = await res.json();
        setUploads(data.uploads);
        setLoading(false);
      };
      fetchUploads();
    }
  }, [status]);

  useEffect(() => {
    let result = uploads;

    if (search) {
      result = result.filter((u) =>
        u.filename.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (onlyWithSummaries) {
      result = result.filter((u) => u.summary);
    }

    if (startDate) {
      const start = new Date(startDate);
      result = result.filter((u) => new Date(u.createdAt) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      result = result.filter((u) => new Date(u.createdAt) <= end);
    }

    result.sort((a, b) =>
      sortOrder === 'newest'
        ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    setFiltered(result);
  }, [uploads, search, onlyWithSummaries, sortOrder, startDate, endDate]);

  const handleRegenerate = async (id: number) => {
    const res = await fetch(`/api/summarize/${id}`, { method: 'POST' });
    const data = await res.json();
    if (data.summary) {
      setUploads((prev) =>
        prev.map((u) => (u.id === id ? { ...u, summary: data.summary } : u))
      );
    } else {
      alert('Failed to regenerate summary.');
    }
  };

  const openDeleteModal = (upload: Upload) => {
    setUploadToDelete(upload);
    setShowModal(true);
  };

  const confirmDelete = async () => {
    if (!uploadToDelete) return;
    const res = await fetch(`/api/uploads/${uploadToDelete.id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setUploads((prev) => prev.filter((u) => u.id !== uploadToDelete.id));
      closeModal();
    } else {
      alert('Failed to delete upload.');
    }
  };

  const closeModal = () => {
    setUploadToDelete(null);
    setShowModal(false);
  };

  if (status === 'loading' || loading) return <p className="p-6">Loading...</p>;

  if (!session) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold text-red-600">
          You must be signed in to view your dashboard.
        </h2>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">📁 Your Uploaded Files</h1>

      <div className="flex flex-wrap gap-4 mb-6 items-center">
        <input
          type="text"
          placeholder="Search uploads..."
          className="border px-3 py-2 rounded"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={onlyWithSummaries}
            onChange={(e) => setOnlyWithSummaries(e.target.checked)}
          />
          Only with summaries
        </label>
        <label>
          Sort:
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
            className="ml-2 border rounded px-2 py-1"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
        <label>
          Start Date:
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="ml-2 border rounded px-2 py-1"
          />
        </label>
        <label>
          End Date:
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="ml-2 border rounded px-2 py-1"
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-600">No uploads match your filters.</p>
      ) : (
        <div className="space-y-6">
          {filtered.map((upload) => (
            <div
              key={upload.id}
              className="bg-white border border-gray-200 shadow rounded-xl p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">
                    {getFileTypeIcon(upload.filename)} {upload.filename}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {new Date(upload.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="space-x-2">
                  <button
                    onClick={() => handleRegenerate(upload.id)}
                    className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                  >
                    🔄 Regenerate
                  </button>
                  <button
                    onClick={() => openDeleteModal(upload)}
                    className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <h3 className="text-md font-medium text-gray-700">📄 Content:</h3>
                <pre className="bg-gray-100 text-sm p-4 rounded whitespace-pre-wrap mt-2">
                  {upload.content.slice(0, 1000)}
                </pre>
              </div>

              <div className="mt-4">
                <h3 className="text-md font-medium text-gray-700">🧠 Summary:</h3>
                {upload.summary ? (
                  <p className="mt-2 text-gray-800">{upload.summary}</p>
                ) : (
                  <p className="mt-2 text-gray-500 italic">No summary available.</p>
                )}
              </div>

              {upload.filename.toLowerCase().endsWith('.pdf') && (
                <div className="mt-4">
                  <a
                    href={`data:application/pdf;base64,${btoa(upload.content)}`}
                    download={upload.filename}
                    className="text-blue-600 underline"
                  >
                    📥 Download PDF
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && uploadToDelete && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4 text-red-700">Confirm Deletion</h2>
            <p className="mb-4">
              Are you sure you want to delete{' '}
              <strong>{uploadToDelete.filename}</strong>?
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
