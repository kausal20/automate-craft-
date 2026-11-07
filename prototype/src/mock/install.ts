import { handleMockRequest } from "./api";
import { seedChatsOnFirstVisit } from "./db";

/**
 * Replaces window.fetch, before the app becomes interactive:
 *   - same-origin /api/*  answered by src/mock/api.ts, never sent anywhere
 *   - same-origin other   passed through (pages, assets, Next.js internals)
 *   - any other origin    blocked and recorded
 *
 * window.__PROTOTYPE_NETWORK__ records what happened, for checking in DevTools.
 */
declare global {
  interface Window {
    __PROTOTYPE_NETWORK__?: { mocked: string[]; blocked: string[] };
  }
}

export function installMockApi() {
  const realFetch = window.fetch.bind(window);
  const network = { mocked: [] as string[], blocked: [] as string[] };
  window.__PROTOTYPE_NETWORK__ = network;

  seedChatsOnFirstVisit();

  window.fetch = async (input, init) => {
    const isRequest = input instanceof Request;
    const url = new URL(isRequest ? input.url : String(input), window.location.href);
    const method = (init?.method ?? (isRequest ? input.method : "GET")).toUpperCase();

    if (url.origin !== window.location.origin) {
      network.blocked.push(`${method} ${url.href}`);
      console.warn(`[prototype] Blocked external request: ${method} ${url.href}`);
      // Pricing's country lookup still gets a usable answer.
      if (url.hostname === "api.country.is") return Response.json({ country: "IN" });
      throw new TypeError(`Prototype blocked external request to ${url.origin}`);
    }

    if (url.pathname.startsWith("/api/")) {
      network.mocked.push(`${method} ${url.pathname}`);
      const body =
        typeof init?.body === "string" ? init.body : isRequest ? await input.clone().text() : null;
      return handleMockRequest(url, method, body);
    }

    return realFetch(input, init);
  };
}
