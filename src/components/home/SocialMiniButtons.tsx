"use client";

type SocialMiniButtonsProps = {
  resumePath: string;
  socialAuthEnabled: boolean;
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

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M16.7 12.6c0-2.16 1.76-3.2 1.84-3.24-1-.47-2.56-.54-3.49-.03-.99.52-1.94.54-2.87 0-.94-.55-2.39-.49-3.43.02-1.46.71-2.49 2.42-2.49 4.19 0 1.2.44 2.45.98 3.38.74 1.26 1.62 2.66 2.78 2.61 1.1-.05 1.51-.7 2.84-.7 1.33 0 1.7.7 2.85.67 1.18-.02 1.93-1.25 2.67-2.51.43-.74.6-1.1.94-1.93-2.68-1.02-2.62-3.83-2.62-4.46Zm-2.44-7.5c.61-.74 1.02-1.76.91-2.79-.88.04-1.95.59-2.58 1.33-.57.66-1.07 1.71-.93 2.72.98.08 1.98-.5 2.6-1.26Z" />
    </svg>
  );
}

export default function SocialMiniButtons({
  resumePath,
  socialAuthEnabled,
}: SocialMiniButtonsProps) {
  if (!socialAuthEnabled) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <a
        href={`/api/auth/oauth?provider=google&next=${encodeURIComponent(
          resumePath,
        )}`}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-black/8 bg-white px-4 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5"
      >
        <GoogleIcon />
        Google
      </a>

      <a
        href={`/api/auth/oauth?provider=apple&next=${encodeURIComponent(
          resumePath,
        )}`}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-black/8 bg-white px-4 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5"
      >
        <AppleIcon />
        Apple
      </a>
    </div>
  );
}
