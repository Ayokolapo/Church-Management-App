/**
 * Extended tests for apiRequest and getQueryFn edge cases.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { apiRequest, getQueryFn, queryClient } from "../client/src/lib/queryClient.ts";

const DUMMY_QUERY_CTX = {
  client: queryClient,
  meta: undefined,
  signal: new AbortController().signal,
  pageParam: undefined,
  direction: "forward" as const,
};

// ── apiRequest ────────────────────────────────────────────────────────────────

test("apiRequest sends GET without a body or Content-Type header", async () => {
  const originalFetch = globalThis.fetch;
  const calls: RequestInit[] = [];

  globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    calls.push(init ?? {});
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  try {
    await apiRequest("GET", "/api/members");
    assert.equal(calls.length, 1);
    assert.equal(calls[0]!.body, undefined);
    assert.equal(
      (calls[0]!.headers as Record<string, string>)?.["Content-Type"],
      undefined,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("apiRequest throws on 404 responses", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response("Not Found", { status: 404, statusText: "Not Found" })
  ) as typeof fetch;

  try {
    await assert.rejects(() => apiRequest("GET", "/api/missing"), /404/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("apiRequest throws on 500 responses", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response("Server Error", { status: 500, statusText: "Internal Server Error" })
  ) as typeof fetch;

  try {
    await assert.rejects(() => apiRequest("GET", "/api/broken"), /500/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("apiRequest passes PATCH method correctly", async () => {
  const originalFetch = globalThis.fetch;
  let method = "";

  globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    method = init?.method ?? "";
    return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;

  try {
    await apiRequest("PATCH", "/api/members/123", { status: "Committed" });
    assert.equal(method, "PATCH");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("apiRequest passes DELETE method correctly", async () => {
  const originalFetch = globalThis.fetch;
  let method = "";

  globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    method = init?.method ?? "";
    return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;

  try {
    await apiRequest("DELETE", "/api/members/123");
    assert.equal(method, "DELETE");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ── getQueryFn ────────────────────────────────────────────────────────────────

test("getQueryFn returns null for 401 when on401 is returnNull", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response("Unauthorized", { status: 401, statusText: "Unauthorized" })
  ) as typeof fetch;

  try {
    const queryFn = getQueryFn<null>({ on401: "returnNull" });
    const result = await queryFn({ queryKey: ["/api/auth/user"], ...DUMMY_QUERY_CTX });
    assert.equal(result, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getQueryFn throws for 403 even when on401 is returnNull", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response("Forbidden", { status: 403, statusText: "Forbidden" })
  ) as typeof fetch;

  try {
    const queryFn = getQueryFn({ on401: "returnNull" });
    await assert.rejects(
      () => queryFn({ queryKey: ["/api/secret"], ...DUMMY_QUERY_CTX }),
      /403/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getQueryFn joins multi-segment queryKey into URL", async () => {
  const originalFetch = globalThis.fetch;
  let calledUrl = "";

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    calledUrl = String(input);
    return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;

  try {
    const queryFn = getQueryFn({ on401: "throw" });
    await queryFn({ queryKey: ["/api/cells", "cluster-1"], ...DUMMY_QUERY_CTX });
    assert.equal(calledUrl, "/api/cells/cluster-1");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getQueryFn parses an array response correctly", async () => {
  const originalFetch = globalThis.fetch;
  const data = [{ id: "1", name: "Faith Cluster" }];

  globalThis.fetch = (async () =>
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  ) as typeof fetch;

  try {
    const queryFn = getQueryFn<typeof data>({ on401: "throw" });
    const result = await queryFn({ queryKey: ["/api/clusters"], ...DUMMY_QUERY_CTX });
    assert.deepEqual(result, data);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getQueryFn includes credentials on every request", async () => {
  const originalFetch = globalThis.fetch;
  let credentials: RequestCredentials | undefined;

  globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    credentials = init?.credentials;
    return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;

  try {
    const queryFn = getQueryFn({ on401: "throw" });
    await queryFn({ queryKey: ["/api/stats"], ...DUMMY_QUERY_CTX });
    assert.equal(credentials, "include");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
