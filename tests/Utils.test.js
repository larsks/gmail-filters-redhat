import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { beforeEach, describe, it, mock } from "node:test";
import vm from "node:vm";

// vm.createContext gives the sandbox its own built-in constructors, so arrays
// returned from the VM are instances of the VM's Array, not the main context's.
// deepStrictEqual treats that prototype mismatch as a failure even when the
// contents are identical. JSON round-tripping reconstructs the data using the
// main context's built-ins, making the comparison work.
function normalize(obj) {
  return JSON.parse(JSON.stringify(obj));
}

const utilsSource = readFileSync("Utils.js", "utf8");

function loadUtils(globals = {}) {
  const context = vm.createContext({
    console,
    Error,
    String,
    parseInt,
    RegExp,
    ...globals,
  });
  vm.runInContext(utilsSource, context);
  return context;
}

describe("_parseDuration", () => {
  let ctx;
  beforeEach(() => {
    ctx = loadUtils();
  });

  it("parses minutes", () => {
    assert.equal(ctx._parseDuration("30m"), 30 * 60 * 1000);
  });

  it("parses hours", () => {
    assert.equal(ctx._parseDuration("2h"), 2 * 60 * 60 * 1000);
  });

  it("parses days", () => {
    assert.equal(ctx._parseDuration("5d"), 5 * 24 * 60 * 60 * 1000);
  });

  it("parses weeks", () => {
    assert.equal(ctx._parseDuration("1w"), 7 * 24 * 60 * 60 * 1000);
  });

  it("parses years", () => {
    assert.equal(ctx._parseDuration("1y"), 365 * 24 * 60 * 60 * 1000);
  });

  it("throws on invalid format", () => {
    assert.throws(() => ctx._parseDuration("abc"), /Invalid duration/);
  });

  it("throws on unknown unit", () => {
    assert.throws(() => ctx._parseDuration("5x"), /Invalid duration/);
  });

  it("throws on empty string", () => {
    assert.throws(() => ctx._parseDuration(""), /Invalid duration/);
  });
});

describe("_getExpireAfterValue", () => {
  let ctx;
  beforeEach(() => {
    ctx = loadUtils();
  });

  function makeThread(labelNames) {
    return {
      getLabels: () =>
        labelNames.map((name) => ({
          getName: () => name,
        })),
    };
  }

  it("returns the value from an expireafter label", () => {
    const thread = makeThread(["expireafter/30d"]);
    assert.equal(ctx._getExpireAfterValue(thread), "30d");
  });

  it("returns null when no expireafter label exists", () => {
    const thread = makeThread(["inbox", "important"]);
    assert.equal(ctx._getExpireAfterValue(thread), null);
  });

  it("returns the first matching label", () => {
    const thread = makeThread(["inbox", "expireafter/7d", "expireafter/14d"]);
    assert.equal(ctx._getExpireAfterValue(thread), "7d");
  });

  it("does not match bare expireafter without a value", () => {
    const thread = makeThread(["expireafter/"]);
    assert.equal(ctx._getExpireAfterValue(thread), null);
  });
});

describe("_getExpireAfterLabels", () => {
  it("returns only expireafter labels", () => {
    const labels = [
      { getName: () => "inbox" },
      { getName: () => "expireafter/7d" },
      { getName: () => "expireafter/30d" },
      { getName: () => "archiveafter/1d" },
    ];
    const ctx = loadUtils({
      GmailApp: { getUserLabels: () => labels },
    });
    const result = ctx._getExpireAfterLabels();
    assert.equal(result.length, 2);
    assert.equal(result[0].getName(), "expireafter/7d");
    assert.equal(result[1].getName(), "expireafter/30d");
  });

  it("returns empty array when no labels match", () => {
    const ctx = loadUtils({
      GmailApp: { getUserLabels: () => [{ getName: () => "inbox" }] },
    });
    assert.deepEqual(ctx._getExpireAfterLabels(), []);
  });
});

describe("_getArchiveAfterLabels", () => {
  it("returns only archiveafter labels", () => {
    const labels = [
      { getName: () => "inbox" },
      { getName: () => "archiveafter/1d" },
      { getName: () => "expireafter/7d" },
      { getName: () => "archiveafter/2w" },
    ];
    const ctx = loadUtils({
      GmailApp: { getUserLabels: () => labels },
    });
    const result = ctx._getArchiveAfterLabels();
    assert.equal(result.length, 2);
    assert.equal(result[0].getName(), "archiveafter/1d");
    assert.equal(result[1].getName(), "archiveafter/2w");
  });

  it("returns empty array when no labels match", () => {
    const ctx = loadUtils({
      GmailApp: { getUserLabels: () => [{ getName: () => "inbox" }] },
    });
    assert.deepEqual(ctx._getArchiveAfterLabels(), []);
  });
});

describe("_formatDateForSearch", () => {
  let ctx;
  beforeEach(() => {
    ctx = loadUtils();
  });

  it("formats a date as YYYY/MM/DD", () => {
    const date = new Date(2024, 0, 15);
    assert.equal(ctx._formatDateForSearch(date), "2024/01/15");
  });

  it("pads single-digit month and day", () => {
    const date = new Date(2024, 2, 5);
    assert.equal(ctx._formatDateForSearch(date), "2024/03/05");
  });

  it("handles December 31", () => {
    const date = new Date(2024, 11, 31);
    assert.equal(ctx._formatDateForSearch(date), "2024/12/31");
  });
});

describe("_withRetry", () => {
  let sleepCalls;
  let ctx;

  beforeEach(() => {
    sleepCalls = [];
    ctx = loadUtils({
      Utilities: {
        sleep: (ms) => sleepCalls.push(ms),
      },
    });
  });

  it("returns the result on first success", () => {
    const result = ctx._withRetry(() => 42, "test");
    assert.equal(result, 42);
    assert.equal(sleepCalls.length, 0);
  });

  it("retries on failure then returns on success", () => {
    let calls = 0;
    const result = ctx._withRetry(() => {
      calls++;
      if (calls < 3) throw new Error("fail");
      return "ok";
    }, "test");
    assert.equal(result, "ok");
    assert.equal(calls, 3);
    assert.equal(sleepCalls.length, 2);
  });

  it("throws after exhausting retries", () => {
    assert.throws(
      () =>
        ctx._withRetry(
          () => {
            throw new Error("always fails");
          },
          "test",
          3,
        ),
      /always fails/,
    );
  });

  it("uses exponential backoff for sleep", () => {
    let calls = 0;
    ctx._withRetry(
      () => {
        calls++;
        if (calls < 4) throw new Error("fail");
        return "ok";
      },
      "test",
      5,
    );
    assert.deepEqual(sleepCalls, [1000, 2000, 4000]);
  });
});

describe("_createFilterWithRetry", () => {
  it("calls Gmail.Users.Settings.Filters.create with correct args", () => {
    let captured;
    const ctx = loadUtils({
      Gmail: {
        Users: {
          Settings: {
            Filters: {
              create: (resource, user) => {
                captured = { resource, user };
                return "filter-result";
              },
            },
          },
        },
      },
      Utilities: { sleep: () => {} },
    });
    const resource = { criteria: { from: "test@example.com" } };
    const result = ctx._createFilterWithRetry(resource);
    assert.equal(result, "filter-result");
    assert.deepEqual(captured, { resource, user: "me" });
  });
});

describe("_deleteFilterWithRetry", () => {
  it("calls Gmail.Users.Settings.Filters.remove with correct args", () => {
    let captured;
    const ctx = loadUtils({
      Gmail: {
        Users: {
          Settings: {
            Filters: {
              remove: (user, filterId) => {
                captured = { user, filterId };
              },
            },
          },
        },
      },
      Utilities: { sleep: () => {} },
    });
    ctx._deleteFilterWithRetry("filter-123");
    assert.deepEqual(captured, { user: "me", filterId: "filter-123" });
  });
});

describe("_getOrCreateLabel", () => {
  it("returns existing label", () => {
    const label = { getName: () => "test" };
    const ctx = loadUtils({
      GmailApp: {
        getUserLabelByName: (name) => (name === "test" ? label : null),
        createLabel: () => assert.fail("should not create"),
      },
    });
    assert.equal(ctx._getOrCreateLabel("test"), label);
  });

  it("creates label when it does not exist", () => {
    const created = { getName: () => "newlabel" };
    const ctx = loadUtils({
      GmailApp: {
        getUserLabelByName: () => null,
        createLabel: (name) => {
          assert.equal(name, "newlabel");
          return created;
        },
      },
    });
    assert.equal(ctx._getOrCreateLabel("newlabel"), created);
  });

  it("creates nested labels including parents", () => {
    const createdLabels = {};
    const ctx = loadUtils({
      GmailApp: {
        getUserLabelByName: () => null,
        createLabel: (name) => {
          const label = { getName: () => name };
          createdLabels[name] = label;
          return label;
        },
      },
    });
    const result = ctx._getOrCreateLabel("a/b/c");
    assert.equal(result.getName(), "a/b/c");
    assert.ok(createdLabels["a"]);
    assert.ok(createdLabels["a/b"]);
    assert.ok(createdLabels["a/b/c"]);
  });

  it("uses cache on repeated calls", () => {
    let lookupCount = 0;
    const label = { getName: () => "cached" };
    const ctx = loadUtils({
      GmailApp: {
        getUserLabelByName: () => {
          lookupCount++;
          return label;
        },
        createLabel: () => assert.fail("should not create"),
      },
    });
    ctx._getOrCreateLabel("cached");
    ctx._getOrCreateLabel("cached");
    assert.equal(lookupCount, 1);
  });
});

describe("_getOrCreateLabels", () => {
  it("returns labels for all names", () => {
    const ctx = loadUtils({
      GmailApp: {
        getUserLabelByName: (name) => ({ getName: () => name }),
        createLabel: () => assert.fail("should not create"),
      },
    });
    const result = ctx._getOrCreateLabels(["a", "b", "c"]);
    assert.equal(result.length, 3);
    assert.equal(result[0].getName(), "a");
    assert.equal(result[1].getName(), "b");
    assert.equal(result[2].getName(), "c");
  });
});

describe("_applyLabels", () => {
  it("adds all labels to the thread", () => {
    const addedLabels = [];
    const thread = {
      addLabel: (label) => addedLabels.push(label.getName()),
    };
    const ctx = loadUtils({
      GmailApp: {
        getUserLabelByName: (name) => ({ getName: () => name }),
        createLabel: () => assert.fail("should not create"),
      },
    });
    ctx._applyLabels(thread, ["label1", "label2"]);
    assert.deepEqual(addedLabels, ["label1", "label2"]);
  });
});

describe("_getHeaderMap", () => {
  let ctx;
  beforeEach(() => {
    ctx = loadUtils();
  });

  it("parses simple headers", () => {
    const message = {
      getRawContent: () =>
        "From: alice@example.com\r\nTo: bob@example.com\r\n\r\nBody",
    };
    const headers = normalize(ctx._getHeaderMap(message));
    assert.deepEqual(headers["from"], ["alice@example.com"]);
    assert.deepEqual(headers["to"], ["bob@example.com"]);
  });

  it("lowercases header keys", () => {
    const message = {
      getRawContent: () => "Content-Type: text/plain\r\n\r\nBody",
    };
    const headers = normalize(ctx._getHeaderMap(message));
    assert.deepEqual(headers["content-type"], ["text/plain"]);
  });

  it("handles folded headers", () => {
    const message = {
      getRawContent: () =>
        "Subject: This is a\r\n very long subject\r\n\r\nBody",
    };
    const headers = normalize(ctx._getHeaderMap(message));
    assert.deepEqual(headers["subject"], ["This is a very long subject"]);
  });

  it("handles multiple values for the same key", () => {
    const message = {
      getRawContent: () =>
        "Received: from server1\r\nReceived: from server2\r\n\r\nBody",
    };
    const headers = normalize(ctx._getHeaderMap(message));
    assert.deepEqual(headers["received"], ["from server1", "from server2"]);
  });

  it("handles tab-folded headers", () => {
    const message = {
      getRawContent: () => "Subject: Hello\r\n\tWorld\r\n\r\nBody",
    };
    const headers = normalize(ctx._getHeaderMap(message));
    assert.deepEqual(headers["subject"], ["Hello World"]);
  });

  it("ignores body content", () => {
    const message = {
      getRawContent: () =>
        "From: test@example.com\r\n\r\nFake-Header: not-a-header",
    };
    const headers = ctx._getHeaderMap(message);
    assert.equal(headers["fake-header"], undefined);
  });
});
