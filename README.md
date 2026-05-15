# Gmail Filters

A Google Apps Script project that manages Gmail filters and automated email processing. It handles:

- Syncing declarative filter rules to Gmail (labels, archiving, spam/trash routing)
- Labeling GitHub notifications based on headers (reason, issue state)
- Labeling and expiring Google Calendar responses
- Auto-expiring labeled threads after a configurable retention period

## Prerequisites

- A Google account with Gmail
- [Node.js](https://nodejs.org/) (LTS or later)
- A Google Cloud Platform project (instructions below)

## Setup

### 1. Create a GCP project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown at the top of the page and select **New Project**.
3. Enter a project name (e.g. `gmail-filters`).
4. For **Parent resource**, select **Default projects**. Click **Create**.
4. Once created, select the new project from the project dropdown.
5. Note the **project number** from the project dashboard -- you will need it later when linking the Apps Script project.

### 2. Enable required APIs

In your new GCP project, enable both required APIs:

1. Go to **APIs & Services > Enabled APIs & services** (or visit `https://console.cloud.google.com/apis/dashboard`).
2. Search for **Gmail API**, select it, and click **Enable**.
3. Search for **Apps Script API**, select it, and click **Enable**.

### 3. Configure the OAuth consent screen

Before creating OAuth credentials, you must configure the consent screen:

1. Go to **APIs & Services > OAuth consent screen**.
2. Under **App Information**, set the **App name** (e.g. `gmail-filters`) and your email as the **User support email**.
3. Under **Audience**, select **Internal**.
4. Under **Contact Information**, enter your email address.
5. Click **Save**.

The scopes the script requires at runtime are declared in `appsscript.json` and will be prompted for when the script first runs -- you do not need to configure scopes on the consent screen.

### 4. Create an OAuth client ID

1. Go to **APIs & Services > Credentials**.
2. Click **Create Credentials > OAuth client ID**.
3. Set **Application type** to **Desktop app**.
4. Give it a name (e.g. `clasp`).
5. Click **Create**.
6. Click **Download JSON** to download the client secret file.
7. Create a `creds/` directory in this project and save the downloaded file there. The `creds/` directory is already in `.gitignore`.

### 5. Install clasp

Install the Google Apps Script CLI globally:

```sh
npm install -g @google/clasp
```

### 6. Authenticate clasp with your OAuth client ID

The default `clasp login` does not request the Gmail scopes this project needs. You must point clasp at your own OAuth client credentials so that the token it acquires includes the correct scopes.

1. Locate the client secret JSON file you downloaded in step 4 (it will be in `creds/`).

2. Run `clasp login` with the `--creds` flag:

    ```sh
    clasp login --creds creds/client_secret_XXXXX.apps.googleusercontent.com.json \
      --use-project-scopes --include-clasp-scopes
    ```

   `--use-project-scopes` requests the Gmail scopes declared in `appsscript.json`, and `--include-clasp-scopes` adds clasp's own management scopes so that push/pull continue to work. This opens a browser window. Sign in with your Google account and grant all requested permissions.

3. On success, clasp writes a token file to `~/.clasprc.json`.

### 7. Install project dependencies

```sh
npm install
```

### 8. Link the Apps Script project to your GCP project

If you are creating a new Apps Script project rather than cloning an existing one:

1. Run `clasp create --type standalone` to create a new Apps Script project, or use `clasp clone <scriptId>` if you already have one.
2. Open the Apps Script editor by visiting `https://script.google.com` and selecting your project.
3. In the Apps Script editor, go to **Project Settings** (gear icon).
4. Under **Google Cloud Platform (GCP) Project**, click **Change project**.
5. Enter the **project number** from step 1 and click **Set project**.

### 9. Push and deploy

Push the local source to Apps Script:

```sh
npm run push
```

This runs the Biome linter/formatter first, then pushes via `clasp push`.

### 10. Set up triggers

After pushing, open the Apps Script editor at `https://script.google.com`, select your project, and run the `_createTimeTriggers` function. This installs two time-based triggers:

- `_filterEmail` -- runs every 30 minutes to process GitHub notifications and calendar responses
- `_expireEmail` -- runs daily to trash threads past their retention period

You can also do this from the command line by running:

```sh
clasp run _createTimeTriggers
```

### 11. Sync filters

To sync the declarative filter rules defined in `Filters.js` to your Gmail account, run the `_syncFilters` function from the Apps Script editor. This will create any missing filters and remove any filters that are no longer defined in the source.

```sh
clasp run _syncFilters
```
