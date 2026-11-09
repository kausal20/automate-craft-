import { test } from "node:test";
import assert from "node:assert/strict";
import { describeAlert, prettyAppName } from "./messages.ts";

const reasons = ["app_disconnected", "repeated_failures", "no_activity_24h"] as const;

test("every reason has English and Hindi text with an action", () => {
  for (const reason of reasons) {
    for (const lang of ["en", "hi"] as const) {
      const t = describeAlert({
        reason,
        automationId: "abc",
        automationName: "Lead follow-up",
        detail: { apps: ["indiamart"] },
        lang,
      });
      assert.ok(t.title.length > 0 && t.body.length > 0 && t.actionLabel.length > 0);
      assert.ok(t.actionHref.startsWith("/dashboard/"));
    }
  }
});

test("no developer words, codes or braces reach the owner", () => {
  const banned = /(_|\{|\}|json|error code|stack|undefined|null|webhook|api|oauth|\b4\d\d\b|\b5\d\d\b)/i;
  for (const reason of reasons) {
    const t = describeAlert({
      reason,
      automationId: "abc",
      automationName: "Lead follow-up",
      detail: { apps: ["indiamart", "google_sheets"] },
      lang: "en",
    });
    assert.doesNotMatch(`${t.title} ${t.body} ${t.actionLabel}`, banned);
  }
});

test("disconnected app names the app in plain words", () => {
  const t = describeAlert({
    reason: "app_disconnected",
    automationId: "abc",
    automationName: "Leads",
    detail: { apps: ["indiamart", "google_sheets"] },
  });
  assert.match(t.body, /IndiaMART and Google Sheets/);
  assert.equal(t.actionHref, "/dashboard/apps");
});

test("missing detail still reads naturally", () => {
  const t = describeAlert({ reason: "app_disconnected", automationId: "a", automationName: "" });
  assert.match(t.title, /^Your automation has stopped$/);
  assert.match(t.body, /one of your apps/);
});

test("prettyAppName handles unknown keys", () => {
  assert.equal(prettyAppName("my_new-app"), "My New App");
});
