import test from "node:test";
import assert from "node:assert/strict";

import { isUnauthorizedError, redirectToLogin } from "../client/src/lib/auth-utils.ts";

test("isUnauthorizedError matches unauthorized API errors", () => {
  assert.equal(isUnauthorizedError(new Error("401: Unauthorized")), true);
  assert.equal(isUnauthorizedError(new Error("401: User Unauthorized")), true);
  assert.equal(isUnauthorizedError(new Error("500: Server error")), false);
});

test("redirectToLogin triggers a destructive toast and redirects after timeout", () => {
  const originalWindow = globalThis.window;
  const originalSetTimeout = globalThis.setTimeout;

  const toastCalls: Array<{ title: string; description: string; variant: string }> = [];
  const location = { href: "http://localhost/current" };
  let timeoutDelay: number | undefined;

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { location },
  });

  globalThis.setTimeout = ((callback: TimerHandler, delay?: number) => {
    timeoutDelay = delay;
    if (typeof callback === "function") {
      callback();
    }
    return 0 as unknown as ReturnType<typeof setTimeout>;
  }) as typeof setTimeout;

  try {
    redirectToLogin((options) => {
      toastCalls.push(options);
    });

    assert.deepEqual(toastCalls, [
      {
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      },
    ]);
    assert.equal(timeoutDelay, 500);
    assert.equal(globalThis.window.location.href, "/api/login");
  } finally {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
    globalThis.setTimeout = originalSetTimeout;
  }
});

test("redirectToLogin still redirects when no toast callback is provided", () => {
  const originalWindow = globalThis.window;
  const originalSetTimeout = globalThis.setTimeout;
  const location = { href: "http://localhost/current" };

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { location },
  });

  globalThis.setTimeout = ((callback: TimerHandler) => {
    if (typeof callback === "function") {
      callback();
    }
    return 0 as unknown as ReturnType<typeof setTimeout>;
  }) as typeof setTimeout;

  try {
    redirectToLogin();
    assert.equal(globalThis.window.location.href, "/api/login");
  } finally {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
    globalThis.setTimeout = originalSetTimeout;
  }
});
