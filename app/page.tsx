export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-4xl font-bold mb-4">Welcome to PermitPilot</h1>
      <p className="mb-2">
        <a href="/upload" className="text-blue-600 hover:underline">📤 Upload a file →</a>
      </p>
      <p>
        <a href="/dashboard" className="text-blue-600 hover:underline">📁 Your dashboard →</a>
      </p>
    </div>
  );
}
