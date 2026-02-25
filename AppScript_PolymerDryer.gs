/**
 * Polymer Dryer Log — Google Apps Script Web App
 * 
 * Spreadsheet ID: 1cvyaViIjIdWXkIlv0z7BkSLX1W-M_TJd
 * Sheet name:     Polymer Dryer Log
 * 
 * SETUP:
 * 1. Open the spreadsheet → Extensions → Apps Script
 * 2. Paste this entire code into Code.gs (replace any existing code)
 * 3. Click Deploy → New deployment
 * 4. Type: Web app
 * 5. Execute as: Me
 * 6. Who has access: Anyone
 * 7. Click Deploy → Copy the Web App URL
 * 8. Paste that URL into the HTML file (APPS_SCRIPT_URL constant)
 */

const SHEET_NAME = 'Polymer Dryer Log';
const HEADER_ROW = 7; // Headers are on row 7, data starts from row 8

// Column mapping (1-indexed) — Column A is row numbering, data starts from B
const COL = {
  ROW_NR:         1,  // A — Row numbering (auto or manual)
  BATCH:          2,  // B — Batch / Serial Nr
  MATERIAL:       3,  // C — Material Type
  AMOUNT:         4,  // D — Amount on Spool (cm³)
  MOISTURE_BEFORE:5,  // E — Moisture % Before
  BAY:            6,  // F — Drying Bay
  INSTALL_DATE:   7,  // G — Installation Date
  INSTALL_TIME:   8,  // H — Installation Time
  INSTALLED_BY:   9,  // I — Installed By
  REMOVAL_DATE:  10,  // J — Removal Date
  REMOVAL_TIME:  11,  // K — Removal Time
  MOISTURE_AFTER:12,  // L — Moisture % After Drying
  REMOVED_BY:    13,  // M — Removed By
  DURATION:      14,  // N — Duration (HH:MM)
  DRYING_RATE:   15,  // O — Drying Rate (% / hr)
};

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById('1cyAXFktLuTIysYrD3Kzq8YBfndA9cfdTXCmPNMt7AyE');
    const sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      return jsonResponse({ success: false, error: 'Sheet "' + SHEET_NAME + '" not found.' });
    }

    const activity = data.activity; // 'installation' or 'removal'

    if (activity === 'installation') {
      return handleInstallation(sheet, data);
    } else if (activity === 'removal') {
      return handleRemoval(sheet, data);
    } else {
      return jsonResponse({ success: false, error: 'Unknown activity type: ' + activity });
    }

  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function handleInstallation(sheet, data) {
  // Find next empty row after header
  const lastRow = sheet.getLastRow();
  const nextRow = lastRow < HEADER_ROW ? HEADER_ROW + 1 : lastRow + 1;
  const nextNr = nextRow - HEADER_ROW; // Sequential number (1, 2, 3...)

  // Write to specific row: A = row nr, B–I = installation data, J–O empty
  const rowData = [
    nextNr,               // A — Row Nr
    data.batch,           // B
    data.material,        // C
    toNumber(data.amount),// D
    toNumber(data.moistureBefore), // E
    toNumber(data.bay),   // F
    data.installDate,     // G
    data.installTime,     // H
    data.installedBy,     // I
    '', '', '', '', '', '' // J–O empty (removal fields)
  ];
  sheet.getRange(nextRow, 1, 1, rowData.length).setValues([rowData]);

  return jsonResponse({ success: true, message: 'Installation recorded — row ' + nextRow });
}

function handleRemoval(sheet, data) {
  // Find matching row: same Batch + Amount, and Removal Date is still empty
  const allData = sheet.getDataRange().getValues();
  let matchRow = -1;

  // Start from bottom, skip everything at or above header row
  for (let i = allData.length - 1; i >= HEADER_ROW; i--) {
    const rowBatch  = String(allData[i][COL.BATCH - 1]).trim();
    const rowAmount = parseFloat(allData[i][COL.AMOUNT - 1]);
    const rowRemovalDate = String(allData[i][COL.REMOVAL_DATE - 1]).trim();

    const inputBatch  = String(data.batch).trim();
    const inputAmount = parseFloat(data.amount);

    if (rowBatch === inputBatch &&
        rowAmount === inputAmount &&
        rowRemovalDate === '') {
      matchRow = i + 1; // 1-indexed for Sheets API
      break;
    }
  }

  if (matchRow === -1) {
    return jsonResponse({
      success: false,
      error: 'Nav atrasta Installation rinda ar Batch "' + data.batch + '" un Amount "' + data.amount + '". Vispirms jāveic Installation!'
    });
  }

  // Calculate duration and drying rate
  const installDate = sheet.getRange(matchRow, COL.INSTALL_DATE).getValue();
  const installTime = sheet.getRange(matchRow, COL.INSTALL_TIME).getValue();
  const moistureBefore = parseFloat(sheet.getRange(matchRow, COL.MOISTURE_BEFORE).getValue());

  let duration = '';
  let dryingRate = '';

  if (installDate && installTime && data.removalDate && data.removalTime) {
    const instDT = new Date(installDate + 'T' + installTime);
    const remDT  = new Date(data.removalDate + 'T' + data.removalTime);
    const diffMs = remDT - instDT;

    if (diffMs > 0) {
      const totalMins = Math.floor(diffMs / 60000);
      const hrs  = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      duration = pad2(hrs) + ':' + pad2(mins);

      const moistureAfter = parseFloat(data.moistureAfter);
      if (!isNaN(moistureBefore) && !isNaN(moistureAfter)) {
        const totalHrs = diffMs / 3600000;
        dryingRate = ((moistureBefore - moistureAfter) / totalHrs).toFixed(5);
      }
    }
  }

  // Update columns I–N in the matched row
  sheet.getRange(matchRow, COL.REMOVAL_DATE).setValue(data.removalDate);
  sheet.getRange(matchRow, COL.REMOVAL_TIME).setValue(data.removalTime);
  sheet.getRange(matchRow, COL.MOISTURE_AFTER).setValue(data.moistureAfter !== '' ? toNumber(data.moistureAfter) : '');
  sheet.getRange(matchRow, COL.REMOVED_BY).setValue(data.removedBy);
  sheet.getRange(matchRow, COL.DURATION).setValue(duration);
  sheet.getRange(matchRow, COL.DRYING_RATE).setValue(dryingRate !== '' ? toNumber(dryingRate) : '');

  return jsonResponse({
    success: true,
    message: 'Removal recorded — row ' + matchRow + ' updated. Duration: ' + duration
  });
}

// ——— Helpers ———

function toNumber(val) {
  const n = parseFloat(val);
  return isNaN(n) ? val : n;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Optional: test via GET to check if the script is alive
function doGet(e) {
  return jsonResponse({ status: 'ok', sheet: SHEET_NAME, message: 'Polymer Dryer Log API is running.' });
}
