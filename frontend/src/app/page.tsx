import { auth0 } from "@/app/lib/auth0";
import { ClipboardList } from "lucide-react";
import TodoDashboard from "./components/TodoDashboard";

export default async function HomePage() {
  const session = await auth0.getSession();

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Navbar */}
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-slate-800 text-sm">Todos</span>
          </div>
        </header>

        {/* Centered card */}
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-6">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">Multi-Account Todo</h1>
                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                  Your tasks, securely isolated per account.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <a
                href="/auth/login"
                className="block w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors text-center"
              >
                Log in
              </a>
              <a
                href="/auth/login?screen_hint=signup"
                className="block w-full py-2.5 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-colors text-center"
              >
                Create an account
              </a>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return <TodoDashboard user={session.user} />;
}