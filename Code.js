// This provides coarse versioning of this configuration. By including this in
// labels and in search expressions, we can force re-labeling by incrementing
// the version. This is currently used only by the github-related filtering,
// but the same mechanism could be used elsewhere.
const FILTERVERSION = 2;

// Run this function to set up the triggers
function createTimeTriggers() {
  // First, delete existing triggers to avoid duplicates
  const triggers = ScriptApp.getProjectTriggers();

  // biome-ignore lint/suspicious/useIterableCallbackReturn: we have no control over deleteTrigger
  triggers.forEach((t) => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger("filterEmail").timeBased().everyMinutes(15).create();
  ScriptApp.newTrigger("expireEmail").timeBased().everyMinutes(30).create();
  ScriptApp.newTrigger("archiveEmail").timeBased().everyMinutes(30).create();
  ScriptApp.newTrigger("syncLabelVisibility")
    .timeBased()
    .everyHours(4)
    .create();

  console.log("Trigger created successfully.");
}

// Run all mail filtering/classification tasks.
function filterEmail() {
  _processCalendarResponses();
  _processGithubNotifications();
}

// Delete mail older than the retention period specified by a
// expiredafter/RETENTION label.
function expireEmail() {
  _processRetentionLabels(
    _getExpireAfterLabels(),
    (t) => t.moveToTrash(),
    "Expired",
  );
}

// Archive mail older than the retention period specified by a
// archiveafter/RETENTION label.
function archiveEmail() {
  _processRetentionLabels(
    _getArchiveAfterLabels(),
    (t) => t.moveToArchive(),
    "Archived",
    "in:inbox",
  );
}

// Implement the retention processing logic for expireEmail and
// archiveEmail. Get a list of matching labels, and for each one
// extract the retention period and use that to build a before:
// term for a search expression.
function _processRetentionLabels(labels, action, actionName, extraQuery) {
  let count = 0;
  for (const label of labels) {
    const value = label.getName().split("/").slice(1).join("/");
    const maxAgeMs = _parseDuration(value);
    const cutoff = new Date(Date.now() - maxAgeMs);
    const before = _formatDateForSearch(cutoff);
    const parts = [`label:${label.getName()}`, `before:${before}`];
    if (extraQuery) parts.push(extraQuery);
    const threads = GmailApp.search(parts.join(" "), 0, 200);

    for (const thread of threads) {
      action(thread);
      count++;
    }
  }
  console.log(`${actionName} ${count} threads`);
}

function syncLabelVisibility() {
  // pattern, messageList, labelList
  _setLabelVisibility("^expireafter", "hide", "hide");
  _setLabelVisibility("^archiveafter", "hide", "hide");
  _setLabelVisibility("^fv", "hide", "hide");
  _setLabelVisibility("^list", "hide");
}

// Handle labelling and disposition of email from github.
function _processGithubNotifications() {
  console.log("Processing github notifications");
  const filterVersionLabel = `fv/${FILTERVERSION}`;
  const searchQuery = `from:github.com (-label:github OR -label:${filterVersionLabel})`;
  const threads = GmailApp.search(searchQuery, 0, 100);

  for (const thread of threads) {
    const result = _classifyGithubThread(thread, filterVersionLabel);
    _applyLabels(thread, result.labels);
    if (result.archive) thread.moveToArchive();
    if (result.trash) thread.moveToTrash();
  }

  if (threads.length > 0) {
    console.log(`Processed ${threads.length} github notifications`);
  }
}

// Find and label google calendar notifications.
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
    const labelNames = [parentLabel, labelPath, "expireafter/5d"];

    // Search query specific to this prefix
    const searchQuery = `subject:"${subjectPrefix}" has:attachment filename:invite.ics -label:calendar`;
    const threads = GmailApp.search(searchQuery, 0, 100);

    if (threads.length > 0) {
      for (const thread of threads) {
        _applyLabels(thread, labelNames);
        if (responseTypes[subjectPrefix].archive) {
          thread.moveToArchive();
        }
      }
      console.log(`Processed ${threads.length} threads for: ${subjectPrefix}`);
    }
  }
}
