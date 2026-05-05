/**
 * Rest Easy Property Management — Single Apps Script
 * Handles BOTH form submissions AND dashboard data retrieval via ONE deployment URL.
 *
 * ARCHITECTURE:
 *   - doPost(e)    : routes maintenance OR financial form based on formType hidden field
 *   - doGet(e)     : returns all data for the dashboard (maintenance, financial, units, summary)
 *
 * ONE deployment URL handles everything. No separate projects needed.
 */

// ================================================================
// FORM SUBMISSION HANDLER (doPost)
// Routes to correct sheet tab based on hidden "formType" field
// ================================================================
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  var data = e.parameter;   // URL-encoded form fields — no JSON parsing needed

  if (!data.formType) {
    return ContentService.createTextOutput('Error: formType not specified');
  }

  if (data.formType === 'maintenance') {
    // --- MAINTENANCE FORM ---
    var maintenanceSheet = sheet.getSheetByName('Maintenance Log');
    maintenanceSheet.appendRow([
      new Date(),                // Timestamp
      data.unitNumber  || '',    // Unit Number
      data.tenantName || '',    // Tenant Name
      data.tenantEmail || '',   // Tenant Email
      data.tenantPhone || '',   // Tenant Phone
      data.category    || '',    // Category
      data.description|| '',    // Description
      data.urgency    || '',    // Urgency
      'New',                     // Status (default)
      '',                        // Landlord Notes
      ''                         // Resolved Date
    ]);

    // Optional: send email notification to landlord
    var landlordEmail = sheet.getSheetByName('Units & Rent').getRange('G1').getValue();
    if (landlordEmail && landlordEmail !== '') {
      MailApp.sendEmail(landlordEmail,
        'New Maintenance Request — ' + data.urgency,
        'Unit: ' + data.unitNumber +
        '\nTenant: ' + data.tenantName +
        '\nCategory: ' + data.category +
        '\nUrgency: ' + data.urgency +
        '\n\n' + data.description);
    }

    return ContentService.createTextOutput('OK');

  } else if (data.formType === 'financial') {
    // --- FINANCIAL FORM ---
    var financialSheet = sheet.getSheetByName('Financial Log');
    financialSheet.appendRow([
      data.date        || '',   // Date
      data.type       || '',   // Transaction Type
      data.unitNumber  || '',  // Unit Number
      parseFloat(data.amount) || 0,  // Amount
      data.description|| '',   // Description
      data.category   || '',   // Category
      data.notes      || ''    // Notes
    ]);

    return ContentService.createTextOutput('OK');

  } else if (data.formType === 'updateMaintenance') {
    // --- DASHBOARD UPDATE: maintenance status / notes ---
    // data.rowIndex = 1-based row number in the Maintenance Log sheet
    var maintenanceSheet = sheet.getSheetByName('Maintenance Log');
    var headers = maintenanceSheet.getRange(1, 1, 1, maintenanceSheet.getLastColumn()).getValues()[0].map(function(h) { return String(h).trim(); });

    var rowIndex = parseInt(data.rowIndex);
    if (!rowIndex || rowIndex < 2) {
      return ContentService.createTextOutput('Error: invalid row index');
    }

    var statusCol = headers.indexOf('Status') + 1;
    var notesCol = headers.indexOf('Landlord Notes') + 1;
    var resolvedCol = headers.indexOf('Resolved Date') + 1;

    if (data.status) {
      maintenanceSheet.getRange(rowIndex, statusCol).setValue(data.status);
      if (data.status === 'Resolved') {
        maintenanceSheet.getRange(rowIndex, resolvedCol).setValue(new Date());
      }
    }
    if (data.landlordNotes !== undefined) {
      maintenanceSheet.getRange(rowIndex, notesCol).setValue(data.landlordNotes);
    }

    return ContentService.createTextOutput('OK');

  } else {
    return ContentService.createTextOutput('Error: unknown formType');
  }
}

// ================================================================
// DASHBOARD DATA PROVIDER (doGet)
// Returns maintenance log, financial log, units config, and computed summary
// ================================================================
function doGet(e) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheetMaintenance = spreadsheet.getSheetByName('Maintenance Log');
  var sheetFinancial   = spreadsheet.getSheetByName('Financial Log');
  var sheetUnits       = spreadsheet.getSheetByName('Units & Rent');

  // Read raw 2D arrays
  var maintenanceRaw = sheetMaintenance.getDataRange().getValues();
  var financialRaw   = sheetFinancial.getDataRange().getValues();
  var unitsRaw       = sheetUnits.getDataRange().getValues();

  // Strip headers, trim whitespace
  var mHeaders = maintenanceRaw[0].map(function(h) { return String(h).trim(); });
  var fHeaders = financialRaw[0].map(function(h)   { return String(h).trim(); });
  var uHeaders = unitsRaw[0].map(function(h)        { return String(h).trim(); });

  // Convert rows to objects keyed by header name
  // _rowIndex is the actual 1-based row number in the sheet (not the filtered array index)
  function toObjects(raw, headers) {
    return raw.slice(1).filter(function(row) {
      return row.some(function(c) { return c !== ''; });
    }).map(function(row) {
      var obj = {};
      headers.forEach(function(h, i) { obj[h] = row[i]; });
      obj._rowIndex = raw.indexOf(row) + 1;  // actual sheet row (1-based, row 1 = header)
      return obj;
    });
  }

  var maintenance = toObjects(maintenanceRaw, mHeaders);
  var financial   = toObjects(financialRaw,   fHeaders);
  var units       = toObjects(unitsRaw,         uHeaders);

  // ============================================================
  // Compute financial summary (same logic as SPEC.md)
  // ============================================================
  var now       = new Date();
  var thisMonth = now.getMonth();
  var thisYear  = now.getFullYear();

  // Total expected monthly rent (from Units & Rent tab)
  var rentExpected = 0;
  units.forEach(function(u) {
    rentExpected += parseFloat(u['Monthly Rent']) || 0;
  });

  // This month's income/expenses from Financial Log
  var rentCollected = 0;
  var monthIncome    = 0;
  var monthExpenses  = 0;

  financial.forEach(function(tx) {
    var txDate = tx['Date'];
    if (!txDate) return;
    var d = new Date(txDate);
    if (d.getMonth() !== thisMonth || d.getFullYear() !== thisYear) return;

    var amount = parseFloat(tx['Amount']) || 0;
    if (amount > 0) {
      monthIncome += amount;
      if (String(tx['Transaction Type']) === 'Rent Payment') {
        rentCollected += amount;
      }
    } else {
      monthExpenses += Math.abs(amount);
    }
  });

  var netCashflow = monthIncome - monthExpenses;

  // Per-unit breakdown
  var unitSummaries = units.map(function(u) {
    var unitNum    = u['Unit Number']   || u['UnitNumber']   || '';
    var tenantName = u['Tenant Name']   || u['TenantName']   || '—';
    var monthlyRent = parseFloat(u['Monthly Rent']) || 0;

    var collected = 0;
    financial.forEach(function(tx) {
      var txDate = tx['Date'];
      if (!txDate) return;
      var d = new Date(txDate);
      if (d.getMonth() !== thisMonth || d.getFullYear() !== thisYear) return;
      if (String(tx['Unit Number']) !== String(unitNum)) return;
      if (String(tx['Transaction Type']) !== 'Rent Payment') return;
      collected += parseFloat(tx['Amount']) || 0;
    });

    var outstanding = monthlyRent - collected;
    var status = (monthlyRent === 0) ? 'vacant'
               : (outstanding === 0) ? 'current'
               : 'delinquent';

    return {
      unit:       unitNum,
      tenant:     tenantName,
      rent:       monthlyRent,
      collected:  collected,
      outstanding: outstanding,
      status:     status
    };
  });

  var summary = {
    rentExpected:  rentExpected,
    rentCollected: rentCollected,
    monthIncome:    monthIncome,
    monthExpenses:  monthExpenses,
    netCashflow:    netCashflow,
    units:          unitSummaries
  };

  // ============================================================
  // Maintenance open/resolved counts for dashboard stats
  // ============================================================
  var openRequests = maintenance.filter(function(r) {
    var s = r.Status;
    return s !== 'Resolved' && s !== 'Rejected';
  }).length;

  var resolvedThisMonth = maintenance.filter(function(r) {
    if (r.Status !== 'Resolved') return false;
    var d = new Date(r.Timestamp);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).length;

  // ============================================================
  // Build output — dashboard expects financialData to be summary object
  // ============================================================
  var output = {
    maintenance:       maintenance,
    financial:        financial,
    units:             units,
    summary:           summary,
    maintenanceStats: {
      openRequests:       openRequests,
      resolvedThisMonth: resolvedThisMonth
    }
  };

  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}
