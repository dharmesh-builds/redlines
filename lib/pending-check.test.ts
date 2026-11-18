import { describe, expect, it } from "vitest";
import { PENDING_CHECK_KEY, PENDING_CHECK_MAX_AGE_MS, forgetPendingCheck, keepPendingCheck, takePendingCheck } from "./pending-check";

// A signed-out reader's text is kept in this browser while they sign in, then
// handed back once, and only within the life of a sign-in link.

function memoryStore() {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (k: string) => items.get(k) ?? null,
    setItem: (k: string, v: string) => void items.set(k, v),
    removeItem: (k: string) => void items.delete(k),
  };
}

const draft = {
  text: "Fees are $900 per month. Either party may end this agreement on 30 days' notice.",
  fileName: "order-form.pdf",
  source: { fileName: "order-form.pdf", format: "pdf" as const },
};

describe("pending check", () => {
  it("hands the kept text back once, then forgets it", () => {
    const store = memoryStore();
    expect(keepPendingCheck(store, draft, 1_000)).toBe(true);
    expect(takePendingCheck(store, 2_000)).toEqual(draft);
    expect(store.items.has(PENDING_CHECK_KEY)).toBe(false);
    expect(takePendingCheck(store, 3_000)).toBeNull();
  });

  it("forgets the kept text when asked", () => {
    const store = memoryStore();
    keepPendingCheck(store, draft, 0);
    forgetPendingCheck(store);
    expect(takePendingCheck(store, 1)).toBeNull();
  });

  it("drops text older than a sign-in link", () => {
    const store = memoryStore();
    keepPendingCheck(store, draft, 0);
    expect(takePendingCheck(store, PENDING_CHECK_MAX_AGE_MS + 1)).toBeNull();
    expect(store.items.has(PENDING_CHECK_KEY)).toBe(false);
  });

  it("ignores anything malformed", () => {
    const store = memoryStore();
    for (const bad of ["not json", "null", JSON.stringify({ text: 5, savedAt: 0 }), JSON.stringify({ text: "x" })]) {
      store.setItem(PENDING_CHECK_KEY, bad);
      expect(takePendingCheck(store, 1)).toBeNull();
    }
    store.setItem(PENDING_CHECK_KEY, JSON.stringify({ ...draft, source: { fileName: "a", format: "exe" }, savedAt: 0 }));
    expect(takePendingCheck(store, 1)).toBeNull();
  });

  it("reports failure instead of throwing when the browser blocks storage", () => {
    const blocked = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(keepPendingCheck(blocked, draft, 0)).toBe(false);
    expect(takePendingCheck(blocked, 0)).toBeNull();
  });
});
