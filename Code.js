// Run this function to set up the triggers
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
  Logger.log(`Expired ${expired} threads`);
}

function _relabelGithub() {
  const searchQuery = `label:notification/github`;
  const threads = GmailApp.search(searchQuery);
  for (const thread of threads) {
    const msg = thread.getMessages()[0];
    const headers = _getHeaderMap(msg);
    const labels = [];

    is_issue = headers["x-github-issuestate"];
    if (is_issue) {
      labels.push(_getOrCreateLabel("bug/github"));
    }

    for (const label of labels) {
      thread.addLabel(label);
    }
  }
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
        thread.moveToArchive();
      }
      Logger.log(`Processed ${threads.length} threads for: ${subjectPrefix}`);
    }
  }
}

function _testFunction() {
  console.log("This is a test.");
}
