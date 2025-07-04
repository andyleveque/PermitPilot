'use client';

import { useSession, signIn } from 'next-auth/react';
import { useState } from 'react';

export default function UploadPage() {
  const { data: session, status } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [response, setResponse] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);

  if (status === 'loading') {
    return <p>Loading session...</p>;
  }

  if (!session) {
    return (
      <div style={{ padding: '2rem' }}>
        <h2>You must be signed in to upload files.</h2>
        <button onClick={() => signIn('github')}>Sign in with GitHub</button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!file) {
      alert('Please select a file.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    setResponse('');
    setSummary('');

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.error) {
        setResponse('Upload failed: ' + data.error);
        setLoading(false);
        return;
      }

      setResponse(`✅ Uploaded: ${data.filename}\n\n📄 Preview:\n${data.contentPreview}`);

      // Request AI summary
      const summaryRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: data.contentPreview }),
      });

      const summaryData = await summaryRes.json();

      if (summaryData.error) {
        setSummary('AI analysis failed: ' + summaryData.error);
      } else {
        setSummary(summaryData.summary);
      }
    } catch (err) {
      console.error(err);
      setResponse('❌ Upload failed due to network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>PermitPilot File Upload</h1>

      <form onSubmit={handleSubmit} style={{ marginBottom: '1rem' }}>
        <input
          type="file"
          accept=".txt"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Uploading...' : 'Upload'}
        </button>
      </form>

      {response && (
        <div style={{ whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>
          {response}
        </div>
      )}

      {summary && (
        <div>
          <h2>🧠 AI Summary</h2>
          <p>{summary}</p>
        </div>
      )}
    </div>
  );
}
