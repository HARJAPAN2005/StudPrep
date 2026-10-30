import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = {
  title: "Profile",
  description: "Manage your StudPrep profile.",
};

export const instant = false;

/**
 * Profile page — Server Component.
 * Fetches the user's profile and passes it to the client ProfileForm.
 */
export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your personal information.
        </p>
      </div>

      {/* Avatar + name display */}
      <div className="flex items-center gap-4">
        <div
          className="h-16 w-16 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xl font-bold shrink-0"
          aria-hidden="true"
        >
          {(profile?.full_name ?? user.email ?? "?")[0].toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-foreground text-lg">
            {profile?.full_name ?? "No name set"}
          </p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <span className="inline-flex items-center mt-1 text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 px-2 py-0.5 rounded-full capitalize">
            {profile?.role ?? "student"}
          </span>
        </div>
      </div>

      {/* Edit form */}
      <section aria-labelledby="edit-profile-heading">
        <h2
          id="edit-profile-heading"
          className="text-lg font-semibold text-foreground mb-4"
        >
          Edit profile
        </h2>
        <ProfileForm
          initialFullName={profile?.full_name ?? null}
          email={user.email ?? ""}
        />
      </section>

      {/* Account info */}
      <section aria-labelledby="account-info-heading">
        <h2
          id="account-info-heading"
          className="text-lg font-semibold text-foreground mb-4"
        >
          Account information
        </h2>
        <dl className="divide-y divide-border rounded-xl border border-border max-w-md">
          <div className="flex justify-between items-center px-4 py-3">
            <dt className="text-sm text-muted-foreground">Member since</dt>
            <dd className="text-sm font-medium text-foreground">
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "—"}
            </dd>
          </div>
          <div className="flex justify-between items-center px-4 py-3">
            <dt className="text-sm text-muted-foreground">Account role</dt>
            <dd className="text-sm font-medium text-foreground capitalize">
              {profile?.role ?? "student"}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
