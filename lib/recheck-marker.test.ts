import { describe, expect, it } from "vitest";
import { RECHECK_KEY_PREFIX, RECHECK_MAX_AGE_MS, clearRecheck, markRecheckStarted, recheckState } from "./recheck-marker";

// Finding 4: a reload during "Check again" showed the old report as if no
// check were running. The browser now remembers that a re-check started.

function memoryStore() {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (k: string) => items.get(k) ?? null,
    setItem: (k: string, v: string) => void items.set(k, v),
    removeItem: (k: string) => void items.delete(k),
  };
}

const DOC = "22a3dede-3530-4a03-96a6-8b2d11b71ca7";

describe("re-check note", () => {
  it("after a reload, a re-check is still running while the same report shows", () => {
    const store = memoryStore();
    markRecheckStarted(store, DOC, "report-1", 1_000);
    expect(recheckState(store, DOC, "report-1", 1_000 + 30_000)).toBe("running");
    expect(store.items.has(`${RECHECK_KEY_PREFIX}${DOC}`)).toBe(true);
  });

  it("is over once a different report shows, and forgets the note", () => {
    const store = memoryStore();
    markRecheckStarted(store, DOC, "report-1", 1_000);
    expect(recheckState(store, DOC, "report-2", 20_000)).toBe("none");
    expect(store.items.size).toBe(0);
  });

  it("works for a document that had no report yet", () => {
    const store = memoryStore();
    markRecheckStarted(store, DOC, null, 1_000);
    expect(recheckState(store, DOC, null, 5_000)).toBe("running");
    expect(recheckState(store, DOC, "report-1", 6_000)).toBe("none");
  });

  it("times out once, after the maximum age, then says nothing", () => {
    const store = memoryStore();
    markRecheckStarted(store, DOC, "report-1", 1_000);
    expect(recheckState(store, DOC, "report-1", 1_000 + RECHECK_MAX_AGE_MS)).toBe("timed-out");
    expect(recheckState(store, DOC, "report-1", 1_000 + RECHECK_MAX_AGE_MS + 1)).toBe("none");
  });

  it("treats a note from the future (clock moved back) as timed out", () => {
    const store = memoryStore();
    markRecheckStarted(store, DOC, "report-1", 50_000);
    expect(recheckState(store, DOC, "report-1", 10_000)).toBe("timed-out");
  });

  it("keeps each document's note separate", () => {
    const store = memoryStore();
    markRecheckStarted(store, DOC, "report-1", 1_000);
    expect(recheckState(store, "other-doc", "report-9", 2_000)).toBe("none");
    expect(recheckState(store, DOC, "report-1", 2_000)).toBe("running");
  });

  it("ignores a damaged note", () => {
    const store = memoryStore();
    store.setItem(`${RECHECK_KEY_PREFIX}${DOC}`, "{not json");
    expect(recheckState(store, DOC, "report-1", 2_000)).toBe("none");
    store.setItem(`${RECHECK_KEY_PREFIX}${DOC}`, JSON.stringify({ startedAt: "soon", reportId: "report-1" }));
    expect(recheckState(store, DOC, "report-1", 2_000)).toBe("none");
  });

  it("clears on request, and survives storage that throws", () => {
    const store = memoryStore();
    markRecheckStarted(store, DOC, "report-1", 1_000);
    clearRecheck(store, DOC);
    expect(store.items.size).toBe(0);

    const broken = {
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
    expect(() => markRecheckStarted(broken, DOC, "report-1")).not.toThrow();
    expect(recheckState(broken, DOC, "report-1")).toBe("none");
  });
});
