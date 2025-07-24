'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';

export default function UploadPage() {
  const { data: session } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Prevent browser default drag behavior
  useEffect(() => {
    const preventDefaults = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener('dragover', preventDefaults);
    window.addEventListener('drop', preventDefaults);

    return () => {
      window.removeEventListener('dragover', preventDefaults);
      window.removeEventListener('drop', preventDefaults);
    };
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      setPreview(null);
      setSummary(null);
      setMessage(null);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreview(null);
      setSummary(null);
      setMessage(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;

    setUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) throw new Error(result.error || 'Upload failed');

      setMessage(`✅ Uploaded: ${result.upload.filename}`);
      setPreview(result.upload.content);
      setSummary(result.upload.summary || 'AI analysis failed or not available');
    } catch (err: any) {
      setMessage(`❌ Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  if (!session) return <p>Please sign in</p>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <span>Signed in as {session.user?.email}</span>
        <button
          onClick={() => signOut()}
          className="text-sm text-blue-600 hover:underline"
        >
          Sign out
        </button>
      </div>

      <h1 className="text-xl font-bold mb-4">PermitPilot File Upload</h1>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed p-6 mb-4 text-center transition rounded-lg ${
          isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
      >
        {file ? (
          <p>{file.name}</p>
        ) : (
          <p>Drag and drop a file here, or choose one below</p>
        )}
      </div>

      <input type="file" onChange={handleFileChange} className="mb-4" />

      <button
        onClick={handleSubmit}
        disabled={!file || uploading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {uploading ? 'Uploading...' : 'Upload'}
      </button>

      {message && <p className="mt-4">{message}</p>}

      {preview && (
        <div className="mt-6">
          <h2 className="font-semibold">📄 Preview:</h2>
          <pre className="bg-gray-100 p-3 rounded whitespace-pre-wrap">{preview}</pre>
        </div>
      )}

      {summary && (
        <div className="mt-6">
          <h2 className="font-semibold">🧠 AI Summary</h2>
          <p className="bg-yellow-50 p-3 rounded">{summary}</p>
        </div>
      )}
    </div>
  );
}
