"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Incorrect email or password. Please try again.");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-brand-off-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8 text-center">
          <BrandLogo size="xl" showWordmark={false} className="mb-4" />
          <h1 className="font-display text-3xl font-bold text-brand-green-deep">
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Sign in to continue planning
          </p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-3xl border border-border/50 shadow-sm p-6 space-y-4">

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-brand-green-deep block mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full h-11 px-4 rounded-xl border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 placeholder:text-muted-foreground"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-brand-green-deep block mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full h-11 px-4 pr-11 rounded-xl border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-brand-green hover:bg-brand-green-deep disabled:opacity-60 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Sign in
            </button>
          </form>
        </div>

        {/* Footer links */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/onboarding"
              className="text-brand-green font-semibold hover:text-brand-green-deep transition-colors"
            >
              Get started free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
