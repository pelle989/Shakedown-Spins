var CONFIG = {
  spreadsheetId: 'PASTE_YOUR_SPREADSHEET_ID_HERE',
  sheetName: 'Form Responses 1',
  headerRow: 1,
  idColumnName: 'ENTRY_ID',
  hiddenColumnName: 'HIDE',
  requiredColumns: ['DATE', 'TIME', 'VENUE', 'CITY, STATE', 'URL']
};

function doGet(e) {
  e = e || {};

  if (e.parameter && e.parameter.format === 'json') {
    return jsonResponse(getPublicShows_());
  }

  return HtmlService
    .createHtmlOutputFromFile('Index')
    .setTitle('Show Admin')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getShows() {
  var context = getSheetContext_();
  var rows = getShowRows_(context);

  rows.sort(function(a, b) {
    return compareDates_(a.dateRaw, b.dateRaw);
  });

  return rows;
}

function getShowById(entryId) {
  var context = getSheetContext_();
  var row = findRowByEntryId_(context, entryId);

  if (!row) {
    throw new Error('Entry not found.');
  }

  return buildShowRecord_(context, row.rowNumber, row.values);
}

function saveShow(payload) {
  payload = payload || {};

  validatePayload_(payload);

  var context = getSheetContext_();
  var row = findRowByEntryId_(context, payload.entryId);

  if (!row) {
    throw new Error('Entry not found.');
  }

  writeValue_(context, row.rowNumber, context.headerMap['DATE'], payload.date || '');
  writeValue_(context, row.rowNumber, context.headerMap['TIME'], payload.time || '');
  writeValue_(context, row.rowNumber, context.headerMap['VENUE'], payload.venue || '');
  writeValue_(context, row.rowNumber, context.headerMap['CITY, STATE'], payload.cityState || '');
  writeValue_(context, row.rowNumber, context.headerMap['URL'], payload.url || '');

  if (context.headerMap[CONFIG.hiddenColumnName]) {
    writeValue_(context, row.rowNumber, context.headerMap[CONFIG.hiddenColumnName], payload.hidden ? 'TRUE' : '');
  }

  return {
    ok: true,
    show: getShowById(payload.entryId)
  };
}

function hideShow(entryId, hidden) {
  var context = getSheetContext_();
  var row = findRowByEntryId_(context, entryId);

  if (!row) {
    throw new Error('Entry not found.');
  }

  writeValue_(context, row.rowNumber, context.headerMap[CONFIG.hiddenColumnName], hidden ? 'TRUE' : '');

  return {
    ok: true,
    show: getShowById(entryId)
  };
}

function deleteShow(entryId) {
  var context = getSheetContext_();
  var row = findRowByEntryId_(context, entryId);

  if (!row) {
    throw new Error('Entry not found.');
  }

  context.sheet.deleteRow(row.rowNumber);

  return { ok: true };
}

function getPublicShows_() {
  var rows = getShows().filter(function(show) {
    return !show.hidden;
  });

  return rows.map(function(show) {
    return {
      'DATE': show.date,
      'TIME': show.time,
      'VENUE': show.venue,
      'CITY, STATE': show.cityState,
      'URL': show.url
    };
  });
}

function getSheetContext_() {
  var spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  var sheet = spreadsheet.getSheetByName(CONFIG.sheetName);

  if (!sheet) {
    throw new Error('Sheet "' + CONFIG.sheetName + '" not found.');
  }

  var lastColumn = Math.max(sheet.getLastColumn(), 1);
  var headerValues = sheet.getRange(CONFIG.headerRow, 1, 1, lastColumn).getValues()[0];

  ensureRequiredColumns_(sheet, headerValues);

  headerValues = sheet.getRange(CONFIG.headerRow, 1, 1, sheet.getLastColumn()).getValues()[0];

  return {
    sheet: sheet,
    headerMap: buildHeaderMap_(headerValues)
  };
}

function ensureRequiredColumns_(sheet, headerValues) {
  var currentHeaders = headerValues.slice();
  var missing = [];
  var expected = CONFIG.requiredColumns.concat([CONFIG.idColumnName, CONFIG.hiddenColumnName]);

  expected.forEach(function(name) {
    if (currentHeaders.indexOf(name) === -1) {
      missing.push(name);
    }
  });

  if (!missing.length) {
    return;
  }

  missing.forEach(function(name) {
    sheet.getRange(CONFIG.headerRow, sheet.getLastColumn() + 1).setValue(name);
  });

  if (missing.indexOf(CONFIG.idColumnName) !== -1) {
    populateMissingEntryIds_(sheet);
  }
}

function populateMissingEntryIds_(sheet) {
  var headerValues = sheet.getRange(CONFIG.headerRow, 1, 1, sheet.getLastColumn()).getValues()[0];
  var headerMap = buildHeaderMap_(headerValues);
  var lastRow = sheet.getLastRow();

  if (lastRow <= CONFIG.headerRow) {
    return;
  }

  var range = sheet.getRange(CONFIG.headerRow + 1, 1, lastRow - CONFIG.headerRow, sheet.getLastColumn());
  var values = range.getValues();
  var idIndex = headerMap[CONFIG.idColumnName] - 1;

  values.forEach(function(row, idx) {
    if (!row[idIndex]) {
      row[idIndex] = Utilities.getUuid();
    }
  });

  range.setValues(values);
}

function buildHeaderMap_(headers) {
  var map = {};

  headers.forEach(function(header, idx) {
    if (header) {
      map[String(header).trim()] = idx + 1;
    }
  });

  return map;
}

function getShowRows_(context) {
  var lastRow = context.sheet.getLastRow();

  if (lastRow <= CONFIG.headerRow) {
    return [];
  }

  var values = context.sheet
    .getRange(CONFIG.headerRow + 1, 1, lastRow - CONFIG.headerRow, context.sheet.getLastColumn())
    .getValues();

  return values.map(function(row, idx) {
    return buildShowRecord_(context, CONFIG.headerRow + 1 + idx, row);
  }).filter(function(show) {
    return show.entryId && (show.venue || show.cityState || show.date);
  });
}

function buildShowRecord_(context, rowNumber, rowValues) {
  var dateValue = readCell_(rowValues, context.headerMap['DATE']);

  return {
    entryId: String(readCell_(rowValues, context.headerMap[CONFIG.idColumnName]) || ''),
    rowNumber: rowNumber,
    date: normalizeDateForInput_(dateValue),
    dateLabel: formatDateLabel_(dateValue),
    dateRaw: toDateOrNull_(dateValue),
    time: String(readCell_(rowValues, context.headerMap['TIME']) || ''),
    venue: String(readCell_(rowValues, context.headerMap['VENUE']) || ''),
    cityState: String(readCell_(rowValues, context.headerMap['CITY, STATE']) || ''),
    url: String(readCell_(rowValues, context.headerMap['URL']) || ''),
    hidden: toBoolean_(readCell_(rowValues, context.headerMap[CONFIG.hiddenColumnName]))
  };
}

function findRowByEntryId_(context, entryId) {
  if (!entryId) {
    return null;
  }

  var lastRow = context.sheet.getLastRow();

  if (lastRow <= CONFIG.headerRow) {
    return null;
  }

  var values = context.sheet
    .getRange(CONFIG.headerRow + 1, 1, lastRow - CONFIG.headerRow, context.sheet.getLastColumn())
    .getValues();
  var idIndex = context.headerMap[CONFIG.idColumnName] - 1;

  for (var i = 0; i < values.length; i += 1) {
    if (String(values[i][idIndex] || '') === String(entryId)) {
      return {
        rowNumber: CONFIG.headerRow + 1 + i,
        values: values[i]
      };
    }
  }

  return null;
}

function writeValue_(context, rowNumber, columnNumber, value) {
  if (!columnNumber) {
    return;
  }

  context.sheet.getRange(rowNumber, columnNumber).setValue(value);
}

function readCell_(rowValues, columnNumber) {
  if (!columnNumber) {
    return '';
  }

  return rowValues[columnNumber - 1];
}

function validatePayload_(payload) {
  if (!payload.entryId) {
    throw new Error('Missing entry ID.');
  }

  if (!payload.date) {
    throw new Error('Date is required.');
  }

  if (!payload.venue) {
    throw new Error('Venue is required.');
  }
}

function normalizeDateForInput_(value) {
  var date = toDateOrNull_(value);

  if (!date) {
    return '';
  }

  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function formatDateLabel_(value) {
  var date = toDateOrNull_(value);

  if (!date) {
    return '';
  }

  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'MMM d, yyyy');
}

function toDateOrNull_(value) {
  if (!value) {
    return null;
  }

  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return value;
  }

  var parsed = new Date(value);

  if (isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function compareDates_(a, b) {
  if (!a && !b) {
    return 0;
  }

  if (!a) {
    return 1;
  }

  if (!b) {
    return -1;
  }

  return a.getTime() - b.getTime();
}

function toBoolean_(value) {
  if (value === true || value === 1) {
    return true;
  }

  if (!value) {
    return false;
  }

  var normalized = String(value).trim().toLowerCase();
  return normalized === 'true' || normalized === 'yes' || normalized === 'y' || normalized === '1';
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
