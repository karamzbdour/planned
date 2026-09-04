import { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/layout/auth-form";
import { BrandLogo } from "@/components/brand/brand-logo";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-brand-off-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 text-center">
          <BrandLogo size="xl" showWordmark={false} className="mb-4" />
          <h1 className="font-display text-3xl font-bold text-brand-green-deep">
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Sign in to your Planned account
          </p>
        </div>

        <AuthForm mode="login" />

        <p className="text-center text-sm text-muted-foreground mt-6">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-brand-green hover:text-brand-green-deep font-medium underline-offset-4 hover:underline"
          >
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}
