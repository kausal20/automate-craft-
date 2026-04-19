"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const DEBUG_ENDPOINT = "http://127.0.0.1:7855/ingest/35f1ca99-d0a5-471f-8d2e-699878613661";
const DEBUG_SESSION_ID = "76d521";

function postDebugLog(payload: {
  runId: string;
  hypothesisId: string;
  location: string;
  message: string;
  data: Record<string, unknown>;
}) {
  // #region agent log
  fetch(DEBUG_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": DEBUG_SESSION_ID,
    },
    body: JSON.stringify({
      sessionId: DEBUG_SESSION_ID,
      ...payload,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

export function RuntimeDebugProbe() {
  const pathname = usePathname();

  useEffect(() => {
    postDebugLog({
      runId: "baseline",
      hypothesisId: "H1",
      location: "src/components/RuntimeDebugProbe.tsx:37",
      message: "Client route rendered",
      data: { pathname: pathname ?? "unknown" },
    });
  }, [pathname]);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      postDebugLog({
        runId: "baseline",
        hypothesisId: "H3",
        location: "src/components/RuntimeDebugProbe.tsx:49",
        message: "Unhandled window error",
        data: {
          message: event.message,
          filename: event.filename,
          line: event.lineno,
          column: event.colno,
        },
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason =
        typeof event.reason === "string"
          ? event.reason
          : event.reason?.message ?? "unknown";

      postDebugLog({
        runId: "baseline",
        hypothesisId: "H4",
        location: "src/components/RuntimeDebugProbe.tsx:67",
        message: "Unhandled promise rejection",
        data: { reason },
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
