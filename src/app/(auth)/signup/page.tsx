"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            company_name: companyName.trim(),
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      if (data?.session) {
        router.push("/");
        router.refresh();
      } else if (data?.user) {
        setSuccessMsg(
          "Account created! Please check your email to confirm your account, then log in."
        );
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "An unexpected error occurred during signup.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F5F9] flex flex-col justify-center items-center p-4">
      <div className="mb-6 text-center">
        <div className="w-14 h-14 bg-[#0A2E5A] rounded-2xl mx-auto flex items-center justify-center shadow-md mb-3">
          <svg className="w-8 h-8 text-[#F5741A]" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
            <path d="M6 6h10"/>
            <path d="M6 10h10"/>
            <path d="M12 18v-4"/>
            <path d="m9 15 3-3 3 3"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-[#0A2E5A] tracking-tight">Milestone ERP</h1>
        <p className="text-sm text-gray-500 mt-1">Set up your company workspace</p>
      </div>

      <Card className="w-full max-w-md shadow-card border-0">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-xl">Create company account</CardTitle>
          <CardDescription>Get started with automated recruitment and offer letters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Full name</label>
              <Input
                type="text"
                placeholder="Rahul Sharma"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Company name</label>
              <Input
                type="text"
                placeholder="Milestone Consultancy Services"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Email address</label>
              <Input
                type="email"
                placeholder="hr@milestoneconsultancy.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Password</label>
              <Input
                type="password"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>

            <Button
              type="submit"
              variant="accent"
              className="w-full h-11 text-base mt-2"
              isLoading={isLoading}
            >
              Get started
            </Button>
          </form>

          <div className="text-center pt-2">
            <p className="text-xs text-gray-500">
              Already have an account?{" "}
              <Link href="/login" className="text-[#1B8BD8] font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
