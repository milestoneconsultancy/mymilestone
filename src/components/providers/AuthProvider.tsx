"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Profile, Company, UserRole } from "@/types/database";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  company: Company | null;
  role: UserRole | null;
  isOwnerOrAdmin: boolean;
  isLoading: boolean;
  isOnline: boolean;
  isSyncing: boolean;
  setSyncing: (syncing: boolean) => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  company: null,
  role: null,
  isOwnerOrAdmin: false,
  isLoading: true,
  isOnline: true,
  isSyncing: false,
  setSyncing: () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setSyncing] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const { data: prof, error } = await supabase
        .from("profiles")
        .select("*, company:companies(*)")
        .eq("id", userId)
        .single();

      if (!error && prof) {
        setProfile(prof as Profile);
        if (prof.company) {
          setCompany(prof.company as Company);
        }
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
    }
  }, [supabase]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    async function initAuth() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        if (user) {
          await loadProfile(user.id);
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          await loadProfile(currentUser.id);
        } else {
          setProfile(null);
          setCompany(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      subscription.unsubscribe();
    };
  }, [supabase, loadProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setCompany(null);
    router.push("/login");
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  const role = profile?.role || null;
  const isOwnerOrAdmin = role === "owner" || role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        company,
        role,
        isOwnerOrAdmin,
        isLoading,
        isOnline,
        isSyncing,
        setSyncing,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
