/**
 * SYNERGY SOIREE — Roadmap Tracker (all-in-one Apps Script app)
 * ----------------------------------------------------------------
 * This single Apps Script project both SERVES the guest roadmap app
 * AND stores every guest's progress in your Google Sheet. There is
 * no separate hosting needed — the Web app URL Apps Script gives you
 * IS the link guests will open (and eventually, what the QR code
 * will point to).
 *
 * SETUP (do this once):
 *
 * 1. In your Google Sheet: rename the first tab to exactly "Guests".
 *    Paste this EXACT header row into A1:V1, one value per cell:
 *
 *    GuestID | Company | Name | Registered At | Last Activity | Progress |
 *    Check-In | D1 Lunch | D1 Beach | D1 Snacks | D1 Formal | D1 Dinner |
 *    D2 Breakfast | D2 Lunch | D2 Sightseeing | D2 Snacks | D2 Formal Awards |
 *    D2 Dinner | D2 Gala |
 *    D3 Breakfast | D3 Checkout | D3 Transfer
 *
 *    (22 columns total: A through V.)
 *
 * 2. Extensions → Apps Script. Delete any existing code in "Code.gs"
 *    and paste in THIS file's contents.
 *
 * 3. In the Apps Script editor, click the "+" next to Files → HTML.
 *    Name the new file exactly: Index
 *    (Apps Script will show it as Index.html — that's correct.)
 *    Paste the contents of the separate "Index.html" file into it.
 *
 * 4. Deploy → New deployment → Type: Web app.
 *      - Execute as: Me
 *      - Who has access: Anyone
 *    Click Deploy, authorize the permissions Google asks for.
 *
 * 5. Open the Web app URL it gives you. You should now see the
 *    actual roadmap app (registration screen first), NOT a JSON message.
 *
 * 6. Whenever you edit this script or Index.html again, you must go to
 *    Manage deployments → Edit (pencil icon) → New version → Deploy
 *    for the changes to actually go live at the same URL.
 *
 * PHOTOS FEATURE:
 * Guests can upload photos from the app. They land in a Drive folder
 * called "Synergy Soiree Guest Photos" (created automatically the first
 * time someone uploads), and every upload is logged in a new "Photos"
 * tab in this same Sheet (Timestamp, Guest, File Name, Drive Link) so
 * you can see who shared what without opening the Drive folder.
 *
 * Because this uses Google Drive, the FIRST time you redeploy after
 * adding this feature, Google will ask you to re-authorize the script
 * with an additional Drive permission. This is expected — approve it,
 * or photo uploads will fail with a permissions error.
 */

// PASTE YOUR SHEET'S ID HERE. Find it in the Sheet's URL:
// https://docs.google.com/spreadsheets/d/THIS_LONG_ID_HERE/edit
const SPREADSHEET_ID = "129N8slj2Xc7XZIe2kZLVZmnEcvtn3gpWWJEFjxPUvBM";

const SHEET_NAME = "Guests";

// The 16 itinerary steps, in the same order as the frontend. Do not reorder
// this list without also reordering the matching columns in the sheet.
const STEP_IDS = [
  "d1-1", "d1-2", "d1-4", "d1-5", "d1-6", "d1-7",
  "d2-1", "d2-3", "d2-5", "d2-7", "d2-8", "d2-9", "d2-10",
  "d3-1", "d3-2", "d3-3"
];

const FIRST_STEP_COL = 7; // Column G is "Check-In" (A=1 ... F=6)

/**
 * Serves the app itself. Visiting the Web app URL in a browser runs this.
 */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Synergy Soiree — Your Journey')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=2')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getSheet_() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID.indexOf("PASTE_YOUR") === 0) {
    throw new Error('SPREADSHEET_ID is not set in Code.gs. Paste your Sheet ID in near the top of the file.');
  }
  let ss;
  try {
    ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (err) {
    throw new Error('Could not open the Sheet with that ID. Double check SPREADSHEET_ID is correct. (' + err.message + ')');
  }
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Tab "Guests" not found in the Sheet. Check the tab name is exactly "Guests".');
  return sheet;
}

function findRowByGuestId_(sheet, guestId) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === guestId) return i + 1; // 1-indexed row number
  }
  return -1;
}

// Writes a Date into a cell AND forces a date+time display format,
// since Sheets sometimes auto-formats Date values as date-only.
function setTimestamp_(range, date) {
  range.setValue(date);
  range.setNumberFormat("MM/dd/yyyy hh:mm:ss AM/PM");
}

/**
 * Called from the browser via google.script.run.uploadPhoto(...)
 * Saves the photo to a Drive folder and logs it in a "Photos" sheet tab.
 */
function uploadPhoto(guestId, guestName, company, fileName, mimeType, base64Data) {
  try {
    const folder = getPhotoFolder_();
    const bytes = Utilities.base64Decode(base64Data);
    const blob = Utilities.newBlob(bytes, mimeType, fileName);
    const file = folder.createFile(blob);
    logPhoto_(guestId, company, guestName, fileName, file.getUrl());
    return { success: true, fileUrl: file.getUrl() };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * RUN THIS ONCE MANUALLY from the Apps Script editor (select it in the
 * function dropdown at the top, click Run) to trigger Google's permission
 * prompt for Drive access. Approve it, then redeploy. Guests' phones can't
 * grant this themselves since the app runs "as you" — only you can approve
 * it, one time, here in the editor.
 */
function testDriveSetup() {
  const folder = getPhotoFolder_();
  Logger.log('Drive folder ready: ' + folder.getUrl());
}

function getPhotoFolder_() {
  const folderName = "Synergy Soiree Guest Photos";
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(folderName);
}

function logPhoto_(guestId, company, name, fileName, fileUrl) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName("Photos");
  if (!sheet) {
    sheet = ss.insertSheet("Photos");
    sheet.appendRow(["Timestamp", "GuestID", "Company", "Name", "File Name", "Drive Link"]);
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    sheet.appendRow([new Date(), guestId, company, name, fileName, fileUrl]);
    sheet.getRange(sheet.getLastRow(), 1).setNumberFormat("MM/dd/yyyy hh:mm:ss AM/PM");
  } finally {
    lock.releaseLock();
  }
}

/**
 * Called from the browser via google.script.run.registerGuest(...)
 */
function registerGuest(guestId, company, name) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getSheet_();
    let row = findRowByGuestId_(sheet, guestId);
    if (row === -1) {
      const now = new Date();
      const newRow = [guestId, company, name, now, now, "0/" + STEP_IDS.length];
      for (let i = 0; i < STEP_IDS.length; i++) newRow.push("");
      sheet.appendRow(newRow);
      const newRowIndex = sheet.getLastRow();
      setTimestamp_(sheet.getRange(newRowIndex, 4), now); // Registered At
      setTimestamp_(sheet.getRange(newRowIndex, 5), now); // Last Activity
    }
    return getProgress(guestId);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Called from the browser via google.script.run.markStepDone(...)
 */
function markStepDone(guestId, stepId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getSheet_();
    const row = findRowByGuestId_(sheet, guestId);
    if (row === -1) return { error: "Guest not found. Please restart the app." };

    const stepIndex = STEP_IDS.indexOf(stepId);
    if (stepIndex === -1) return { error: "Unknown step: " + stepId };

    const col = FIRST_STEP_COL + stepIndex;
    const cell = sheet.getRange(row, col);
    if (!cell.getValue()) {
      setTimestamp_(cell, new Date());
      cell.setBackground("#d9f2d9");
    }

    setTimestamp_(sheet.getRange(row, 5), new Date()); // Last Activity

    const rowValues = sheet.getRange(row, FIRST_STEP_COL, 1, STEP_IDS.length).getValues()[0];
    const doneCount = rowValues.filter(function (v) { return v !== ""; }).length;
    sheet.getRange(row, 6).setValue(doneCount + "/" + STEP_IDS.length);

    return getProgress(guestId);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Called from the browser via google.script.run.getProgress(...)
 */
function getProgress(guestId) {
  const sheet = getSheet_();
  const row = findRowByGuestId_(sheet, guestId);
  if (row === -1) return { error: "Guest not found." };

  const rowValues = sheet.getRange(row, FIRST_STEP_COL, 1, STEP_IDS.length).getValues()[0];
  const progress = {};
  STEP_IDS.forEach(function (id, i) {
    progress[id] = !!rowValues[i];
  });
  return { guestId: guestId, progress: progress };
}