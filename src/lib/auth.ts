import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthenticatedUser } from "@/lib/automation";
import { env, isSupabaseAuthEnabled, isSupabaseMode } from "@/lib/env";
import { readLocalDatabase, updateLocalDatabase } from "@/lib/local-store";
import {
  createSupabaseAdminClient,
  createSupabaseRouteClient,
  createSupabaseServerComponentClient,
} from "@/lib/supabase";
import { createLogger } from "@/lib/logger";

const log = createLogger("auth");

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
  log.info("Setting local session cookie for user:", user.email);
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
  log.debug("Clearing local session cookie.");
  const cookieStore = await cookies();
  cookieStore.delete(LOCAL_SESSION_COOKIE);
}

async function getLocalUserFromCookie(): Promise<AuthenticatedUser | null> {
  log.debug("Reading local user from cookie.");
  const cookieStore = await cookies();
  const token = cookieStore.get(LOCAL_SESSION_COOKIE)?.value;

  if (!token) {
    log.debug("No local session cookie found.");
    return null;
  }

  try {
    const verified = await jwtVerify<LocalSessionPayload>(token, getSessionSecret());
    const database = await readLocalDatabase();
    const user = database.users.find((entry) => entry.id === verified.payload.sub);

    if (!user) {
      log.warn("Local session exists but user record was not found.");
      return null;
    }

    log.debug("Local user loaded successfully:", user.email);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      mode: "local",
      onboarded: !!(user as any).onboarded,
    };
  } catch {
    log.error("Failed to verify local session cookie.");
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

  log.debug("Ensuring Supabase profile exists for:", user.email);
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
  if (!isSupabaseAuthEnabled()) {
    log.debug("Supabase auth is off. Skipping session profile sync.");
    return null;
  }

  log.debug("Syncing Supabase profile from current session.");
  const supabase = await createSupabaseRouteClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user?.id || !data.user.email) {
    log.error("Could not load current Supabase session for profile sync.", error);
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
  if (isSupabaseAuthEnabled()) {
    log.debug("Loading current user in Supabase auth mode.");
    const supabase = await createSupabaseServerComponentClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      log.error("Supabase getUser failed or returned no user.", error);
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
      onboarded: !!data.user.user_metadata?.onboarded,
    };
  }

  log.debug("Loading current user in local mode.");
  return getLocalUserFromCookie();
}

export async function requireUser({ requireOnboarding = true }: { requireOnboarding?: boolean } = {}) {
  const user = await getCurrentUser();

  if (!user) {
    log.info("No user found. Redirecting to /login.");
    redirect("/login");
  }

  if (requireOnboarding && !user.onboarded) {
    log.info("User not onboarded. Redirecting to /onboarding.");
    redirect("/onboarding");
  }

  return user;
}

export async function signUpWithCredentials(input: {
  name: string;
  email: string;
  password: string;
}) {
  log.info("Starting sign up flow for:", input.email);
  if (isSupabaseAuthEnabled()) {
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
      log.error("Supabase sign up failed.", signUpResult.error);
      throw new Error(signUpResult.error.message);
    }

    if (!signUpResult.data.session) {
      const signInResult = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: input.password,
      });

      if (signInResult.error) {
        log.error("Supabase auto sign in after sign up failed.", signInResult.error);
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
        onboarded: !!signUpResult.data.user.user_metadata?.onboarded,
      },
    };
  }

  const normalizedEmail = input.email.trim().toLowerCase();
  log.info("Sign up is using local mode.");

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
      planCredits: 500,
      extraCredits: 0,
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
      onboarded: !!(user as any).onboarded,
    },
  };
}

export async function signInWithCredentials(input: {
  email: string;
  password: string;
}) {
  log.info("Starting sign in flow for:", input.email);
  if (isSupabaseAuthEnabled()) {
    const supabase = await createSupabaseRouteClient();
    const normalizedEmail = input.email.trim().toLowerCase();
    const signInResult = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: input.password,
    });

    if (signInResult.error || !signInResult.data.user) {
      log.error("Supabase sign in failed.", signInResult.error);
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
        onboarded: !!signInResult.data.user.user_metadata?.onboarded,
      },
    };
  }

  const normalizedEmail = input.email.trim().toLowerCase();
  log.info("Sign in is using local mode.");
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
      onboarded: !!(user as any).onboarded,
    },
  };
}

export async function signOutCurrentUser() {
  log.info("Starting sign out flow.");
  if (isSupabaseAuthEnabled()) {
    const supabase = await createSupabaseRouteClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      log.error("Supabase sign out failed.", error);
      throw new Error(error.message);
    }

    return;
  }

  await clearLocalSessionCookie();
}
