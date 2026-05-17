// Takes as input a duration specification of the form <VALUE><UNIT>,
// where <VALUE> is an integer and <UNIT> is one of:
//
// - d (days)
// - h (hours)
// - m (months)
// - w (weeks)
// - y (years)
//
// Returns duration in number of milliseconds.
function _parseDuration(duration) {
  const match = duration.match(/^(\d+)([mhdwy])$/);
  if (!match) {
    throw new Error(`Invalid duration: ${duration}`);
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers = {
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
    y: 365 * 24 * 60 * 60 * 1000,
  };
  return value * multipliers[unit];
}

// Returns all Gmail labels matching `expireafter/*`.
function _getExpireAfterLabels() {
  return GmailApp.getUserLabels().filter((label) =>
    label.getName().match(/^expireafter\/.+$/),
  );
}

// Returns all Gmail labels matching `archiveafter/*`.
function _getArchiveAfterLabels() {
  return GmailApp.getUserLabels().filter((label) =>
    label.getName().match(/^archiveafter\/.+$/),
  );
}

// Formats a Date as YYYY/MM/DD for use in Gmail search queries.
function _formatDateForSearch(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}/${m}/${d}`;
}

function _withRetry(fn, label, maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return fn();
    } catch (e) {
      if (attempt === maxRetries) {
        throw e;
      }
      console.log(
        `Retrying ${label} (attempt ${attempt}/${maxRetries}): ${e.message}`,
      );
      Utilities.sleep(1000 * 2 ** (attempt - 1));
    }
  }
}

function _createFilterWithRetry(resource, maxRetries = 5) {
  return _withRetry(
    () => Gmail.Users.Settings.Filters.create(resource, "me"),
    "filter creation",
    maxRetries,
  );
}

function _deleteFilterWithRetry(filterId, maxRetries = 5) {
  return _withRetry(
    () => Gmail.Users.Settings.Filters.remove("me", filterId),
    "filter deletion",
    maxRetries,
  );
}

function _setLabelVisibility(pattern, messageList, labelList) {
  if (messageList && !["show", "hide"].includes(messageList)) {
    throw new Error(`Invalid messageList visibility: ${messageList}`);
  }
  if (labelList && !["show", "showIfUnread", "hide"].includes(labelList)) {
    throw new Error(`Invalid labelList visibility: ${labelList}`);
  }
  if (!messageList && !labelList) {
    throw new Error("At least one of messageList or labelList is required");
  }

  const regex = new RegExp(pattern);
  const allLabels = Gmail.Users.Labels.list("me").labels;
  const matched = allLabels.filter((l) => regex.test(l.name));
  if (matched.length === 0) {
    throw new Error(`No labels matching pattern: ${pattern}`);
  }

  const resource = {};
  if (messageList) {
    resource.messageListVisibility = messageList;
  }
  if (labelList) {
    resource.labelListVisibility = `label${labelList[0].toUpperCase()}${labelList.slice(1)}`;
  }

  for (const label of matched) {
    Gmail.Users.Labels.update(resource, "me", label.id);
  }
}

// Given a list of label names in `labelNames`, ensure that those labels exist
// and apply them to all the messages in `thread`.
function _applyLabels(thread, labelNames) {
  const uniqueNames = [...new Set(labelNames)];
  _getOrCreateLabels(uniqueNames);

  let map = _buildLabelMap();
  let ids = uniqueNames.map((n) => map[n]);

  if (ids.some((id) => !id)) {
    _invalidateLabelMap();
    map = _buildLabelMap();
    ids = uniqueNames.map((n) => map[n]);
  }

  const missingLabels = uniqueNames.filter((n) => !map[n]);
  if (missingLabels.length > 0) {
    throw new Error(
      `Failed to resolve label IDs for: ${missingLabels.join(", ")}`,
    );
  }

  Gmail.Users.Threads.modify({ addLabelIds: ids }, "me", thread.getId());
}

// label cache to avoid redundant api queries
const _labelCache = {};

let _labelIdMap = null;

function _buildLabelMap() {
  if (!_labelIdMap) {
    _labelIdMap = {};
    for (const label of Gmail.Users.Labels.list("me").labels) {
      _labelIdMap[label.name] = label.id;
    }
  }
  return _labelIdMap;
}

function _invalidateLabelMap() {
  _labelIdMap = null;
}

// Helper function _to get or create a label. Handles nested labels automatically
// and ensures that superior labels exist.
function _getOrCreateLabel(path) {
  if (_labelCache[path]) {
    return _labelCache[path];
  }

  const parts = path.split("/");
  let currentPath = "";
  let lastLabel = null;

  for (let i = 0; i < parts.length; i++) {
    currentPath += (i === 0 ? "" : "/") + parts[i];
    if (_labelCache[currentPath]) {
      lastLabel = _labelCache[currentPath];
      continue;
    }
    let label = GmailApp.getUserLabelByName(currentPath);
    if (!label) {
      label = GmailApp.createLabel(currentPath);
    }
    _labelCache[currentPath] = label;
    lastLabel = label;
  }
  return lastLabel;
}

// Expands labels of the form `one/two/three` into `one`, `one/two`, and
// `one/two/three`. We use this to create label hierarchies (which show up as
// imap folders), so that something like `list/fedora/devel` will cause the
// message to show in the `list` folder, the `list/fedora` folder, and the
// `list/fedora/devel` folder.
function _expandLabelHierarchy(labels) {
  const expanded = [];
  const seen = {};
  for (const label of labels) {
    if (label.startsWith("!")) {
      const name = label.slice(1);
      if (!seen[name]) {
        seen[name] = true;
        expanded.push(name);
      }
      continue;
    }
    const parts = label.split("/");
    for (let i = 1; i <= parts.length; i++) {
      const path = parts.slice(0, i).join("/");
      if (!seen[path]) {
        seen[path] = true;
        expanded.push(path);
      }
    }
  }
  return expanded;
}

function _getOrCreateLabels(names) {
  const labels = [];
  for (const name of names) {
    labels.push(_getOrCreateLabel(name));
  }

  return labels;
}
