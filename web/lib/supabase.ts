import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: "Advocate" | "Corporate Counsel" | "Legal Researcher" | "Student / Citizen" | string;
  bar_license_no?: string;
  phone?: string;
  organization?: string;
  created_at: string;
  updated_at?: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith("http") &&
    !supabaseUrl.includes("your-supabase")
  );
};

// Create the real Supabase client (or null if unconfigured)
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// ================= Local Fallback Store (for immediate demo before Supabase keys are plugged in) =================
const LOCAL_STORAGE_USER_KEY = "legalease_user_profile";
const LOCAL_STORAGE_SESSION_KEY = "legalease_auth_session";

export const getLocalProfile = (): UserProfile | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const setLocalProfile = (profile: UserProfile): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(profile));
  localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, "active");
};

export const clearLocalProfile = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
  localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
};

// ================= Universal Auth & Profile Functions =================

/**
 * Sign up a new user via Supabase (or local fallback).
 */
export async function signUpUser(
  email: string,
  password: string,
  metadata: {
    full_name: string;
    role: string;
    bar_license_no?: string;
    phone?: string;
    organization?: string;
  }
): Promise<{ user: UserProfile | null; error: string | null }> {
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: metadata.full_name,
            role: metadata.role,
            bar_license_no: metadata.bar_license_no || "",
            phone: metadata.phone || "",
            organization: metadata.organization || "",
          },
        },
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data.user) {
        const profile: UserProfile = {
          id: data.user.id,
          email: data.user.email || email,
          full_name: metadata.full_name,
          role: metadata.role,
          bar_license_no: metadata.bar_license_no,
          phone: metadata.phone,
          organization: metadata.organization,
          created_at: new Date().toISOString(),
        };

        // Try syncing to public.profiles table if exists
        try {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            email: data.user.email,
            full_name: metadata.full_name,
            role: metadata.role,
            bar_license_no: metadata.bar_license_no,
            phone: metadata.phone,
            organization: metadata.organization,
            updated_at: new Date().toISOString(),
          });
        } catch {
          // Table might not be created yet, auth.user metadata suffices
        }

        setLocalProfile(profile);
        return { user: profile, error: null };
      }
    } catch (err: any) {
      return { user: null, error: err?.message || "Failed to sign up with Supabase" };
    }
  }

  // Graceful Local Fallback Demo Mode
  const demoProfile: UserProfile = {
    id: `usr_${Date.now()}`,
    email,
    full_name: metadata.full_name || "Legal Practitioner",
    role: metadata.role || "Advocate",
    bar_license_no: metadata.bar_license_no || "BC-2024-PK",
    phone: metadata.phone || "+92 300 1234567",
    organization: metadata.organization || "High Court Bar Association",
    created_at: new Date().toISOString(),
  };

  setLocalProfile(demoProfile);
  return { user: demoProfile, error: null };
}

/**
 * Sign in existing user via Supabase (or local fallback).
 */
export async function signInUser(
  email: string,
  password: string
): Promise<{ user: UserProfile | null; error: string | null }> {
  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data.user) {
        // Fetch from public.profiles or user metadata
        let profile: UserProfile = {
          id: data.user.id,
          email: data.user.email || email,
          full_name: (data.user.user_metadata?.full_name as string) || "Legal Advocate",
          role: (data.user.user_metadata?.role as string) || "Advocate",
          bar_license_no: data.user.user_metadata?.bar_license_no as string,
          phone: data.user.user_metadata?.phone as string,
          organization: data.user.user_metadata?.organization as string,
          created_at: data.user.created_at || new Date().toISOString(),
        };

        try {
          const { data: dbProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", data.user.id)
            .single();

          if (dbProfile) {
            profile = { ...profile, ...dbProfile };
          }
        } catch {
          // Fall back to auth user metadata
        }

        setLocalProfile(profile);
        return { user: profile, error: null };
      }
    } catch (err: any) {
      return { user: null, error: err?.message || "Login failed" };
    }
  }

  // Fallback demo login
  const existing = getLocalProfile();
  if (existing && existing.email.toLowerCase() === email.toLowerCase()) {
    setLocalProfile(existing);
    return { user: existing, error: null };
  }

  const defaultUser: UserProfile = {
    id: `usr_${Date.now()}`,
    email,
    full_name: "Adv. Nimra Naz",
    role: "Advocate High Court",
    bar_license_no: "BC-2024-KHI",
    phone: "+92 321 9876543",
    organization: "Karachi Bar Association",
    created_at: new Date().toISOString(),
  };
  setLocalProfile(defaultUser);
  return { user: defaultUser, error: null };
}

/**
 * Sign out user.
 */
export async function signOutUser(): Promise<void> {
  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
  }
  clearLocalProfile();
}

/**
 * Update user details in Supabase DB (or local fallback).
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<{ user: UserProfile | null; error: string | null }> {
  const current = getLocalProfile();
  const updated: UserProfile = {
    ...(current || ({} as UserProfile)),
    ...updates,
    id: userId,
    updated_at: new Date().toISOString(),
  } as UserProfile;

  if (supabase && isSupabaseConfigured()) {
    try {
      // 1. Update auth metadata
      await supabase.auth.updateUser({
        data: {
          full_name: updated.full_name,
          role: updated.role,
          bar_license_no: updated.bar_license_no,
          phone: updated.phone,
          organization: updated.organization,
        },
      });

      // 2. Update public.profiles row
      try {
        await supabase
          .from("profiles")
          .upsert({
            id: userId,
            full_name: updated.full_name,
            role: updated.role,
            bar_license_no: updated.bar_license_no,
            phone: updated.phone,
            organization: updated.organization,
            updated_at: new Date().toISOString(),
          });
      } catch {
        // Ignored if table not created
      }
    } catch (err: any) {
      // Keep local update even if network error
    }
  }

  setLocalProfile(updated);
  return { user: updated, error: null };
}
