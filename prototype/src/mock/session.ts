/** The prototype's only "auth": one cookie that means "show signed-in UI". */
export const SESSION_COOKIE = "ac_proto_session";

export function setSessionCookie() {
  document.cookie = `${SESSION_COOKIE}=1; path=/; max-age=604800; samesite=lax`;
}

export function clearSessionCookie() {
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

export function hasSessionCookie() {
  return document.cookie.split("; ").some((c) => c.startsWith(`${SESSION_COOKIE}=1`));
}
