"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Building2 } from "lucide-react";
import Link from "next/link";

export default function InvitePage() {
  const params = useParams();
  const token = params?.token as string;
  const router = useRouter();
  const supabase = createClient();

  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    async function fetchInvite() {
      if (!token) return;
      try {
        const { data, error } = await supabase
          .from("invites")
          .select("*, company:companies(*)")
          .eq("token", token)
          .is("accepted_at", null)
          .single();

        if (error || !data) {
          setErrorMsg("This invitation link is invalid or has already been used.");
        } else {
          setInvite(data);
        }
      } catch (err: any) {
        setErrorMsg("Failed to verify invitation.");
      } finally {
        setLoading(false);
      }
    }
    fetchInvite();
  }, [token, supabase]);

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite) return;
    setErrorMsg("");
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: invite.email,
        password,
        options: {
          data: {
            full_name: fullName.trim() || invite.email,
          },
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes("already registered")) {
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: invite.email,
            password,
          });
          if (signInErr) {
            setErrorMsg("Account already exists. Please log in first, then reopen this link.");
            setIsSubmitting(false);
            return;
          }
        } else {
          setErrorMsg(error.message);
          setIsSubmitting(false);
          return;
        }
      }

      setAccepted(true);
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to process invitation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F5F9] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-[#F5741A] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">Verifying invitation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F5F9] flex flex-col justify-center items-center p-4">
      <Card className="w-full max-w-md shadow-card border-0">
        <CardHeader className="text-center pb-2">
          <div className="w-12 h-12 bg-blue-50 text-[#0A2E5A] rounded-2xl mx-auto flex items-center justify-center mb-2">
            <Building2 className="w-6 h-6" />
          </div>
          <CardTitle className="text-xl">Team invitation</CardTitle>
          <CardDescription>
            {invite ? (
              <>
                You have been invited to join{" "}
                <span className="font-semibold text-gray-800">
                  {invite.company?.name || "the team"}
                </span>{" "}
                as a <span className="capitalize font-semibold text-[#F5741A]">{invite.role}</span>.
              </>
            ) : (
              "Invalid or expired invitation"
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {accepted && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <span>Invitation accepted! Redirecting to workspace...</span>
            </div>
          )}

          {invite && !accepted && (
            <form onSubmit={handleAcceptInvite} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Email address</label>
                <Input type="email" value={invite.email} disabled className="bg-gray-50 text-gray-600" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Your full name</label>
                <Input
                  type="text"
                  placeholder="Rahul Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Create password</label>
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
                isLoading={isSubmitting}
              >
                Accept & join workspace
              </Button>
            </form>
          )}

          {!invite && (
            <div className="text-center pt-2">
              <Link href="/login">
                <Button variant="default" className="w-full">
                  Go to sign in
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
