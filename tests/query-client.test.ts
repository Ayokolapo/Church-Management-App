import test from "node:test";
import assert from "node:assert/strict";

import { apiRequest, getQueryFn, queryClient } from "../client/src/lib/queryClient.ts";

test("apiRequest sends JSON bodies and includes credentials", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const res = await apiRequest("POST", "/api/members", { firstName: "Ada" });
    assert.equal(res.status, 200);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.url, "/api/members");
    assert.equal(calls[0]?.init?.method, "POST");
    assert.equal(calls[0]?.init?.credentials, "include");
    assert.equal((calls[0]?.init?.headers as Record<string, string>)["Content-Type"], "application/json");
    assert.equal(calls[0]?.init?.body, JSON.stringify({ firstName: "Ada" }));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("apiRequest throws the response body when the request fails", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () => {
    return new Response("Forbidden", { status: 403, statusText: "Forbidden" });
  }) as typeof fetch;

  try {
    await assert.rejects(() => apiRequest("GET", "/api/secure"), /403: Forbidden/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getQueryFn returns null for 401 responses when configured to do so", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () => {
    return new Response("Unauthorized", { status: 401, statusText: "Unauthorized" });
  }) as typeof fetch;

  try {
    const queryFn = getQueryFn<{ id: string }>({ on401: "returnNull" });
    const result = await queryFn({ queryKey: ["/api/auth/user"], client: queryClient, meta: undefined, signal: new AbortController().signal, pageParam: undefined, direction: "forward" });
    assert.equal(result, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getQueryFn throws on 401 responses when configured with throw", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () => {
    return new Response("Unauthorized", { status: 401, statusText: "Unauthorized" });
  }) as typeof fetch;

  try {
    const queryFn = getQueryFn({ on401: "throw" });
    await assert.rejects(
      () => queryFn({ queryKey: ["/api/auth/user"], client: queryClient, meta: undefined, signal: new AbortController().signal, pageParam: undefined, direction: "forward" }),
      /401: Unauthorized/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getQueryFn parses JSON for successful responses", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () => {
    return new Response(JSON.stringify({ totalMembers: 42 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const queryFn = getQueryFn<{ totalMembers: number }>({ on401: "throw" });
    const result = await queryFn({ queryKey: ["/api/stats"], client: queryClient, meta: undefined, signal: new AbortController().signal, pageParam: undefined, direction: "forward" });
    assert.deepEqual(result, { totalMembers: 42 });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
