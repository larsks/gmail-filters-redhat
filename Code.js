// Runi this function to set up the triggers
function _createTimeTriggers() {
  // First, delete existing triggers to avoid duplicates
  const triggers = ScriptApp.getProjectTriggers();

  // biome-ignore lint/suspicious/useIterableCallbackReturn: we have no control over deleteTrigger
  triggers.forEach((t) => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger("_filterEmail").timeBased().everyMinutes(30).create();
  ScriptApp.newTrigger("_expireEmail").timeBased().everyDays(1).create();

  Logger.log("Trigger created successfully.");
}

function _filterEmail() {
  _processCalendarResponses();
  _processGithubNotifications();
}

function _expireEmail() {
  const threads = GmailApp.search("label:autoexpire", 0, 100);
  let expired = 0;
  for (const thread of threads) {
    const expireValue = _getExpireAfterValue(thread);
    if (!expireValue) continue;

    const maxAgeMs = _parseDuration(expireValue);
    const ageMs = Date.now() - thread.getLastMessageDate().getTime();
    if (ageMs > maxAgeMs) {
      thread.moveToTrash();
      expired++;
    }
  }
  Logger.log(`Expired ${expired} threads`);
}

function _processGithubNotifications() {
  console.log("Processing github notifications");
  githubLabelText = "notification/github";
  const searchQuery = `from:github.com -label:${githubLabelText}`;
  const githubLabel = _getOrCreateLabel(githubLabelText);
  const threads = GmailApp.search(searchQuery, 0, 100);
  if (threads.length > 0) {
    const labels = [];
    for (const thread of threads) {
      labels.push(githubLabel);

      const msg = thread.getMessages()[0];
      const headers = _getHeaderMap(msg);
      reason = headers["x-github-reason"];
      //console.log(`Got reason: ${reason}`)

      if (reason) {
        labels.push(_getOrCreateLabel(`${githubLabelText}/${reason}`));
      }

      is_issue = headers["x-github-issuestate"];
      if (is_issue) {
        labels.push(_getOrCreateLabels("bug/github"));
      }

      for (const label of labels) {
        thread.addLabel(label);
      }
    }
    Logger.log(`Processed ${threads.length} github notifications`);
  }
}

function _processCalendarResponses() {
  console.log("Processing calendar responses");

  const parentLabel = "calendar";
  // 1. Define the relationship between subjects and labels
  const responseTypes = {
    "Declined:": `${parentLabel}/declined`,
    "Accepted:": `${parentLabel}/accepted`,
  };

  // 2. Loop through each response type and process
  for (const subjectPrefix in responseTypes) {
    const labelPath = responseTypes[subjectPrefix];
    const labels = _getOrCreateLabels([
      parentLabel,
      labelPath,
      "autoexpire",
      "expireafter/5d",
    ]);

    // Search query specific to this prefix
    const searchQuery = `subject:"${subjectPrefix}" has:attachment filename:invite.ics -label:calendar`;
    const threads = GmailApp.search(searchQuery, 0, 100);

    if (threads.length > 0) {
      for (const thread of threads) {
        for (const label of labels) {
          thread.addLabel(label);
        }
        thread.moveToArchive();
      }
      Logger.log(`Processed ${threads.length} threads for: ${subjectPrefix}`);
    }
  }
}

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

// label cache to avoid redundant api queries
const _labelCache = {};

/**
 * Helper function _to get or create a label. This one handles nesting properly.
 */
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

/**
 * Parses all message headers into a Map.
 * Keys are lowercase. Values are arrays of strings.
 */
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
