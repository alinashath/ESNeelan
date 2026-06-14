import { assertSupabaseConfigured, supabase } from "@/src/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

export type UserRole = "buyer" | "seller" | "admin";

export type ProfileAccountType = "individual" | "business";

export type SellerVerificationStatus =
  | "none"
  | "pending"
  | "approved"
  | "rejected";

export type Profile = {
  id: string;
  phone: string | null;
  display_name: string | null;
  role: UserRole;
  suspended_at: string | null;
  avatar_storage_path: string | null;
  account_type: ProfileAccountType;
  contact_email: string | null;
  location_text: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postal_code: string | null;
  seller_verification_status: SellerVerificationStatus;
  seller_verification_note: string | null;
  seller_applied_at: string | null;
  seller_decided_at: string | null;
  seller_verification_id_document_path: string | null;
  seller_verification_business_reg_path: string | null;
};

type AuthCtx = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  assertSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, phone, display_name, role, suspended_at, avatar_storage_path, account_type, contact_email, location_text, address_line1, address_line2, city, postal_code, seller_verification_status, seller_verification_note, seller_applied_at, seller_decided_at, seller_verification_id_document_path, seller_verification_business_reg_path",
      )
      .eq("id", uid)
      .maybeSingle();
    if (error) {
      console.warn("profile load", error.message);
      setProfile(null);
      return;
    }
    if (!data) {
      setProfile(null);
      return;
    }
    const row = data as Record<string, unknown>;
    setProfile({
      ...(data as Profile),
      seller_verification_status:
        (row.seller_verification_status as
          | SellerVerificationStatus
          | undefined) ?? "none",
      seller_verification_note:
        (row.seller_verification_note as string | null) ?? null,
      seller_applied_at: (row.seller_applied_at as string | null) ?? null,
      seller_decided_at: (row.seller_decided_at as string | null) ?? null,
      seller_verification_id_document_path:
        (row.seller_verification_id_document_path as string | null) ?? null,
      seller_verification_business_reg_path:
        (row.seller_verification_business_reg_path as string | null) ?? null,
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      if (data.session?.user) {
        loadProfile(data.session.user.id).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess?.user) {
        loadProfile(sess.user.id);
      } else {
        setProfile(null);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id);
  }, [loadProfile, session?.user]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      refreshProfile,
      signOut,
    }),
    [session, profile, loading, refreshProfile, signOut],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}
