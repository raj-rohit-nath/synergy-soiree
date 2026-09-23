/**
 * SYNERGY SOIREE - Registration Backend
 * ------------------------------------------
 * Enforces a per-company seat quota (e.g. Tech Republic = 2, Omega = 2, Fakir = 3, etc.)
 * Data lives in a Google Sheet with two tabs: "Quotas" and "Registrations"
 *
 * SETUP:
 * 1. Create a new Google Sheet.
 * 2. Add a tab named exactly "Quotas" with headers in row 1: Company | Quota
 *    (Import Quotas.csv provided alongside this file, or paste the values in.)
 * 3. Add a tab named exactly "Registrations" with headers in row 1:
 *    Timestamp | Company | Name | Designation | Phone | Email | T-Shirt Size |
 *    Food Allergy | Allergy Details | Dietary Preference | Beef Preference |
 *    NID Number | NID File Link
 * 4. Copy the Spreadsheet ID (the long string in the sheet's URL) into SHEET_ID below.
 * 5. In the Apps Script editor: Extensions > Apps Script (from the Sheet), paste this
 *    file as Code.gs and Index.html as a separate HTML file.
 * 6. Deploy > New deployment > Web app.
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 7. Use the resulting Web App URL as your new "Register Now" link.
 *
 * NID FILE UPLOADS: each submitted NID copy (PDF, JPG, or PNG) is saved as a file in Google Drive
 * (in the folder named by NID_FOLDER_NAME below, created automatically on first
 * use) and the Registrations row stores a link to that file.
 *
 * TROUBLESHOOTING "Error loading companies":
 * This build never throws blindly - getCompanyAvailability() always returns
 * { error: true, message: '...' } with the REAL reason (wrong SHEET_ID, wrong
 * tab name, empty Quotas tab, etc.) so the browser shows you exactly what's
 * wrong instead of a generic message. Open the browser console (F12) or just
 * read the message shown under the dropdown.
 */

const SHEET_ID = 'PASTE_YOUR_SPREADSHEET_ID_HERE';
const QUOTA_SHEET = 'Quotas';
const REG_SHEET = 'Registrations';
const NID_FOLDER_NAME = 'Synergy Soiree - NID Uploads';

function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Synergy Soiree')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Returns (creating if needed) the Drive folder used to store NID uploads.
 */
function getNidFolder_() {
  const folders = DriveApp.getFoldersByName(NID_FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(NID_FOLDER_NAME);
}


/**
 * Returns availability for every company: quota, used, remaining.
 * Called by the client on page load to populate the dropdown.
 *
 * IMPORTANT: this never throws. If anything goes wrong it returns
 * { error: true, message: '...' } so the client can show the REAL
 * reason instead of a generic "Error loading companies".
 */
function getCompanyAvailability() {
  try {
    if (!SHEET_ID || SHEET_ID === 'PASTE_YOUR_SPREADSHEET_ID_HERE') {
      return { error: true, message: 'SHEET_ID has not been set in Code.gs. Paste your Spreadsheet ID into the SHEET_ID constant and redeploy.' };
    }

    const ss = SpreadsheetApp.openById(SHEET_ID);

    const quotaSheet = ss.getSheetByName(QUOTA_SHEET);
    if (!quotaSheet) {
      return { error: true, message: 'No tab named "' + QUOTA_SHEET + '" was found. Check the tab name (case-sensitive).' };
    }

    const regSheet = ss.getSheetByName(REG_SHEET);
    if (!regSheet) {
      return { error: true, message: 'No tab named "' + REG_SHEET + '" was found. Check the tab name (case-sensitive).' };
    }

    const quotaData = quotaSheet.getDataRange().getValues();
    if (quotaData.length < 2) {
      return { error: true, message: 'The "' + QUOTA_SHEET + '" tab has no company rows below the header.' };
    }

    const regData = regSheet.getDataRange().getValues();

    const counts = {};
    for (let i = 1; i < regData.length; i++) {
      const company = (regData[i][1] || '').toString().trim();
      if (!company) continue;
      counts[company] = (counts[company] || 0) + 1;
    }

    const result = [];
    for (let i = 1; i < quotaData.length; i++) {
      const company = (quotaData[i][0] || '').toString().trim();
      if (!company) continue;
      const quota = Number(quotaData[i][1]) || 0;
      const used = counts[company] || 0;
      result.push({
        company: company,
        quota: quota,
        used: used,
        remaining: Math.max(quota - used, 0)
      });
    }

    result.sort((a, b) => a.company.localeCompare(b.company));
    return { error: false, companies: result };

  } catch (err) {
    return { error: true, message: 'Server error: ' + err.message };
  }
}

/**
 * Handles a registration submission.
 * Uses a script lock so two simultaneous submissions for the last open seat
 * can't both succeed (race condition protection).
 */
function submitRegistration(formObject) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    if (!SHEET_ID || SHEET_ID === 'PASTE_YOUR_SPREADSHEET_ID_HERE') {
      return { success: false, message: 'SHEET_ID has not been set in Code.gs.' };
    }

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const quotaSheet = ss.getSheetByName(QUOTA_SHEET);
    const regSheet = ss.getSheetByName(REG_SHEET);

    if (!quotaSheet || !regSheet) {
      return { success: false, message: 'Sheet tabs are missing or misnamed. Contact the organizer.' };
    }

    const company = (formObject.company || '').toString().trim();
    const name = (formObject.name || '').toString().trim();
    const designation = (formObject.designation || '').toString().trim();
    const phone = (formObject.phone || '').toString().trim();
    const email = (formObject.email || '').toString().trim();
    const tshirtSize = (formObject.tshirtSize || '').toString().trim();
    const foodAllergy = (formObject.foodAllergy || '').toString().trim();
    const allergyDetails = (formObject.allergyDetails || '').toString().trim();
    const dietaryPreference = (formObject.dietaryPreference || '').toString().trim();
    const beefPreference = (formObject.beefPreference || '').toString().trim();
    const nidNumber = (formObject.nidNumber || '').toString().trim();
    const nidFileBase64 = (formObject.nidFileBase64 || '').toString();
    const nidFileName = (formObject.nidFileName || 'NID.pdf').toString();
    const nidFileType = (formObject.nidFileType || 'application/pdf').toString();

    if (!company || !name || !email || !designation || !phone || !tshirtSize || !foodAllergy || !nidNumber) {
      return { success: false, message: 'Please fill in all required fields.' };
    }

    if (!nidFileBase64) {
      return { success: false, message: 'Please attach a PDF copy of your NID.' };
    }

    if (nidFileType !== 'application/pdf' && nidFileType !== 'image/jpeg' &&
        nidFileType !== 'image/jpg' && nidFileType !== 'image/png') {
      return { success: false, message: 'The NID copy must be a PDF, JPG, or PNG file.' };
    }

    // ~5 MB limit, checked again server-side (base64 is ~1.37x the raw bytes)
    if (nidFileBase64.length > 5 * 1024 * 1024 * 1.37) {
      return { success: false, message: 'The NID file must be under 5 MB.' };
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return { success: false, message: 'Please enter a valid email address.' };
    }

    // Look up this company's quota - match case-insensitively so typos in
    // capitalization don't get rejected, but store the canonical spelling
    // from the Quotas sheet so reporting stays consistent.
    const quotaData = quotaSheet.getDataRange().getValues();
    let quota = null;
    let canonicalCompany = null;
    const typedLower = company.toLowerCase();
    for (let i = 1; i < quotaData.length; i++) {
      const listedCompany = (quotaData[i][0] || '').toString().trim();
      if (listedCompany.toLowerCase() === typedLower) {
        quota = Number(quotaData[i][1]) || 0;
        canonicalCompany = listedCompany;
        break;
      }
    }

    if (quota === null) {
      return { success: false, message: 'We could not match "' + company + '" to an invited company. Please check the spelling matches your invitation exactly, or contact the organizer.' };
    }

    const regData = regSheet.getDataRange().getValues();

    // Prevent duplicate email registrations (column F = Email, index 5)
    for (let i = 1; i < regData.length; i++) {
      if ((regData[i][5] || '').toString().trim().toLowerCase() === email.toLowerCase()) {
        return { success: false, message: 'This email address has already been registered.' };
      }
    }

    // Count current registrations for this company (column B = Company, index 1)
    let used = 0;
    for (let i = 1; i < regData.length; i++) {
      if ((regData[i][1] || '').toString().trim() === canonicalCompany) used++;
    }

    if (used >= quota) {
      return {
        success: false,
        message: canonicalCompany + ' has already reached its allocated ' + quota +
          ' seat(s) for this event. Please contact the organizer if you believe this is an error.'
      };
    }

    // Save the NID file to Drive and get a shareable link
    let nidFileUrl = '';
    try {
      const folder = getNidFolder_();
      const safeName = (canonicalCompany + ' - ' + name + ' - NID').replace(/[\\/:*?"<>|]/g, '-');
      const extensionByType = {
        'application/pdf': '.pdf',
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/png': '.png'
      };
      const extension = extensionByType[nidFileType] || '';
      const blob = Utilities.newBlob(Utilities.base64Decode(nidFileBase64), nidFileType, safeName + extension);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      nidFileUrl = file.getUrl();
    } catch (uploadErr) {
      return { success: false, message: 'Could not upload the NID file: ' + uploadErr.message };
    }

    regSheet.appendRow([
      new Date(), canonicalCompany, name, designation, phone, email,
      tshirtSize, foodAllergy, allergyDetails, dietaryPreference, beefPreference,
      nidNumber, nidFileUrl
    ]);

    const remaining = quota - used - 1;
    return {
      success: true,
      message: 'You are registered for Synergy Soiree! ' + remaining +
        ' seat(s) remaining for ' + canonicalCompany + '.'
    };

  } catch (err) {
    return { success: false, message: 'Something went wrong: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}