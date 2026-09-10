import { auth0 } from "./lib/auth0";

export default async function HomePage() {
  const session = await auth0.getSession();

  if (!session) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center space-y-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-blue-50 text-blue-600 font-bold text-xl">
            T
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Multi-Account Todo</h1>
            <p className="text-sm text-gray-500 mt-2">
              Production-grade todo management with strict account isolation.
            </p>
          </div>
          <a
            href="/auth/login"
            className="block w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Log In with Auth0
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Welcome, {session.user.name || session.user.email}</h1>
            <p className="text-xs text-gray-400 mt-1 font-mono">{session.user.sub}</p>
          </div>
          <a
            href="/auth/logout"
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Log Out
          </a>
        </header>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-gray-600 text-sm">Auth0 session verified. Ready for Todo dashboard.</p>
        </div>
      </div>
    </main>
  );
}