// Maps values of the x-github-reason header to message disposition.
const GITHUB_REASON_MAP = {
  security_alert: {
    labels: ["expireafter/5d"],
  },
  ci_activity: {
    labels: ["expireafter/5d"],
    archive: true,
  },
  member_feature_requested: {
    trash: true,
  },
  review_requested: {
    labels: ["review/github"],
  },
};

// Determine labels and disposition of github messages.
function _classifyGithubThread(thread, ...additionalLabels) {
  const githubLabel = "github";
  const labels = [githubLabel, ...additionalLabels];
  let archive = false;
  let trash = false;

  const msg = thread.getMessages()[0];
  const reason = msg.getHeader("X-GitHub-Reason");
  if (reason) {
    labels.push(`${githubLabel}/reason/${reason}`);
    const disposition = GITHUB_REASON_MAP[reason];
    if (disposition) {
      if (disposition.labels) {
        labels.push(...disposition.labels);
      }
      if (disposition.archive) {
        archive = true;
      }
      if (disposition.trash) {
        trash = true;
      }
    }
  }

  const isIssue = msg.getHeader("X-GitHub-IssueState");
  if (isIssue) {
    labels.push("bug/github", `${githubLabel}/type/issue`);
  }

  const isPr = msg.getHeader("X-GitHub-PullRequestStatus");
  if (isPr) {
    labels.push(`${githubLabel}/type/pull_request`);
  }

  const repo = _getGithubRepo(msg);
  if (repo) {
    const repoLabels = _expandLabelHierarchy([`${githubLabel}/repo/${repo}`]);
    labels.push(...repoLabels);
  }

  const sender = msg.getHeader("X-GitHub-Sender");
  if (
    sender &&
    (sender.startsWith("dependabot") || sender.startsWith("coderabbit"))
  ) {
    labels.push("bot", "expireafter/5d");
  }

  return { labels, archive, trash };
}

// Extract the owner/repo component from the List-ID header.
function _getGithubRepo(msg) {
  const listId = msg.getHeader("List-ID");
  if (!listId) return null;
  const match = listId.match(/^([^/]+\/[^/\s]+)\s+<[^>]+\.github\.com>$/);
  if (!match) return null;
  return match[1];
}
