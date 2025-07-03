'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';

export default function UploadPage() {
const { data: session, status } = useSession();
const [file, setFile] = useState<File | null>(null);
const [response, setResponse] = useState('');
const [summary, setSummary] = useState('');

if (status === 'loading') {
return <p>Loading...</p>;
}

if (!session) {
return <p>You must be signed in to upload files.</p>;
}

const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
e.preventDefault();

if (!file) {
alert('Please select a file.');
return;
}

const formData = new FormData();
formData.append('file', file);

try {
const res = await fetch('/api/upload', {
method: 'POST',
body: formData,
});

const data = await res.json();

if (data.error) {
setResponse('Upload failed: ' + data.error);
return;
}

setResponse(`Uploaded: ${data.filename}\nPreview:\n${data.contentPreview}`);

// Get AI summary
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
setResponse('Upload failed.');
}
};

return (
<div style={{ padding: '2rem' }}>
<h1>PermitPilot File Upload</h1>
<form onSubmit={handleSubmit}>
<input
type="file"
accept=".txt"
onChange={(e) => setFile(e.target.files?.[0] || null)}
/>
<button type="submit">Upload</button>
</form>

{response && (
<div style={{ marginTop: '1rem' }}>
<pre>{response}</pre>
</div>
)}

{summary && (
<div style={{ marginTop: '1rem' }}>
<h2>AI Summary</h2>
<p>{summary}</p>
</div>
)}
</div>
);
}