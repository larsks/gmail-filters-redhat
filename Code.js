// Run this function to set up the triggers
function _createTimeTriggers() {
  // First, delete existing triggers to avoid duplicates
  const triggers = ScriptApp.getProjectTriggers();

  // biome-ignore lint/suspicious/useIterableCallbackReturn: we have no control over deleteTrigger
  triggers.forEach((t) => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger("_filterEmail").timeBased().everyMinutes(30).create();
  ScriptApp.newTrigger("_expireEmail").timeBased().everyMinutes(30).create();

  console.log("Trigger created successfully.");
}

function _filterEmail() {
  _processCalendarResponses();
  _processGithubNotifications();
}

// Look for messages with the `expireafter` label and delete them if they are
// older than the configured retention period.
function _expireEmail() {
  const threads = GmailApp.search("label:expireafter", 0, 100);
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
  console.log(`Expired ${expired} threads`);
}

function _processGithubNotifications() {
  console.log("Processing github notifications");
  githubLabelText = "notification/github";
  const searchQuery = `from:github.com -label:${githubLabelText}`;
  const githubLabel = _getOrCreateLabel(githubLabelText);
  const threads = GmailApp.search(searchQuery, 0, 100);
  if (threads.length > 0) {
    for (const thread of threads) {
      const labels = [];
      labels.push(githubLabel);

      // Extract github notification reason from message headers and use that
      // as a label.
      const msg = thread.getMessages()[0];
      const headers = _getHeaderMap(msg);
      reason = headers["x-github-reason"];

      if (reason) {
        labels.push(_getOrCreateLabel(`${githubLabelText}/${reason}`));
        if (reason === "review_requested") {
          labels.push(_getOrCreateLabel("review/github"));
        }
      }

      // Special labelling for issues to match existing label categories.
      is_issue = headers["x-github-issuestate"];
      if (is_issue) {
        labels.push(_getOrCreateLabel("bug/github"));
      }

      for (const label of labels) {
        thread.addLabel(label);
      }
    }
    console.log(`Processed ${threads.length} github notifications`);
  }
}

// Find and label google calendar notifications. We configure these to expire
// after five days.
function _processCalendarResponses() {
  console.log("Processing calendar responses");

  const parentLabel = "calendar";
  // 1. Define the relationship between subjects and labels
  const responseTypes = {
    "Declined:": {
      label: `${parentLabel}/declined`,
      archive: true,
    },
    "Accepted:": {
      label: `${parentLabel}/accepted`,
      archive: true,
    },
    "Invitation:": {
      label: `${parentLabel}/invitation`,
      archive: false,
    },
  };

  // 2. Loop through each response type and process
  for (const subjectPrefix in responseTypes) {
    const labelPath = responseTypes[subjectPrefix].label;
    const labels = _getOrCreateLabels([
      parentLabel,
      labelPath,
      "expireafter",
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
        if (responseTypes[subjectPrefix].archive) {
          thread.moveToArchive();
        }
      }
      console.log(`Processed ${threads.length} threads for: ${subjectPrefix}`);
    }
  }
}
