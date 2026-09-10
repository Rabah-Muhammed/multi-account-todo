"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, Trash2, Pencil, X, Search, Loader2 } from "lucide-react";
import { Todo } from "@/app/types";

interface Props {
  user: {
    name?: string;
    email?: string;
    sub?: string;
  };
}

export default function TodoDashboard({ user }: Props) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // New todo form
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const fetchTodos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await fetch(`/api/todos?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 401) throw new Error("Session expired. Please log in again.");
        throw new Error(`Failed to load todos (HTTP ${res.status})`);
      }

      const data = await res.json();
      setTodos(Array.isArray(data) ? data : data.results || []);
    } catch (err: any) {
      setError(err.message || "Failed to load todos");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description: newDescription.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.title?.[0] || data.error || `Failed to create todo (${res.status})`);
      }

      const created = await res.json();
      setTodos((prev) => [created, ...prev]);
      setNewTitle("");
      setNewDescription("");
      showNotice("Task added successfully");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (todo: Todo) => {
    const originalStatus = todo.completed;
    // Optimistic update
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, completed: !t.completed } : t))
    );

    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !originalStatus }),
      });

      if (!res.ok) {
        throw new Error("Failed to update status");
      }
    } catch (err: any) {
      // Revert on error
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? { ...t, completed: originalStatus } : t))
      );
      setError(err.message);
    }
  };

  const startEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditTitle(todo.title);
    setEditDescription(todo.description);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditDescription("");
  };

  const handleSaveEdit = async (id: string) => {
    if (!editTitle.trim()) return;

    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
        }),
      });

      if (!res.ok) throw new Error("Failed to save changes");

      const updated = await res.json();
      setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
      cancelEdit();
      showNotice("Task updated");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/todos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete todo");

      setTodos((prev) => prev.filter((t) => t.id !== id));
      showNotice("Task deleted");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const totalCount = todos.length;
  const completedCount = todos.filter((t) => t.completed).length;

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Top Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
              T
            </div>
            <div>
              <span className="font-semibold text-gray-900 text-sm">Multi-Account Todo</span>
              <span className="hidden sm:inline text-xs text-gray-400 ml-2 font-mono">
                {user.email || user.name}
              </span>
            </div>
          </div>
          <a
            href="/auth/logout"
            className="text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
          >
            Sign Out
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {/* Notice feedback banner */}
        {notice && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm px-4 py-2.5 rounded-lg">
            {notice}
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={fetchTodos}
              className="text-xs font-semibold underline hover:no-underline ml-4"
            >
              Retry
            </button>
          </div>
        )}

        {/* Create Todo Card */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <input
                type="text"
                placeholder="What needs to be done?"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                disabled={submitting}
                className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
              />
            </div>
            <div>
              <textarea
                placeholder="Description (optional)"
                rows={2}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                disabled={submitting}
                className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-400 resize-none"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || !newTitle.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Add Task</span>
              </button>
            </div>
          </form>
        </section>

        {/* Filter & Search Bar */}
        <section className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 text-xs font-medium w-full sm:w-auto">
            {(["all", "active", "completed"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md capitalize transition-colors ${
                  statusFilter === filter
                    ? "bg-blue-600 text-white font-semibold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400 bg-white"
            />
          </div>
        </section>

        {/* Todo List */}
        <section className="space-y-2.5">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-white p-4 rounded-xl border border-gray-200 animate-pulse h-20" />
              ))}
            </div>
          ) : todos.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
              <p className="text-gray-500 text-sm">No tasks found.</p>
              <p className="text-xs text-gray-400 mt-1">
                {searchQuery ? "Try a different search term" : "Create a new task above to get started."}
              </p>
            </div>
          ) : (
            todos.map((todo) => (
              <div
                key={todo.id}
                className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-start gap-3 transition-colors hover:border-gray-300"
              >
                {/* Complete checkbox */}
                <button
                  type="button"
                  onClick={() => handleToggle(todo)}
                  className={`mt-1 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                    todo.completed
                      ? "bg-green-600 border-green-600 text-white"
                      : "border-gray-300 hover:border-blue-500"
                  }`}
                >
                  {todo.completed && <Check className="w-3.5 h-3.5" />}
                </button>

                {/* Content or Edit mode */}
                <div className="flex-1 min-w-0">
                  {editingId === todo.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-blue-500 rounded text-sm text-gray-900"
                      />
                      <textarea
                        rows={2}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs text-gray-700"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(todo.id)}
                          className="px-2.5 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-2.5 py-1 border border-gray-300 text-gray-600 text-xs rounded hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3
                        className={`text-sm font-medium ${
                          todo.completed ? "line-through text-gray-400" : "text-gray-900"
                        }`}
                      >
                        {todo.title}
                      </h3>
                      {todo.description && (
                        <p
                          className={`text-xs mt-1 ${
                            todo.completed ? "text-gray-300" : "text-gray-500"
                          }`}
                        >
                          {todo.description}
                        </p>
                      )}
                      <span className="text-[11px] text-gray-400 mt-2 inline-block">
                        {new Date(todo.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {editingId !== todo.id && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEdit(todo)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(todo.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </section>

        {/* Footer info */}
        {todos.length > 0 && (
          <footer className="text-center text-xs text-gray-400 pt-2">
            {completedCount} of {totalCount} tasks completed
          </footer>
        )}
      </main>
    </div>
  );
}