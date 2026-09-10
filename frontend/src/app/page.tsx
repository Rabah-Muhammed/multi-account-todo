import { auth0 } from "@/app/lib/auth0";
import TodoDashboard from "./components/TodoDashboard";

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

  return <TodoDashboard user={session.user} />;
}