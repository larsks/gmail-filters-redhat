import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { beforeEach, describe, it } from "node:test";
import vm from "node:vm";

function normalize(obj) {
  return JSON.parse(JSON.stringify(obj));
}

const utilsSource = readFileSync("Utils.js", "utf8");
const githubSource = readFileSync("Github.js", "utf8");

function loadGithub(globals = {}) {
  const context = vm.createContext({
    console,
    Error,
    String,
    parseInt,
    RegExp,
    ...globals,
  });
  vm.runInContext(utilsSource, context);
  vm.runInContext(githubSource, context);
  return context;
}

describe("_getGithubRepo", () => {
  let ctx;
  beforeEach(() => {
    ctx = loadGithub();
  });

  function makeMsg(listId) {
    return { getHeader: (name) => (name === "List-ID" ? listId : null) };
  }

  it("extracts owner/repo from a standard List-ID header", () => {
    const msg = makeMsg(
      "osac-project/bare-metal-fulfillment-operator <bare-metal-fulfillment-operator.osac-project.github.com>",
    );
    assert.equal(
      ctx._getGithubRepo(msg),
      "osac-project/bare-metal-fulfillment-operator",
    );
  });

  it("extracts owner/repo with different org and repo names", () => {
    const msg = makeMsg("kubernetes/kubectl <kubectl.kubernetes.github.com>");
    assert.equal(ctx._getGithubRepo(msg), "kubernetes/kubectl");
  });

  it("returns null when List-ID header is missing", () => {
    const msg = { getHeader: () => null };
    assert.equal(ctx._getGithubRepo(msg), null);
  });

  it("returns null when List-ID is not a GitHub list", () => {
    const msg = makeMsg("some-mailing-list <list.example.com>");
    assert.equal(ctx._getGithubRepo(msg), null);
  });
});

describe("_classifyGithubThread", () => {
  function makeThread(headers) {
    return {
      getMessages: () => [
        {
          getHeader: (name) => headers[name] || null,
        },
      ],
    };
  }

  function classify(headers) {
    const ctx = loadGithub();
    return normalize(ctx._classifyGithubThread(makeThread(headers), "fv/2"));
  }

  it("adds reason label for a known reason", () => {
    const result = classify({ "X-GitHub-Reason": "review_requested" });
    assert.ok(result.labels.includes("github/reason/review_requested"));
    assert.ok(result.labels.includes("review/github"));
  });

  it("adds reason label for an unknown reason", () => {
    const result = classify({ "X-GitHub-Reason": "unknown_reason" });
    assert.ok(result.labels.includes("github/reason/unknown_reason"));
  });

  it("sets archive for ci_activity", () => {
    const result = classify({ "X-GitHub-Reason": "ci_activity" });
    assert.equal(result.archive, true);
    assert.ok(result.labels.includes("expireafter/5d"));
  });

  it("sets trash for member_feature_requested", () => {
    const result = classify({
      "X-GitHub-Reason": "member_feature_requested",
    });
    assert.equal(result.trash, true);
  });

  it("adds expireafter for security_alert", () => {
    const result = classify({ "X-GitHub-Reason": "security_alert" });
    assert.ok(result.labels.includes("expireafter/5d"));
    assert.equal(result.archive, false);
  });

  it("detects issues via X-GitHub-IssueState", () => {
    const result = classify({ "X-GitHub-IssueState": "open" });
    assert.ok(result.labels.includes("bug/github"));
    assert.ok(result.labels.includes("github/type/issue"));
  });

  it("detects PRs via X-GitHub-PullRequestStatus", () => {
    const result = classify({ "X-GitHub-PullRequestStatus": "merged" });
    assert.ok(result.labels.includes("github/type/pull_request"));
  });

  it("extracts repo labels from List-ID", () => {
    const result = classify({
      "List-ID": "kubernetes/kubectl <kubectl.kubernetes.github.com>",
    });
    assert.ok(result.labels.includes("github/repo"));
    assert.ok(result.labels.includes("github/repo/kubernetes"));
    assert.ok(result.labels.includes("github/repo/kubernetes/kubectl"));
  });

  it("auto-expires coderabbit bot messages", () => {
    const result = classify({ "X-GitHub-Sender": "coderabbitai" });
    assert.ok(result.labels.includes("bot"));
    assert.ok(result.labels.includes("expireafter/5d"));
  });

  it("does not auto-expire non-bot senders", () => {
    const result = classify({ "X-GitHub-Sender": "octocat" });
    assert.ok(!result.labels.includes("bot"));
  });
});
