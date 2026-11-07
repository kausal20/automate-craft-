"use client";

import Link from "next/link";

type SocialMiniButtonsProps = {
  resumePath: string;
  socialAuthEnabled: boolean;
  ssoEnabled: boolean;
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path
        d="M21.8 12.23c0-.76-.07-1.49-.2-2.18H12v4.13h5.49a4.7 4.7 0 0 1-2.04 3.08v2.56h3.3c1.94-1.79 3.05-4.42 3.05-7.59Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.75 0 5.06-.91 6.75-2.47l-3.3-2.56c-.91.61-2.08.97-3.45.97-2.65 0-4.89-1.79-5.7-4.2H2.89v2.64A10 10 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.3 13.74a5.98 5.98 0 0 1 0-3.48V7.62H2.89a10 10 0 0 0 0 8.76l3.41-2.64Z"
        fill="#FBBC04"
      />
      <path
        d="M12 6.03c1.49 0 2.83.51 3.88 1.52l2.9-2.9C17.06 3.03 14.75 2 12 2A10 10 0 0 0 2.89 7.62L6.3 10.26c.81-2.41 3.05-4.23 5.7-4.23Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function SocialMiniButtons({
  resumePath,
  socialAuthEnabled,
  ssoEnabled,
}: SocialMiniButtonsProps) {
  if (!socialAuthEnabled) {
    return null;
  }

  const loginSsoHref = `/login?next=${encodeURIComponent(resumePath)}&focus=sso`;

  return (
    <div
      className={`grid gap-3 ${ssoEnabled ? "sm:grid-cols-2" : "grid-cols-1"}`}
    >
      <a
        href={`/api/auth/oauth?provider=google&next=${encodeURIComponent(
          resumePath,
        )}`}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-black/8 bg-white px-4 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5"
      >
        <GoogleIcon />
        Google
      </a>

      {ssoEnabled ? (
        <Link
          href={loginSsoHref}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-black/8 bg-white px-4 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5"
        >
          Enterprise SSO
        </Link>
      ) : null}
    </div>
  );
}
