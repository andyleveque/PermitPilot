'use client';

import { useState, DragEvent, ChangeEvent } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function UploadPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tags, setTags] = useState('');

  const uploadFilesWithProgress = (formData: FormData) => {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload');

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percent);
        }
      });

      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve();
        } else {
          try {
            const res = JSON.parse(xhr.responseText);
            setError(res.error || 'Upload failed.');
          } catch {
            setError('Upload failed.');
          }
          reject();
        }
      };

      xhr.onerror = () => {
        setError('Network error occurred.');
        reject();
      };

      xhr.send(formData);
    });
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (!session) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    formData.append('tags', tags);

    try {
      setUploading(true);
      setUploadProgress(0);
      await uploadFilesWithProgress(formData);
      router.push('/dashboard');
    } catch {
      // handled above
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement;
    if (!input?.files?.length) return;

    const formData = new FormData();
    Array.from(input.files).forEach((file) => formData.append('files', file));
    formData.append('tags', tags);

    try {
      setUploading(true);
      setUploadProgress(0);
      await uploadFilesWithProgress(formData);
      router.push('/dashboard');
    } catch {
      // handled
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  if (!session) {
    return <p className="p-4 text-center">Please sign in to upload files.</p>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Upload Files</h1>

      <div
        onDrop={handleDrop}
        onDragOver={handleDrag}
        onDragLeave={handleDragLeave}
        className={`border-4 border-dashed rounded-lg p-8 text-center transition ${
          dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
        }`}
      >
        {dragActive ? (
          <p className="text-blue-600">Drop files here to upload</p>
        ) : (
          <p className="text-gray-600">Drag and drop files here, or use the form below.</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <input type="file" name="files" multiple className="block" />
        <input
          type="text"
          placeholder="Tags (comma-separated)"
          value={tags}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setTags(e.target.value)}
          className="w-full border rounded px-3 py-1 text-sm"
        />
        <button
          type="submit"
          disabled={uploading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </form>

      {uploadProgress !== null && (
        <div className="mt-4">
          <p>Progress: {uploadProgress}%</p>
          <div className="w-full bg-gray-200 rounded h-2 mt-1">
            <div
              className="bg-blue-600 h-2 rounded"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-red-600">{error}</p>}
    </div>
  );
}
