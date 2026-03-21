import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthenticatedUser } from "@/lib/automation";
import { env, isSupabaseMode } from "@/lib/env";
import { readLocalDatabase, updateLocalDatabase } from "@/lib/local-store";
import {
  createSupabaseAdminClient,
  createSupabaseRouteClient,
  createSupabaseServerComponentClient,
} from "@/lib/supabase";

/* LOGIC EXPLAINED:
Authentication is the first gate in the app, so when it fails the rest of the
data flow breaks too. The old code threw useful errors, but it did not clearly
show which auth path was running. These logs make it obvious whether the app is
using local auth or Supabase auth and where the failure happens.
*/

const LOCAL_SESSION_COOKIE = "ac_local_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

type LocalSessionPayload = {
  sub: string;
  email: string;
  name: string | null;
  mode: "local";
};

function getSessionSecret() {
  return new TextEncoder().encode(env.sessionSecret);
}

async function setLocalSessionCookie(user: {
  id: string;
  email: string;
  name: string | null;
}) {
  console.log("[auth] Setting local session cookie for user:", user.email);
  const cookieStore = await cookies();
  const token = await new SignJWT({
    email: user.email,
    name: user.name,
    mode: "local",
  } satisfies Omit<LocalSessionPayload, "sub">)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSessionSecret());

  cookieStore.set(LOCAL_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

async function clearLocalSessionCookie() {
  console.log("[auth] Clearing local session cookie.");
  const cookieStore = await cookies();
  cookieStore.delete(LOCAL_SESSION_COOKIE);
}

async function getLocalUserFromCookie(): Promise<AuthenticatedUser | null> {
  console.log("[auth] Reading local user from cookie.");
  const cookieStore = await cookies();
  const token = cookieStore.get(LOCAL_SESSION_COOKIE)?.value;

  if (!token) {
    console.log("[auth] No local session cookie found.");
    return null;
  }

  try {
    const verified = await jwtVerify<LocalSessionPayload>(token, getSessionSecret());
    const database = await readLocalDatabase();
    const user = database.users.find((entry) => entry.id === verified.payload.sub);

    if (!user) {
      console.log("[auth] Local session exists but user record was not found.");
      return null;
    }

    console.log("[auth] Local user loaded successfully:", user.email);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      mode: "local",
    };
  } catch {
    console.error("[auth] Failed to verify local session cookie.");
    return null;
  }
}

async function ensureSupabaseProfile(user: {
  id: string;
  email: string;
  name: string | null;
}) {
  if (!isSupabaseMode()) {
    return;
  }

  console.log("[auth] Ensuring Supabase profile exists for:", user.email);
  const supabaseAdmin = createSupabaseAdminClient();

  await supabaseAdmin.from("profiles").upsert(
    {
      id: user.id,
      email: user.email,
      full_name: user.name,
    },
    { onConflict: "id" },
  );
}

export async function syncSupabaseProfileFromCurrentSession() {
  if (!isSupabaseMode()) {
    console.log("[auth] Supabase mode is off. Skipping session profile sync.");
    return null;
  }

  console.log("[auth] Syncing Supabase profile from current session.");
  const supabase = await createSupabaseRouteClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user?.id || !data.user.email) {
    console.error("[auth] Could not load current Supabase session for profile sync.", error);
    return null;
  }

  const name =
    typeof data.user.user_metadata.full_name === "string"
      ? data.user.user_metadata.full_name
      : typeof data.user.user_metadata.name === "string"
        ? data.user.user_metadata.name
        : null;

  await ensureSupabaseProfile({
    id: data.user.id,
    email: data.user.email,
    name,
  });

  return {
    id: data.user.id,
    email: data.user.email,
    name,
  };
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  if (isSupabaseMode()) {
    console.log("[auth] Loading current user in Supabase mode.");
    const supabase = await createSupabaseServerComponentClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      console.error("[auth] Supabase getUser failed or returned no user.", error);
      return null;
    }

    const name =
      typeof data.user.user_metadata.full_name === "string"
        ? data.user.user_metadata.full_name
        : typeof data.user.user_metadata.name === "string"
          ? data.user.user_metadata.name
          : null;

    return {
      id: data.user.id,
      email: data.user.email ?? "",
      name,
      mode: "supabase",
    };
  }

  console.log("[auth] Loading current user in local mode.");
  return getLocalUserFromCookie();
}

export async function requireUser() {
  console.log("[auth] requireUser called.");
  const user = await getCurrentUser();

  if (!user) {
    console.log("[auth] No user found. Redirecting to /login.");
    redirect("/login");
  }

  return user;
}

export async function signUpWithCredentials(input: {
  name: string;
  email: string;
  password: string;
}) {
  console.log("[auth] Starting sign up flow for:", input.email);
  if (isSupabaseMode()) {
    console.log("[auth] Sign up is using Supabase mode.");
    const supabase = await createSupabaseRouteClient();
    const normalizedEmail = input.email.trim().toLowerCase();
    const signUpResult = await supabase.auth.signUp({
      email: normalizedEmail,
      password: input.password,
      options: {
        data: {
          full_name: input.name,
        },
      },
    });

    if (signUpResult.error) {
      console.error("[auth] Supabase sign up failed.", signUpResult.error);
      throw new Error(signUpResult.error.message);
    }

    if (!signUpResult.data.session) {
      const signInResult = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: input.password,
      });

      if (signInResult.error) {
        console.error("[auth] Supabase auto sign in after sign up failed.", signInResult.error);
        throw new Error(signInResult.error.message);
      }
    }

    if (!signUpResult.data.user?.id) {
      throw new Error("Could not create the Supabase user.");
    }

    await ensureSupabaseProfile({
      id: signUpResult.data.user.id,
      email: normalizedEmail,
      name: input.name,
    });

    return {
      user: {
        id: signUpResult.data.user.id,
        email: normalizedEmail,
        name: input.name,
        mode: "supabase" as const,
      },
    };
  }

  const normalizedEmail = input.email.trim().toLowerCase();
  console.log("[auth] Sign up is using local mode.");

  const user = await updateLocalDatabase(async (database) => {
    const existingUser = database.users.find(
      (entry) => entry.email === normalizedEmail,
    );

    if (existingUser) {
      throw new Error("An account with this email already exists.");
    }

    const createdUser = {
      id: crypto.randomUUID(),
      email: normalizedEmail,
      name: input.name,
      passwordHash: await bcrypt.hash(input.password, 10),
      createdAt: new Date().toISOString(),
    };

    database.users.push(createdUser);
    return createdUser;
  });

  await setLocalSessionCookie(user);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      mode: "local" as const,
    },
  };
}

export async function signInWithCredentials(input: {
  email: string;
  password: string;
}) {
  console.log("[auth] Starting sign in flow for:", input.email);
  if (isSupabaseMode()) {
    console.log("[auth] Sign in is using Supabase mode.");
    const supabase = await createSupabaseRouteClient();
    const normalizedEmail = input.email.trim().toLowerCase();
    const signInResult = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: input.password,
    });

    if (signInResult.error || !signInResult.data.user) {
      console.error("[auth] Supabase sign in failed.", signInResult.error);
      throw new Error(signInResult.error?.message || "Invalid login.");
    }

    const name =
      typeof signInResult.data.user.user_metadata.full_name === "string"
        ? signInResult.data.user.user_metadata.full_name
        : typeof signInResult.data.user.user_metadata.name === "string"
          ? signInResult.data.user.user_metadata.name
          : null;

    await ensureSupabaseProfile({
      id: signInResult.data.user.id,
      email: normalizedEmail,
      name,
    });

    return {
      user: {
        id: signInResult.data.user.id,
        email: normalizedEmail,
        name,
        mode: "supabase" as const,
      },
    };
  }

  const normalizedEmail = input.email.trim().toLowerCase();
  console.log("[auth] Sign in is using local mode.");
  const database = await readLocalDatabase();
  const user = database.users.find((entry) => entry.email === normalizedEmail);

  if (!user) {
    throw new Error("Invalid email or password.");
  }

  const isValid = await bcrypt.compare(input.password, user.passwordHash);

  if (!isValid) {
    throw new Error("Invalid email or password.");
  }

  await setLocalSessionCookie(user);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      mode: "local" as const,
    },
  };
}

export async function signOutCurrentUser() {
  console.log("[auth] Starting sign out flow.");
  if (isSupabaseMode()) {
    console.log("[auth] Sign out is using Supabase mode.");
    const supabase = await createSupabaseRouteClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("[auth] Supabase sign out failed.", error);
      throw new Error(error.message);
    }

    return;
  }

  console.log("[auth] Sign out is using local mode.");
  await clearLocalSessionCookie();
}
