// app/components/AuthButton.tsx
'use client';

import { useSession, signIn, signOut } from 'next-auth/react';

export default function AuthButton() {
const { data: session, status } = useSession();

if (status === 'loading') return <p>Loading...</p>;

if (session) {
return (
<div>
<span>Signed in as {session.user?.email}</span>{' '}
<button onClick={() => signOut()}>Sign out</button>
</div>
);
}

return <button onClick={() => signIn('github')}>Sign in with GitHub</button>;
}