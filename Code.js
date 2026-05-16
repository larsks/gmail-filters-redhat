const FILTERVERSION = 2;

// Run this function to set up the triggers
function createTimeTriggers() {
  // First, delete existing triggers to avoid duplicates
  const triggers = ScriptApp.getProjectTriggers();

  // biome-ignore lint/suspicious/useIterableCallbackReturn: we have no control over deleteTrigger
  triggers.forEach((t) => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger("filterEmail").timeBased().everyMinutes(30).create();
  ScriptApp.newTrigger("expireEmail").timeBased().everyMinutes(30).create();
  ScriptApp.newTrigger("archiveEmail").timeBased().everyMinutes(30).create();
  ScriptApp.newTrigger("syncLabelVisibility").timeBased().everyDays(1).create();

  console.log("Trigger created successfully.");
}

function filterEmail() {
  _processCalendarResponses();
  _processGithubNotifications();
}

// Look for message with an expireafter/RETENTION label and delete messages
// older than the configured retention period.
function expireEmail() {
  let expired = 0;
  for (const label of _getExpireAfterLabels()) {
    const value = label.getName().split("/").slice(1).join("/");
    const maxAgeMs = _parseDuration(value);
    const cutoff = new Date(Date.now() - maxAgeMs);
    const before = _formatDateForSearch(cutoff);
    const query = `label:${label.getName()} before:${before}`;
    const threads = GmailApp.search(query, 0, 100);

    for (const thread of threads) {
      thread.moveToTrash();
      expired++;
    }
  }
  console.log(`Expired ${expired} threads`);
}

// Look for message with an archiveafter/RETENTION label and archive messages
// older than the configured retention period.
function archiveEmail() {
  let archived = 0;
  for (const label of _getArchiveAfterLabels()) {
    const value = label.getName().split("/").slice(1).join("/");
    const maxAgeMs = _parseDuration(value);
    const cutoff = new Date(Date.now() - maxAgeMs);
    const before = _formatDateForSearch(cutoff);

    // restrict this to in:inbox to avoid matching already archived messages
    const query = `in:inbox label:${label.getName()} before:${before}`;
    const threads = GmailApp.search(query, 0, 100);

    for (const thread of threads) {
      thread.moveToArchive();
      archived++;
    }
  }
  console.log(`Archived ${archived} threads`);
}

function syncLabelVisibility() {
  // pattern, messageList, labelList
  _setLabelVisibility("^expireafter", "hide", "hide");
  _setLabelVisibility("^archiveafter", "hide", "hide");
  _setLabelVisibility("^fv", "hide", "hide");
  _setLabelVisibility("^list", "hide");
}

function _processGithubNotifications() {
  console.log("Processing github notifications");
  const filterVersionLabel = `fv/${FILTERVERSION}`;
  const searchQuery = `from:github.com (-label:github OR -label:${filterVersionLabel})`;
  const threads = GmailApp.search(searchQuery, 0, 400);

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
