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

// Extracts retention period from a label of the form `expireafter/<VALUE>`.
function _getExpireAfterValue(thread) {
  const labels = thread.getLabels();
  for (const label of labels) {
    const name = label.getName();
    const match = name.match(/^expireafter\/(.+)$/);
    if (match) {
      return match[1];
    }
  }
  return null;
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

function _applyLabels(thread, labelNames) {
  const labels = _getOrCreateLabels(labelNames);
  for (const label of labels) {
    thread.addLabel(label);
  }
}

// label cache to avoid redundant api queries
const _labelCache = {};

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

function _getOrCreateLabels(names) {
  const labels = [];
  for (const name of names) {
    labels.push(_getOrCreateLabel(name));
  }

  return labels;
}

// Parses all message headers into a Map.
// Keys are lowercase. Values are arrays of strings.
function _getHeaderMap(message) {
  const raw = message.getRawContent();

  // Split raw content into the header and body sections.
  // Headers are separated from the body by a double newline.
  const headerSection = raw.split(/\r?\n\r?\n/)[0];
  const lines = headerSection.split(/\r?\n/);

  const headerMap = {};
  let lastKey = null;

  lines.forEach((line) => {
    // Check for a folded line (starts with a space or tab)
    if (line.match(/^[ \t]/) && lastKey) {
      const unfoldedValue = line.replace(/^[ \t]+/, " ");
      const currentIndex = headerMap[lastKey].length - 1;
      headerMap[lastKey][currentIndex] += unfoldedValue;
    } else {
      // Find the first colon to split Key and Value
      const colonIndex = line.indexOf(":");
      if (colonIndex > -1) {
        const key = line.substring(0, colonIndex).trim().toLowerCase();
        const value = line.substring(colonIndex + 1).trim();

        if (!headerMap[key]) {
          headerMap[key] = [];
        }
        headerMap[key].push(value);
        lastKey = key;
      }
    }
  });

  return headerMap;
}
