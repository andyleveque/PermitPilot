'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getFileTypeIcon } from '@/app/utils/fileTypes'; // ✅ Correct path alias

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUploads() {
      if (!session?.user?.email) return;

      try {
        const res = await fetch(`/api/uploads-for-user?email=${session.user.email}`);
        const data = await res.json();
        setUploads(data);
      } catch (error) {
        console.error('Error fetching uploads:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUploads();
  }, [session?.user?.email]);

  if (status === 'loading' || loading) {
    return <div className="p-4">Loading dashboard...</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Your Uploads</h1>
      {uploads.length === 0 ? (
        <p>No uploads found.</p>
      ) : (
        <ul className="space-y-4">
          {uploads.map(upload => (
            <li key={upload.id} className="border p-4 rounded shadow-sm bg-white flex items-start space-x-4">
              <span className="text-2xl">{getFileTypeIcon(upload.filename)}</span>
              <div>
                <p className="font-medium">{upload.filename}</p>
                <p className="text-sm text-gray-500">Uploaded on {new Date(upload.createdAt).toLocaleDateString()}</p>
                {upload.summary && (
                  <div className="mt-2 text-sm text-gray-700">
                    <strong>Summary:</strong> {upload.summary}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
