'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
const { data: session, status } = useSession();
const [uploads, setUploads] = useState<any[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
if (session) {
fetch('/api/uploads-for-user')
.then(res => res.json())
.then(data => {
setUploads(data.uploads);
setLoading(false);
});
}
}, [session]);

if (status === 'loading' || loading) return <p>Loading...</p>;

if (!session) {
return <p>You must be signed in to view your dashboard.</p>;
}

return (
<div style={{ padding: '2rem' }}>
<h1>Your Uploaded Files</h1>
{uploads.length === 0 ? (
<p>No uploads yet.</p>
) : (
<ul>
{uploads.map(upload => (
<li key={upload.id}>
<strong>{upload.filename}</strong> — {upload.content.slice(0, 100)}...
</li>
))}
</ul>
)}
</div>
);
}