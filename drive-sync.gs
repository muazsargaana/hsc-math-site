const ROOT_FOLDER_ID = "14l4d3NYTNsP0nF46R5HM3jkvlmD5z7kc";
const GITHUB_OWNER = "muazsargaana";
const GITHUB_REPO = "hsc-math-site";
const GITHUB_BRANCH = "main";
const GITHUB_FILE = "resources.js";

function syncDriveToGitHub() {
  const token = PropertiesService.getScriptProperties().getProperty("GITHUB_TOKEN");
  if (!token) {
    throw new Error("Missing GITHUB_TOKEN in Script Properties.");
  }

  const output = buildResourcesFile();
  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE}`;

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };

  const currentResponse = UrlFetchApp.fetch(`${apiUrl}?ref=${encodeURIComponent(GITHUB_BRANCH)}`, {
    method: "get",
    headers,
    muteHttpExceptions: true
  });

  if (currentResponse.getResponseCode() !== 200) {
    throw new Error(`Could not read ${GITHUB_FILE} from GitHub: ${currentResponse.getContentText()}`);
  }

  const current = JSON.parse(currentResponse.getContentText());
  const currentText = Utilities.newBlob(Utilities.base64Decode(current.content.replace(/\n/g, ""))).getDataAsString();

  if (normaliseText(currentText) === normaliseText(output)) {
    console.log("No Drive changes detected. GitHub not updated.");
    return;
  }

  const payload = {
    message: "Auto-sync resources from Google Drive",
    content: Utilities.base64Encode(output, Utilities.Charset.UTF_8),
    sha: current.sha,
    branch: GITHUB_BRANCH
  };

  const updateResponse = UrlFetchApp.fetch(apiUrl, {
    method: "put",
    headers: {
      ...headers,
      "Content-Type": "application/json"
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const code = updateResponse.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error(`GitHub update failed: ${updateResponse.getContentText()}`);
  }

  console.log("resources.js updated on GitHub. Vercel will redeploy automatically.");
}

function buildResourcesFile() {
  const root = DriveApp.getFolderById(ROOT_FOLDER_ID);

  const wantedFolders = {
    "3U": "Mathematics Extension 1",
    "4U": "Mathematics Extension 2"
  };

  const resources = [];
  const folders = root.getFolders();

  while (folders.hasNext()) {
    const folder = folders.next();
    const originalName = folder.getName();

    if (wantedFolders[originalName]) {
      resources.push(scanFolder(folder, wantedFolders[originalName]));
    }
  }

  resources.sort((a, b) => naturalCompare(a.name, b.name));

  return "const resources = " + JSON.stringify(resources, null, 2) + ";\n";
}

function scanFolder(folder, displayName) {
  const children = [];

  const folders = folder.getFolders();
  while (folders.hasNext()) {
    const subfolder = folders.next();

    if (subfolder.getName().trim().toLowerCase() === "unknown school") {
      continue;
    }

    children.push(scanFolder(subfolder, subfolder.getName()));
  }

  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    children.push({
      type: "file",
      name: file.getName(),
      url: file.getUrl()
    });
  }

  children.sort((a, b) => {
    if (a.type === "folder" && b.type !== "folder") return -1;
    if (a.type !== "folder" && b.type === "folder") return 1;
    return naturalCompare(a.name, b.name);
  });

  return {
    type: "folder",
    name: displayName,
    children
  };
}

function naturalCompare(a, b) {
  return a.localeCompare(b, undefined, {
    numeric: true,
    sensitivity: "base"
  });
}

function normaliseText(text) {
  return String(text).replace(/\r\n/g, "\n").trim();
}

function installAutoSync() {
  ScriptApp.getProjectTriggers()
    .filter(trigger => trigger.getHandlerFunction() === "syncDriveToGitHub")
    .forEach(trigger => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger("syncDriveToGitHub")
    .timeBased()
    .everyMinutes(5)
    .create();

  console.log("Automatic Drive → GitHub sync installed. Runs every 5 minutes.");
}

function removeAutoSync() {
  ScriptApp.getProjectTriggers()
    .filter(trigger => trigger.getHandlerFunction() === "syncDriveToGitHub")
    .forEach(trigger => ScriptApp.deleteTrigger(trigger));

  console.log("Automatic sync removed.");
}
