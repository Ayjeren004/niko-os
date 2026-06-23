"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Invalid username or password");
      setIsLoading(false);
    } else {
      router.push("/");
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    setError("");
    const res = await signIn("credentials", {
      username: "DEMO_MODE_LOGIN",
      password: "DEMO_MODE_LOGIN_BYPASS",
      redirect: false,
    });

    if (res?.error) {
      setError("Demo login failed");
      setIsLoading(false);
    } else {
      // Seed data if it's demo mode
      try {
        await fetch('/api/demo/seed', { method: 'POST' });
      } catch (e) {
        console.error("Failed to seed demo data");
      }
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-grid-white/[0.02]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20 border border-gray-700">
            <span className="text-white text-3xl font-bold tracking-tighter">N</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
          Niko OS
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          Private Autonomous Agent
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-gray-900 border border-gray-800 py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm text-center">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Username
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-purple-500 sm:text-sm transition-colors"
                  placeholder="admin"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-purple-500 sm:text-sm transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full justify-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:from-purple-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 transition-all"
              >
                {isLoading ? "Authenticating..." : "Unlock Niko"}
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-gray-900 px-2 text-gray-500">Or</span>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={isLoading}
                className="flex w-full justify-center rounded-xl bg-gray-800 border border-gray-700 hover:bg-gray-700 px-4 py-3 text-sm font-semibold text-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 transition-all"
              >
                Try Demo Mode
              </button>
            </div>
            
            <p className="text-xs text-center text-gray-500 mt-4">
              If this is your first login, entering a username and password will create your master account.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
