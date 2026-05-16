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

describe("_setLabelVisibility", () => {
  function makeGmailMock(labels) {
    const updated = [];
    return {
      mock: {
        Gmail: {
          Users: {
            Labels: {
              list: () => ({ labels }),
              update: (resource, user, labelId) => {
                updated.push({ resource, user, labelId });
              },
            },
          },
        },
      },
      updated,
    };
  }

  it("sets messageListVisibility only", () => {
    const { mock, updated } = makeGmailMock([
      { id: "Label_1", name: "test-label" },
    ]);
    const ctx = loadUtils(mock);
    ctx._setLabelVisibility("^test-label$", "hide");
    assert.deepEqual(normalize(updated), [
      {
        resource: { messageListVisibility: "hide" },
        user: "me",
        labelId: "Label_1",
      },
    ]);
  });

  it("sets labelListVisibility only", () => {
    const { mock, updated } = makeGmailMock([
      { id: "Label_1", name: "test-label" },
    ]);
    const ctx = loadUtils(mock);
    ctx._setLabelVisibility("^test-label$", undefined, "showIfUnread");
    assert.deepEqual(normalize(updated), [
      {
        resource: { labelListVisibility: "labelShowIfUnread" },
        user: "me",
        labelId: "Label_1",
      },
    ]);
  });

  it("sets both visibility properties in a single update", () => {
    const { mock, updated } = makeGmailMock([
      { id: "Label_1", name: "test-label" },
    ]);
    const ctx = loadUtils(mock);
    ctx._setLabelVisibility("^test-label$", "hide", "hide");
    assert.deepEqual(normalize(updated), [
      {
        resource: {
          messageListVisibility: "hide",
          labelListVisibility: "labelHide",
        },
        user: "me",
        labelId: "Label_1",
      },
    ]);
  });

  it("maps labelList values to API format", () => {
    const { mock, updated } = makeGmailMock([
      { id: "Label_1", name: "test-label" },
    ]);
    const ctx = loadUtils(mock);
    ctx._setLabelVisibility("^test-label$", undefined, "show");
    assert.deepEqual(normalize(updated), [
      {
        resource: { labelListVisibility: "labelShow" },
        user: "me",
        labelId: "Label_1",
      },
    ]);
  });

  it("updates all labels matching a regex pattern", () => {
    const { mock, updated } = makeGmailMock([
      { id: "Label_1", name: "expireafter/2d" },
      { id: "Label_2", name: "expireafter/30d" },
      { id: "Label_3", name: "inbox" },
    ]);
    const ctx = loadUtils(mock);
    ctx._setLabelVisibility("^expireafter/", "hide");
    assert.equal(updated.length, 2);
    assert.equal(updated[0].labelId, "Label_1");
    assert.equal(updated[1].labelId, "Label_2");
  });

  it("throws on invalid messageList value", () => {
    const { mock } = makeGmailMock([{ id: "Label_1", name: "test" }]);
    const ctx = loadUtils(mock);
    assert.throws(
      () => ctx._setLabelVisibility("^test$", "invalid"),
      /Invalid messageList visibility/,
    );
  });

  it("throws on invalid labelList value", () => {
    const { mock } = makeGmailMock([{ id: "Label_1", name: "test" }]);
    const ctx = loadUtils(mock);
    assert.throws(
      () => ctx._setLabelVisibility("^test$", undefined, "invalid"),
      /Invalid labelList visibility/,
    );
  });

  it("throws when neither messageList nor labelList is provided", () => {
    const { mock } = makeGmailMock([{ id: "Label_1", name: "test" }]);
    const ctx = loadUtils(mock);
    assert.throws(
      () => ctx._setLabelVisibility("^test$"),
      /At least one of messageList or labelList is required/,
    );
  });

  it("throws when no labels match the pattern", () => {
    const { mock } = makeGmailMock([{ id: "Label_1", name: "other" }]);
    const ctx = loadUtils(mock);
    assert.throws(
      () => ctx._setLabelVisibility("^nonexistent", "hide"),
      /No labels matching pattern/,
    );
  });
});

describe("_buildLabelMap", () => {
  it("builds a name-to-id map from Gmail labels", () => {
    const ctx = loadUtils({
      Gmail: {
        Users: {
          Labels: {
            list: () => ({
              labels: [
                { name: "inbox", id: "INBOX" },
                { name: "github", id: "Label_1" },
              ],
            }),
          },
        },
      },
    });
    const result = ctx._buildLabelMap();
    assert.deepEqual(normalize(result), {
      inbox: "INBOX",
      github: "Label_1",
    });
  });

  it("caches the result across calls", () => {
    let listCalls = 0;
    const ctx = loadUtils({
      Gmail: {
        Users: {
          Labels: {
            list: () => {
              listCalls++;
              return { labels: [{ name: "a", id: "A" }] };
            },
          },
        },
      },
    });
    ctx._buildLabelMap();
    ctx._buildLabelMap();
    assert.equal(listCalls, 1);
  });

  it("refreshes after _invalidateLabelMap", () => {
    let listCalls = 0;
    const ctx = loadUtils({
      Gmail: {
        Users: {
          Labels: {
            list: () => {
              listCalls++;
              return { labels: [{ name: "a", id: "A" }] };
            },
          },
        },
      },
    });
    ctx._buildLabelMap();
    ctx._invalidateLabelMap();
    ctx._buildLabelMap();
    assert.equal(listCalls, 2);
  });
});

describe("_applyLabels", () => {
  it("applies all labels in a single batch API call", () => {
    let modifyCall = null;
    const thread = { getId: () => "thread-123" };
    const ctx = loadUtils({
      GmailApp: {
        getUserLabelByName: (name) => ({ getName: () => name }),
        createLabel: () => assert.fail("should not create"),
      },
      Gmail: {
        Users: {
          Labels: {
            list: () => ({
              labels: [
                { name: "label1", id: "Label_1" },
                { name: "label2", id: "Label_2" },
              ],
            }),
          },
          Threads: {
            modify: (resource, userId, threadId) => {
              modifyCall = { resource, userId, threadId };
            },
          },
        },
      },
    });
    ctx._applyLabels(thread, ["label1", "label2"]);
    assert.deepEqual(normalize(modifyCall), {
      resource: { addLabelIds: ["Label_1", "Label_2"] },
      userId: "me",
      threadId: "thread-123",
    });
  });

  it("deduplicates label names", () => {
    let modifyCall = null;
    const thread = { getId: () => "thread-1" };
    const ctx = loadUtils({
      GmailApp: {
        getUserLabelByName: (name) => ({ getName: () => name }),
        createLabel: () => assert.fail("should not create"),
      },
      Gmail: {
        Users: {
          Labels: {
            list: () => ({
              labels: [{ name: "dup", id: "Label_D" }],
            }),
          },
          Threads: {
            modify: (resource, userId, threadId) => {
              modifyCall = { resource, userId, threadId };
            },
          },
        },
      },
    });
    ctx._applyLabels(thread, ["dup", "dup", "dup"]);
    assert.deepEqual(normalize(modifyCall.resource), {
      addLabelIds: ["Label_D"],
    });
  });

  it("refreshes label map when a newly created label is missing", () => {
    let listCalls = 0;
    let modifyCall = null;
    const thread = { getId: () => "thread-1" };
    const ctx = loadUtils({
      GmailApp: {
        getUserLabelByName: (name) =>
          name === "existing" ? { getName: () => name } : null,
        createLabel: (name) => ({ getName: () => name }),
      },
      Gmail: {
        Users: {
          Labels: {
            list: () => {
              listCalls++;
              const labels = [{ name: "existing", id: "Label_E" }];
              if (listCalls > 1) {
                labels.push({ name: "new-label", id: "Label_N" });
              }
              return { labels };
            },
          },
          Threads: {
            modify: (resource, userId, threadId) => {
              modifyCall = { resource, userId, threadId };
            },
          },
        },
      },
    });
    ctx._applyLabels(thread, ["existing", "new-label"]);
    assert.equal(listCalls, 2);
    assert.deepEqual(normalize(modifyCall.resource), {
      addLabelIds: ["Label_E", "Label_N"],
    });
  });
});

describe("_expandLabelHierarchy", () => {
  let ctx;
  beforeEach(() => {
    ctx = loadUtils();
  });

  it("returns a simple label as-is", () => {
    assert.deepEqual(normalize(ctx._expandLabelHierarchy(["inbox"])), [
      "inbox",
    ]);
  });

  it("expands a two-level label", () => {
    assert.deepEqual(normalize(ctx._expandLabelHierarchy(["list/fedora"])), [
      "list",
      "list/fedora",
    ]);
  });

  it("expands a three-level label", () => {
    assert.deepEqual(
      normalize(ctx._expandLabelHierarchy(["list/fedora/devel"])),
      ["list", "list/fedora", "list/fedora/devel"],
    );
  });

  it("does not expand labels prefixed with !", () => {
    assert.deepEqual(
      normalize(ctx._expandLabelHierarchy(["!expireafter/30d"])),
      ["expireafter/30d"],
    );
  });

  it("handles a mix of ! and regular labels", () => {
    assert.deepEqual(
      normalize(
        ctx._expandLabelHierarchy(["list/fedora/devel", "!expireafter/30d"]),
      ),
      ["list", "list/fedora", "list/fedora/devel", "expireafter/30d"],
    );
  });

  it("deduplicates across multiple labels sharing a prefix", () => {
    assert.deepEqual(
      normalize(
        ctx._expandLabelHierarchy(["list/fedora/devel", "list/fedora/cloud"]),
      ),
      ["list", "list/fedora", "list/fedora/devel", "list/fedora/cloud"],
    );
  });

  it("deduplicates ! labels that overlap with expanded labels", () => {
    assert.deepEqual(
      normalize(ctx._expandLabelHierarchy(["list/foo", "!list/foo"])),
      ["list", "list/foo"],
    );
  });

  it("returns empty array for empty input", () => {
    assert.deepEqual(normalize(ctx._expandLabelHierarchy([])), []);
  });
});
