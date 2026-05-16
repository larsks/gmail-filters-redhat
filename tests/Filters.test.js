import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import vm from "node:vm";

function normalize(obj) {
  return JSON.parse(JSON.stringify(obj));
}

const utilsSource = readFileSync("Utils.js", "utf8");
const filtersSource = readFileSync("Filters.js", "utf8");

function loadFilters(filters, extras = {}) {
  const source = filtersSource.replace(
    /^const FILTERS = \[[\s\S]*?^\];/m,
    `const FILTERS = ${JSON.stringify(filters)};`,
  );
  const context = vm.createContext({
    console,
    Gmail: {},
    GmailApp: {},
    JSON,
    Object,
    Array,
    Map,
    Error,
    String,
    parseInt,
    RegExp,
  });
  vm.runInContext(utilsSource, context);
  vm.runInContext(source, context);
  Object.assign(context, extras);
  return context;
}

describe("_buildFilterResources", () => {
  it("adds IMPORTANT to addLabelIds when alwaysImportant is set", () => {
    const ctx = loadFilters([
      {
        criteria: { from: "boss@example.com" },
        actions: { alwaysImportant: true },
      },
    ]);
    const result = normalize(ctx._buildFilterResources({}));
    assert.deepEqual(result, [
      {
        criteria: { from: "boss@example.com" },
        action: { addLabelIds: ["IMPORTANT"] },
      },
    ]);
  });

  it("combines alwaysImportant with other system labels", () => {
    const ctx = loadFilters([
      {
        criteria: { from: "test@example.com" },
        actions: { star: true, alwaysImportant: true },
      },
    ]);
    const result = normalize(ctx._buildFilterResources({}));
    assert.deepEqual(result, [
      {
        criteria: { from: "test@example.com" },
        action: { addLabelIds: ["STARRED", "IMPORTANT"] },
      },
    ]);
  });

  it("combines alwaysImportant with user labels", () => {
    const ctx = loadFilters([
      {
        criteria: { from: "test@example.com" },
        actions: { labels: ["!my-label"], alwaysImportant: true },
      },
    ]);
    const labelMap = { "my-label": "Label_1" };
    const result = normalize(ctx._buildFilterResources(labelMap));
    assert.deepEqual(result, [
      {
        criteria: { from: "test@example.com" },
        action: { addLabelIds: ["Label_1", "IMPORTANT"] },
      },
    ]);
  });

  it("does not add IMPORTANT when alwaysImportant is not set", () => {
    const ctx = loadFilters([
      {
        criteria: { from: "test@example.com" },
        actions: { star: true },
      },
    ]);
    const result = normalize(ctx._buildFilterResources({}));
    assert.deepEqual(result, [
      {
        criteria: { from: "test@example.com" },
        action: { addLabelIds: ["STARRED"] },
      },
    ]);
  });

  it("removes INBOX when archive is set", () => {
    const ctx = loadFilters([
      {
        criteria: { query: "list:test" },
        actions: { archive: true },
      },
    ]);
    const result = normalize(ctx._buildFilterResources({}));
    assert.deepEqual(result, [
      {
        criteria: { query: "list:test" },
        action: { removeLabelIds: ["INBOX"] },
      },
    ]);
  });

  it("removes SPAM when neverSpam is set", () => {
    const ctx = loadFilters([
      {
        criteria: { from: "trusted@example.com" },
        actions: { neverSpam: true },
      },
    ]);
    const result = normalize(ctx._buildFilterResources({}));
    assert.deepEqual(result, [
      {
        criteria: { from: "trusted@example.com" },
        action: { removeLabelIds: ["SPAM"] },
      },
    ]);
  });

  it("removes IMPORTANT when neverImportant is set", () => {
    const ctx = loadFilters([
      {
        criteria: { from: "noise@example.com" },
        actions: { neverImportant: true },
      },
    ]);
    const result = normalize(ctx._buildFilterResources({}));
    assert.deepEqual(result, [
      {
        criteria: { from: "noise@example.com" },
        action: { removeLabelIds: ["IMPORTANT"] },
      },
    ]);
  });

  it("adds TRASH when trash is set", () => {
    const ctx = loadFilters([
      {
        criteria: { from: "spam@example.com" },
        actions: { trash: true },
      },
    ]);
    const result = normalize(ctx._buildFilterResources({}));
    assert.deepEqual(result, [
      {
        criteria: { from: "spam@example.com" },
        action: { addLabelIds: ["TRASH"] },
      },
    ]);
  });

  it("adds STARRED when star is set", () => {
    const ctx = loadFilters([
      {
        criteria: { query: "needinfo" },
        actions: { star: true },
      },
    ]);
    const result = normalize(ctx._buildFilterResources({}));
    assert.deepEqual(result, [
      {
        criteria: { query: "needinfo" },
        action: { addLabelIds: ["STARRED"] },
      },
    ]);
  });

  it("combines archive and neverSpam into removeLabelIds", () => {
    const ctx = loadFilters([
      {
        criteria: { query: "list:test" },
        actions: { archive: true, neverSpam: true },
      },
    ]);
    const result = normalize(ctx._buildFilterResources({}));
    assert.deepEqual(result, [
      {
        criteria: { query: "list:test" },
        action: { removeLabelIds: ["INBOX", "SPAM"] },
      },
    ]);
  });

  it("combines trash and neverImportant", () => {
    const ctx = loadFilters([
      {
        criteria: { subject: "junk" },
        actions: { trash: true, neverImportant: true },
      },
    ]);
    const result = normalize(ctx._buildFilterResources({}));
    assert.deepEqual(result, [
      {
        criteria: { subject: "junk" },
        action: {
          addLabelIds: ["TRASH"],
          removeLabelIds: ["IMPORTANT"],
        },
      },
    ]);
  });

  it("produces empty action when no actions are set", () => {
    const ctx = loadFilters([
      {
        criteria: { from: "someone@example.com" },
        actions: {},
      },
    ]);
    const result = normalize(ctx._buildFilterResources({}));
    assert.deepEqual(result, [
      {
        criteria: { from: "someone@example.com" },
        action: {},
      },
    ]);
  });

  it("expands hierarchical user labels into separate resources", () => {
    const ctx = loadFilters([
      {
        criteria: { query: "list:test" },
        actions: { labels: ["list/fedora/devel"], neverSpam: true },
      },
    ]);
    const labelMap = {
      list: "Label_1",
      "list/fedora": "Label_2",
      "list/fedora/devel": "Label_3",
    };
    const result = normalize(ctx._buildFilterResources(labelMap));
    assert.deepEqual(result, [
      {
        criteria: { query: "list:test" },
        action: { addLabelIds: ["Label_1"], removeLabelIds: ["SPAM"] },
      },
      {
        criteria: { query: "list:test" },
        action: { addLabelIds: ["Label_2"], removeLabelIds: ["SPAM"] },
      },
      {
        criteria: { query: "list:test" },
        action: { addLabelIds: ["Label_3"], removeLabelIds: ["SPAM"] },
      },
    ]);
  });

  it("does not expand ! labels but still creates a resource", () => {
    const ctx = loadFilters([
      {
        criteria: { query: "list:test" },
        actions: { labels: ["!expireafter/30d"] },
      },
    ]);
    const labelMap = { "expireafter/30d": "Label_10" };
    const result = normalize(ctx._buildFilterResources(labelMap));
    assert.deepEqual(result, [
      {
        criteria: { query: "list:test" },
        action: { addLabelIds: ["Label_10"] },
      },
    ]);
  });

  it("includes system labels alongside user label in addLabelIds", () => {
    const ctx = loadFilters([
      {
        criteria: { from: "vip@example.com" },
        actions: { labels: ["!priority"], star: true },
      },
    ]);
    const labelMap = { priority: "Label_5" };
    const result = normalize(ctx._buildFilterResources(labelMap));
    assert.deepEqual(result, [
      {
        criteria: { from: "vip@example.com" },
        action: { addLabelIds: ["Label_5", "STARRED"] },
      },
    ]);
  });

  it("produces resources for multiple filters", () => {
    const ctx = loadFilters([
      {
        criteria: { from: "a@example.com" },
        actions: { star: true },
      },
      {
        criteria: { from: "b@example.com" },
        actions: { trash: true },
      },
    ]);
    const result = normalize(ctx._buildFilterResources({}));
    assert.equal(result.length, 2);
    assert.deepEqual(result[0].action, { addLabelIds: ["STARRED"] });
    assert.deepEqual(result[1].action, { addLabelIds: ["TRASH"] });
  });

  it("preserves criteria fields", () => {
    const ctx = loadFilters([
      {
        criteria: {
          from: "a@example.com",
          subject: "test",
          query: "is:unread",
        },
        actions: { star: true },
      },
    ]);
    const result = normalize(ctx._buildFilterResources({}));
    assert.deepEqual(result[0].criteria, {
      from: "a@example.com",
      subject: "test",
      query: "is:unread",
    });
  });
});

describe("_normalizeObject", () => {
  let ctx;
  it("sorts object keys alphabetically", () => {
    ctx = loadFilters([]);
    const result = normalize(ctx._normalizeObject({ z: 1, a: 2, m: 3 }));
    assert.deepEqual(Object.keys(result), ["a", "m", "z"]);
  });

  it("sorts array values", () => {
    ctx = loadFilters([]);
    const result = normalize(
      ctx._normalizeObject({ ids: ["SPAM", "INBOX", "IMPORTANT"] }),
    );
    assert.deepEqual(result.ids, ["IMPORTANT", "INBOX", "SPAM"]);
  });

  it("drops undefined values", () => {
    ctx = loadFilters([]);
    const result = normalize(ctx._normalizeObject({ a: 1, b: undefined }));
    assert.deepEqual(result, { a: 1 });
  });

  it("drops null values", () => {
    ctx = loadFilters([]);
    const result = normalize(ctx._normalizeObject({ a: 1, b: null }));
    assert.deepEqual(result, { a: 1 });
  });

  it("drops empty string values", () => {
    ctx = loadFilters([]);
    const result = normalize(ctx._normalizeObject({ a: 1, b: "" }));
    assert.deepEqual(result, { a: 1 });
  });

  it("drops empty arrays", () => {
    ctx = loadFilters([]);
    const result = normalize(ctx._normalizeObject({ a: 1, b: [] }));
    assert.deepEqual(result, { a: 1 });
  });

  it("keeps non-empty values", () => {
    ctx = loadFilters([]);
    const result = normalize(
      ctx._normalizeObject({ query: "from:test", addLabelIds: ["INBOX"] }),
    );
    assert.deepEqual(result, { addLabelIds: ["INBOX"], query: "from:test" });
  });

  it("returns empty object when all values are empty", () => {
    ctx = loadFilters([]);
    const result = normalize(
      ctx._normalizeObject({ a: undefined, b: null, c: "", d: [] }),
    );
    assert.deepEqual(result, {});
  });
});

describe("_fingerprintFilter", () => {
  let ctx;
  it("includes known criteria and action keys", () => {
    ctx = loadFilters([]);
    const fp = ctx._fingerprintFilter({
      criteria: { from: "test@example.com", query: "is:unread" },
      action: { addLabelIds: ["INBOX"], removeLabelIds: ["SPAM"] },
    });
    const parsed = JSON.parse(fp);
    assert.deepEqual(parsed.criteria, {
      from: "test@example.com",
      query: "is:unread",
    });
    assert.deepEqual(parsed.action, {
      addLabelIds: ["INBOX"],
      removeLabelIds: ["SPAM"],
    });
  });

  it("excludes unknown criteria keys", () => {
    ctx = loadFilters([]);
    const fp = ctx._fingerprintFilter({
      criteria: { from: "test@example.com", unknownField: "value" },
      action: { addLabelIds: ["INBOX"] },
    });
    const parsed = JSON.parse(fp);
    assert.equal(parsed.criteria.unknownField, undefined);
  });

  it("excludes unknown action keys", () => {
    ctx = loadFilters([]);
    const fp = ctx._fingerprintFilter({
      criteria: { from: "test@example.com" },
      action: { addLabelIds: ["INBOX"], customAction: true },
    });
    const parsed = JSON.parse(fp);
    assert.equal(parsed.action.customAction, undefined);
  });

  it("normalizes array order for stable comparison", () => {
    ctx = loadFilters([]);
    const fp1 = ctx._fingerprintFilter({
      criteria: { from: "test@example.com" },
      action: { addLabelIds: ["B", "A"] },
    });
    const fp2 = ctx._fingerprintFilter({
      criteria: { from: "test@example.com" },
      action: { addLabelIds: ["A", "B"] },
    });
    assert.equal(fp1, fp2);
  });

  it("produces different fingerprints for different filters", () => {
    ctx = loadFilters([]);
    const fp1 = ctx._fingerprintFilter({
      criteria: { from: "a@example.com" },
      action: { addLabelIds: ["INBOX"] },
    });
    const fp2 = ctx._fingerprintFilter({
      criteria: { from: "b@example.com" },
      action: { addLabelIds: ["INBOX"] },
    });
    assert.notEqual(fp1, fp2);
  });

  it("includes the forward action key", () => {
    ctx = loadFilters([]);
    const fp = ctx._fingerprintFilter({
      criteria: { from: "test@example.com" },
      action: { forward: "other@example.com" },
    });
    const parsed = JSON.parse(fp);
    assert.equal(parsed.action.forward, "other@example.com");
  });

  it("includes all supported criteria keys", () => {
    ctx = loadFilters([]);
    const fp = ctx._fingerprintFilter({
      criteria: {
        from: "a",
        to: "b",
        subject: "c",
        query: "d",
        negatedQuery: "e",
        hasAttachment: true,
        excludeChats: true,
        size: 1024,
        sizeComparison: "larger",
      },
      action: {},
    });
    const parsed = JSON.parse(fp);
    assert.equal(parsed.criteria.from, "a");
    assert.equal(parsed.criteria.to, "b");
    assert.equal(parsed.criteria.subject, "c");
    assert.equal(parsed.criteria.query, "d");
    assert.equal(parsed.criteria.negatedQuery, "e");
    assert.equal(parsed.criteria.hasAttachment, true);
    assert.equal(parsed.criteria.excludeChats, true);
    assert.equal(parsed.criteria.size, 1024);
    assert.equal(parsed.criteria.sizeComparison, "larger");
  });
});

describe("_ensureLabelsExist", () => {
  it("calls _getOrCreateLabels with expanded labels for each filter", () => {
    const calls = [];
    const ctx = loadFilters(
      [
        {
          criteria: { from: "a@example.com" },
          actions: { labels: ["list/fedora/devel"] },
        },
        {
          criteria: { from: "b@example.com" },
          actions: { labels: ["!expireafter/30d"] },
        },
      ],
      {
        _getOrCreateLabels: (labels) => calls.push(normalize(labels)),
      },
    );
    ctx._ensureLabelsExist();
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[0], ["list", "list/fedora", "list/fedora/devel"]);
    assert.deepEqual(calls[1], ["expireafter/30d"]);
  });

  it("skips filters that have no labels", () => {
    const calls = [];
    const ctx = loadFilters(
      [
        {
          criteria: { from: "a@example.com" },
          actions: { star: true },
        },
      ],
      {
        _getOrCreateLabels: (labels) => calls.push(labels),
      },
    );
    ctx._ensureLabelsExist();
    assert.equal(calls.length, 0);
  });
});

describe("createAllFilters", () => {
  it("creates all filter resources and logs the count", () => {
    const created = [];
    const logs = [];
    const ctx = loadFilters(
      [
        {
          criteria: { from: "a@example.com" },
          actions: { star: true },
        },
        {
          criteria: { from: "b@example.com" },
          actions: { trash: true },
        },
      ],
      {
        _getOrCreateLabels: () => {},
        _createFilterWithRetry: (resource) => created.push(resource),
        Gmail: {
          Users: {
            Labels: {
              list: () => ({ labels: [] }),
            },
          },
        },
        console: { log: (msg) => logs.push(msg) },
      },
    );
    ctx.createAllFilters();
    assert.equal(created.length, 2);
    assert.equal(logs[logs.length - 1], "Created 2 filters");
  });

  it("throws and logs on filter creation failure", () => {
    const logs = [];
    const ctx = loadFilters(
      [
        {
          criteria: { from: "a@example.com" },
          actions: { star: true },
        },
      ],
      {
        _getOrCreateLabels: () => {},
        _createFilterWithRetry: () => {
          throw new Error("API error");
        },
        Gmail: {
          Users: {
            Labels: {
              list: () => ({ labels: [] }),
            },
          },
        },
        console: { log: (msg) => logs.push(msg) },
      },
    );
    assert.throws(() => ctx.createAllFilters(), /API error/);
    assert.ok(logs.some((l) => l.startsWith("Failed to create filter")));
  });
});

describe("deleteAllFilters", () => {
  it("deletes all existing filters and logs the count", () => {
    const deleted = [];
    const logs = [];
    const ctx = loadFilters([], {
      _deleteFilterWithRetry: (id) => deleted.push(id),
      Gmail: {
        Users: {
          Settings: {
            Filters: {
              list: () => ({
                filter: [{ id: "f1" }, { id: "f2" }, { id: "f3" }],
              }),
            },
          },
        },
      },
      console: { log: (msg) => logs.push(msg) },
    });
    ctx.deleteAllFilters();
    assert.deepEqual(deleted, ["f1", "f2", "f3"]);
    assert.equal(logs[0], "Deleted 3 filters");
  });

  it("handles empty filter list", () => {
    const deleted = [];
    const logs = [];
    const ctx = loadFilters([], {
      _deleteFilterWithRetry: (id) => deleted.push(id),
      Gmail: {
        Users: {
          Settings: {
            Filters: {
              list: () => ({}),
            },
          },
        },
      },
      console: { log: (msg) => logs.push(msg) },
    });
    ctx.deleteAllFilters();
    assert.equal(deleted.length, 0);
    assert.equal(logs[0], "Deleted 0 filters");
  });
});

describe("syncFilters", () => {
  function makeSyncContext(filters, existingGmailFilters, labelMap = {}) {
    const created = [];
    const deleted = [];
    const logs = [];
    const labels = Object.entries(labelMap).map(([name, id]) => ({
      name,
      id,
    }));
    const ctx = loadFilters(filters, {
      _getOrCreateLabels: () => {},
      _createFilterWithRetry: (resource) => created.push(resource),
      _deleteFilterWithRetry: (id) => deleted.push(id),
      Gmail: {
        Users: {
          Labels: {
            list: () => ({ labels }),
          },
          Settings: {
            Filters: {
              list: () => ({
                filter:
                  existingGmailFilters.length > 0
                    ? existingGmailFilters
                    : undefined,
              }),
            },
          },
        },
      },
      console: { log: (msg) => logs.push(msg) },
    });
    return { ctx, created, deleted, logs };
  }

  it("creates filters that are missing from Gmail", () => {
    const { ctx, created, deleted } = makeSyncContext(
      [
        {
          criteria: { from: "a@example.com" },
          actions: { star: true },
        },
      ],
      [],
    );
    ctx.syncFilters();
    assert.equal(created.length, 1);
    assert.equal(deleted.length, 0);
  });

  it("deletes filters that are not in the configuration", () => {
    const { ctx, created, deleted } = makeSyncContext(
      [],
      [
        {
          id: "f1",
          criteria: { from: "old@example.com" },
          action: { addLabelIds: ["STARRED"] },
        },
      ],
    );
    ctx.syncFilters();
    assert.equal(deleted.length, 1);
    assert.equal(deleted[0], "f1");
    assert.equal(created.length, 0);
  });

  it("leaves matching filters unchanged", () => {
    const { ctx, created, deleted } = makeSyncContext(
      [
        {
          criteria: { from: "a@example.com" },
          actions: { star: true },
        },
      ],
      [
        {
          id: "f1",
          criteria: { from: "a@example.com" },
          action: { addLabelIds: ["STARRED"] },
        },
      ],
    );
    ctx.syncFilters();
    assert.equal(created.length, 0);
    assert.equal(deleted.length, 0);
  });

  it("logs summary with created, deleted, and unchanged counts", () => {
    const { ctx, logs } = makeSyncContext(
      [
        {
          criteria: { from: "a@example.com" },
          actions: { star: true },
        },
        {
          criteria: { from: "new@example.com" },
          actions: { trash: true },
        },
      ],
      [
        {
          id: "f1",
          criteria: { from: "a@example.com" },
          action: { addLabelIds: ["STARRED"] },
        },
        {
          id: "f2",
          criteria: { from: "old@example.com" },
          action: { addLabelIds: ["TRASH"] },
        },
      ],
    );
    ctx.syncFilters();
    assert.ok(
      logs.some((l) => l.includes("created 1, deleted 1, unchanged 1")),
    );
  });

  it("throws with context on filter creation failure", () => {
    const logs = [];
    const ctx = loadFilters(
      [
        {
          criteria: { from: "a@example.com" },
          actions: { star: true },
        },
      ],
      {
        _getOrCreateLabels: () => {},
        _createFilterWithRetry: () => {
          throw new Error("quota exceeded");
        },
        _deleteFilterWithRetry: () => {},
        Gmail: {
          Users: {
            Labels: { list: () => ({ labels: [] }) },
            Settings: {
              Filters: { list: () => ({}) },
            },
          },
        },
        console: { log: (msg) => logs.push(msg) },
      },
    );
    assert.throws(() => ctx.syncFilters(), /quota exceeded/);
  });

  it("handles sync with user labels", () => {
    const { ctx, created, deleted } = makeSyncContext(
      [
        {
          criteria: { query: "list:test" },
          actions: { labels: ["!my-label"], neverSpam: true },
        },
      ],
      [],
      { "my-label": "Label_5" },
    );
    ctx.syncFilters();
    assert.equal(created.length, 1);
    const resource = normalize(created[0]);
    assert.deepEqual(resource.action.addLabelIds, ["Label_5"]);
    assert.deepEqual(resource.action.removeLabelIds, ["SPAM"]);
    assert.equal(deleted.length, 0);
  });
});
