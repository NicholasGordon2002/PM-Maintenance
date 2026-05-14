/**
 * Rest Easy Property Dashboard — app.js
 * All dashboard logic: data loading, rendering, modal, save, settings, export.
 */

var maintenanceData = [];
var financialData   = {};
var settings        = { scriptUrl: '', propertyName: 'Rest Easy Properties' };
var _pauseReload    = false; // blocks background reload during/after a save

document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    initTabs();
    loadData();
    updateTimestamp();
    setInterval(function() { if (!_pauseReload) { loadData(); updateTimestamp(); } }, 60000);
});

// ================================================================
// Utilities
// ================================================================

/**
 * Build a URL from a base and a params object.
 * Handles bases that may or may not already have a query string.
 */
function buildUrl(base, params) {
    var clean = base.trim().replace(/[?&]+$/, ''); // strip trailing ? or &
    var qs = Object.keys(params).map(function(k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }).join('&');
    return clean + (clean.indexOf('?') === -1 ? '?' : '&') + qs;
}

/**
 * Fetch JSON from a URL.
 * Apps Script redirects GET requests — fetch follows redirects automatically,
 * but we must NOT throw on 3xx. We only throw on genuine network errors.
 */
function fetchJSON(url) {
    return fetch(url, { redirect: 'follow' })
        .then(function(res) {
            // Read body as text first so we can give a useful error if it isn't JSON
            return res.text();
        })
        .then(function(text) {
            try {
                return JSON.parse(text);
            } catch (e) {
                throw new Error('Response was not JSON. Got: ' + text.substring(0, 120));
            }
        });
}

// ================================================================
// Tabs
// ================================================================
function initTabs() {
    document.querySelectorAll('.tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
            tab.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });
            document.getElementById(tab.dataset.tab + '-view').classList.add('active');
        });
    });
}

// ================================================================
// Data Loading
// ================================================================
function loadData() {
    if (settings.scriptUrl) {
        loadFromGoogleSheets();
    } else {
        loadDemoData();
    }
}

function loadFromGoogleSheets() {
    var url = buildUrl(settings.scriptUrl, { t: Date.now() }); // cache-bust
    fetchJSON(url)
        .then(function(data) {
            if (data.error) {
                console.error('Apps Script error:', data.error);
                showToast('Sheet error: ' + data.error, 'error');
                updateConnectionStatus(false);
                return;
            }
            maintenanceData = data.maintenance || [];
            financialData   = data.summary    || {};
            renderAll();
            updateConnectionStatus(true);
        })
        .catch(function(err) {
            console.warn('Dashboard load failed:', err.message);
            updateConnectionStatus(false);
            // Don't overwrite real data with demo data if we already have data
            if (!maintenanceData.length) loadDemoData();
        });
}

function loadDemoData() {
    maintenanceData = [
        { _rowIndex: 2, Timestamp: '2026-04-29 08:30 AM', 'Unit Number': 'Unit 3', 'Tenant Name': 'Maria Garcia',  'Tenant Email': 'mgarcia@email.com', 'Tenant Phone': '(555) 123-4567', Category: 'Plumbing',   Description: 'Kitchen sink draining slowly.', Urgency: 'Medium',    Status: 'In Progress',   'Landlord Notes': 'Scheduled plumber for Thursday' },
        { _rowIndex: 3, Timestamp: '2026-04-28 03:15 PM', 'Unit Number': 'Unit 7', 'Tenant Name': 'James Wilson',  'Tenant Email': 'jwilson@email.com',  'Tenant Phone': '(555) 987-6543', Category: 'Electrical', Description: 'Bedroom ceiling light flickers.',  Urgency: 'Low',       Status: 'New',           'Landlord Notes': '' },
        { _rowIndex: 4, Timestamp: '2026-04-28 09:00 AM', 'Unit Number': 'Unit 1', 'Tenant Name': 'Robert Chen',   'Tenant Email': 'rchen@email.com',    'Tenant Phone': '(555) 456-7890', Category: 'HVAC',       Description: 'AC not cooling, loud noise.',     Urgency: 'High',      Status: 'Pending Parts', 'Landlord Notes': 'Ordered part, ETA 3 days' },
        { _rowIndex: 5, Timestamp: '2026-04-27 11:45 AM', 'Unit Number': 'Unit 5', 'Tenant Name': 'Sarah Johnson', 'Tenant Email': 'sjohnson@email.com', 'Tenant Phone': '(555) 234-5678', Category: 'Appliance',  Description: 'Fridge not maintaining temp.',    Urgency: 'Emergency', Status: 'Resolved',      'Landlord Notes': 'Replaced compressor motor.' },
        { _rowIndex: 6, Timestamp: '2026-04-24 04:20 PM', 'Unit Number': 'Unit 4', 'Tenant Name': 'Emily Davis',   'Tenant Email': 'edavis@email.com',   'Tenant Phone': '(555) 678-9012', Category: 'Structural', Description: 'Crack in bedroom wall.',          Urgency: 'High',      Status: 'In Progress',   'Landlord Notes': 'Called structural engineer.' }
    ];
    financialData = {
        rentExpected: 6400, rentCollected: 4800,
        monthIncome: 5200, monthExpenses: 1850, netCashflow: 3350,
        units: [
            { unit: 'Unit 1', tenant: 'Robert Chen',    rent: 800, collected: 800, outstanding: 0,   status: 'current'    },
            { unit: 'Unit 2', tenant: 'Linda Martinez', rent: 800, collected: 800, outstanding: 0,   status: 'current'    },
            { unit: 'Unit 3', tenant: 'Maria Garcia',   rent: 800, collected: 600, outstanding: 200, status: 'delinquent' },
            { unit: 'Unit 4', tenant: 'Emily Davis',    rent: 800, collected: 800, outstanding: 0,   status: 'current'    },
            { unit: 'Unit 5', tenant: 'Sarah Johnson',  rent: 800, collected: 0,   outstanding: 800, status: 'delinquent' },
            { unit: 'Unit 6', tenant: '',               rent: 800, collected: 0,   outstanding: 0,   status: 'vacant'     },
            { unit: 'Unit 7', tenant: 'James Wilson',   rent: 800, collected: 800, outstanding: 0,   status: 'current'    },
            { unit: 'Unit 8', tenant: 'Michael Brown',  rent: 800, collected: 0,   outstanding: 800, status: 'delinquent' }
        ]
    };
    renderAll();
    updateConnectionStatus(false);
}

// ================================================================
// Field helpers — handle both capitalized (live) and lowercase (demo) keys
// ================================================================
function S(r)   { return r['Status']         || r.status         || ''; }
function U(r)   { return r['Urgency']        || r.urgency        || ''; }
function TS(r)  { return r['Timestamp']      || r.timestamp      || ''; }
function UN(r)  { return r['Unit Number']    || r.unit           || ''; }
function CAT(r) { return r['Category']       || r.category       || ''; }
function DES(r) { return r['Description']    || r.description    || ''; }
function TN(r)  { return r['Tenant Name']    || r.tenantName     || ''; }
function TE(r)  { return r['Tenant Email']   || r.tenantEmail    || ''; }
function TP(r)  { return r['Tenant Phone']   || r.tenantPhone    || ''; }
function LN(r)  { return r['Landlord Notes'] || r.landlordNotes  || ''; }
function RI(r)  { return r._rowIndex         || ''; }

function statusClass(s) { return s ? s.toLowerCase().replace(/\s+/g, '-') : ''; }
function fmt(n)          { return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0 }); }
function esc(s)          { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function trunc(s, len)   { s = s || ''; return s.length > len ? s.substring(0, len) + '...' : s; }

// ================================================================
// Rendering
// ================================================================
function renderAll() {
    renderMaintenanceTable();
    renderMaintenanceStats();
    renderFinancialSummary();
    renderUnitsTable();
}

function renderMaintenanceTable() {
    var tbody = document.getElementById('maintenance-tbody');
    var sf = document.getElementById('status-filter').value;
    var uf = document.getElementById('urgency-filter').value;
    var rows = maintenanceData.filter(function(r) {
        if (sf && S(r) !== sf) return false;
        if (uf && U(r) !== uf) return false;
        return true;
    });
    tbody.innerHTML = rows.map(function(r) {
        var idx = maintenanceData.indexOf(r);
        return '<tr>' +
            '<td>' + esc(TS(r)) + '</td>' +
            '<td><strong>' + esc(UN(r)) + '</strong></td>' +
            '<td>' + esc(CAT(r)) + '</td>' +
            '<td><span class="urgency-badge ' + statusClass(U(r)) + '">' + esc(U(r)) + '</span></td>' +
            '<td><span class="status-badge '  + statusClass(S(r)) + '">' + esc(S(r)) + '</span></td>' +
            '<td><div class="desc-cell" title="' + esc(DES(r)) + '">' + esc(trunc(DES(r), 45)) + '</div></td>' +
            '<td><strong>' + esc(TN(r)) + '</strong><br><span>' + esc(TE(r)) + '</span>' +
                (TP(r) ? '<br><span>' + esc(TP(r)) + '</span>' : '') + '</td>' +
            '<td><button class="btn-action primary" onclick="openModal(' + idx + ')">Update</button></td>' +
            '</tr>';
    }).join('');
    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#9ca3af;">No requests found</td></tr>';
    }
}

function renderMaintenanceStats() {
    var now = new Date(), m = now.getMonth(), y = now.getFullYear();
    document.getElementById('emergency-count').textContent = maintenanceData.filter(function(r) { return U(r) === 'Emergency' && S(r) !== 'Resolved'; }).length;
    document.getElementById('high-count').textContent      = maintenanceData.filter(function(r) { return U(r) === 'High'      && S(r) !== 'Resolved'; }).length;
    document.getElementById('open-count').textContent      = maintenanceData.filter(function(r) { return S(r) !== 'Resolved'  && S(r) !== 'Rejected'; }).length;
    document.getElementById('resolved-count').textContent  = maintenanceData.filter(function(r) {
        if (S(r) !== 'Resolved') return false;
        var d = new Date(TS(r)); return !isNaN(d) && d.getMonth() === m && d.getFullYear() === y;
    }).length;
}

function renderFinancialSummary() {
    var fd = financialData;
    document.getElementById('rent-expected').textContent    = fmt(fd.rentExpected  || 0);
    document.getElementById('rent-collected').textContent   = fmt(fd.rentCollected || 0);
    document.getElementById('rent-outstanding').textContent = fmt((fd.rentExpected || 0) - (fd.rentCollected || 0));
    var rate = fd.rentExpected > 0 ? Math.round((fd.rentCollected / fd.rentExpected) * 100) : 0;
    document.getElementById('collection-rate').textContent  = rate + '%';
    document.getElementById('month-income').textContent     = fmt(fd.monthIncome   || 0);
    document.getElementById('month-expenses').textContent   = fmt(fd.monthExpenses || 0);
    var netEl = document.getElementById('net-cashflow');
    netEl.textContent = fmt(fd.netCashflow || 0);
    netEl.className   = 'metric-value ' + ((fd.netCashflow || 0) >= 0 ? 'success' : 'danger');
}

function renderUnitsTable() {
    var tbody = document.getElementById('units-tbody');
    var units = (financialData && financialData.units) ? financialData.units : [];
    tbody.innerHTML = units.map(function(u) {
        var outstanding = u.outstanding || 0;
        var tenantDisplay = u.tenant ? esc(u.tenant) : '<span style="color:#9ca3af">Vacant</span>';
        return '<tr>' +
            '<td><strong>' + esc(u.unit || '') + '</strong></td>' +
            '<td>' + tenantDisplay + '</td>' +
            '<td>' + fmt(u.rent      || 0) + '</td>' +
            '<td>' + fmt(u.collected || 0) + '</td>' +
            '<td style="color:' + (outstanding > 0 ? 'var(--danger)' : 'var(--success)') + '">' + fmt(outstanding) + '</td>' +
            '<td><span class="unit-status ' + esc(u.status || '') + '">' + esc(u.status || '') + '</span></td>' +
            '</tr>';
    }).join('');
    if (!units.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#9ca3af;">No units configured</td></tr>';
    }
    document.getElementById('open-requests').textContent  = maintenanceData.filter(function(r) { return S(r) !== 'Resolved' && S(r) !== 'Rejected'; }).length;
    document.getElementById('resolved-month').textContent = maintenanceData.filter(function(r) { return S(r) === 'Resolved'; }).length;
}

function filterMaintenance() { renderMaintenanceTable(); }

// ================================================================
// Modal
// ================================================================
function openModal(idx) {
    var r = maintenanceData[idx];
    if (!r) return;
    document.getElementById('req-index').value    = idx;
    document.getElementById('req-rowIndex').value = RI(r);
    document.getElementById('req-status').value   = S(r) || 'New';
    document.getElementById('req-notes').value    = LN(r);
    document.getElementById('maintenance-modal').classList.add('active');
}

function closeModal() {
    document.getElementById('maintenance-modal').classList.remove('active');
    // Do NOT call clearToast() — toast must survive modal close
}

// ================================================================
// Toast
// ================================================================
function showToast(msg, type) {
    var existing = document.getElementById('rest-easy-toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.id = 'rest-easy-toast';
    toast.setAttribute('style', [
        'position:fixed',
        'bottom:32px',
        'left:50%',
        'transform:translateX(-50%)',
        'padding:14px 28px',
        'border-radius:8px',
        'font-size:15px',
        'font-weight:600',
        'z-index:2147483647', // max z-index
        'box-shadow:0 4px 24px rgba(0,0,0,0.4)',
        'pointer-events:none',
        'white-space:nowrap',
        'opacity:1',
        'transition:opacity 0.4s ease'
    ].join(';'));
    toast.style.background = type === 'success' ? '#059669' : type === 'error' ? '#DC2626' : '#1e293b';
    toast.style.color = '#fff';
    toast.textContent = msg;
    document.body.appendChild(toast);
    // Fade out after 4s, remove after 4.4s
    setTimeout(function() { toast.style.opacity = '0'; }, 4000);
    setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 4400);
}

function setButtonState(btn, label, disabled) {
    if (!btn) return;
    btn.disabled    = disabled;
    btn.textContent = label;
}

// ================================================================
// Save update
// Uses GET query params — avoids the Apps Script POST->302 redirect
// that silently drops POST body parameters.
// ================================================================
function saveUpdate(e) {
    if (e) e.preventDefault();

    var idx    = parseInt(document.getElementById('req-index').value);
    var rowIdx = document.getElementById('req-rowIndex').value;
    var status = document.getElementById('req-status').value;
    var notes  = document.getElementById('req-notes').value;
    var btn    = document.getElementById('save-changes-btn');

    // Validate row index before doing anything
    if (!rowIdx || rowIdx === '' || parseInt(rowIdx) < 2) {
        showToast('Error: missing row reference. Please refresh and try again.', 'error');
        return;
    }

    setButtonState(btn, 'Saving...', true);

    // Update local cache immediately so re-renders show new values
    if (!isNaN(idx) && maintenanceData[idx]) {
        maintenanceData[idx]['Status']         = status;
        maintenanceData[idx]['Landlord Notes'] = notes;
    }

    // Demo mode — no script URL configured
    if (!settings.scriptUrl) {
        setButtonState(btn, 'Save Changes', false);
        closeModal();
        showToast('Saved (demo mode - not persisted)', 'info');
        renderMaintenanceTable();
        renderMaintenanceStats();
        return;
    }

    _pauseReload = true;

    var url = buildUrl(settings.scriptUrl, {
        action:        'updateMaintenance',
        rowIndex:      rowIdx,
        status:        status,
        landlordNotes: notes,
        t:             Date.now()
    });

    fetchJSON(url)
        .then(function(data) {
            setButtonState(btn, 'Save Changes', false);
            closeModal();
            if (data.ok === true) {
                showToast('Saved to Google Sheet', 'success');
            } else {
                var errMsg = data.error || 'Unknown error';
                showToast('Save failed: ' + errMsg, 'error');
                console.error('Save error from Apps Script:', errMsg);
            }
            renderMaintenanceTable();
            renderMaintenanceStats();
            setTimeout(function() { _pauseReload = false; }, 15000);
        })
        .catch(function(err) {
            setButtonState(btn, 'Save Changes', false);
            closeModal();
            showToast('Network error - check connection', 'error');
            console.error('saveUpdate fetch error:', err.message);
            renderMaintenanceTable();
            renderMaintenanceStats();
            _pauseReload = false;
        });
}

// ================================================================
// Settings
// ================================================================
function openSettings() {
    document.getElementById('set-url').value  = settings.scriptUrl;
    document.getElementById('set-name').value = settings.propertyName;
    document.getElementById('settings-modal').classList.add('active');
}

function closeSettings() {
    document.getElementById('settings-modal').classList.remove('active');
}

function saveSettings(e) {
    e.preventDefault();
    settings.scriptUrl    = document.getElementById('set-url').value.trim();
    settings.propertyName = document.getElementById('set-name').value.trim() || 'Rest Easy Properties';
    localStorage.setItem('restEasySettings', JSON.stringify(settings));
    document.querySelectorAll('.property-name').forEach(function(el) { el.textContent = settings.propertyName; });
    closeSettings();
    loadData();
}

function loadSettings() {
    try {
        var s = localStorage.getItem('restEasySettings');
        if (s) settings = JSON.parse(s);
    } catch(e) { /* corrupt localStorage — use defaults */ }
    document.querySelectorAll('.property-name').forEach(function(el) { el.textContent = settings.propertyName || 'Rest Easy Properties'; });
}

function updateConnectionStatus(connected) {
    var el = document.getElementById('connection-status');
    if (!el) return;
    el.querySelector('.status-text').textContent    = connected ? 'Connected' : 'Demo Mode';
    el.querySelector('.status-dot').style.background = connected ? '#059669' : '#D97706';
}

function updateTimestamp() {
    var el = document.getElementById('last-updated');
    if (el) el.textContent = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function refreshData() { if (!_pauseReload) { loadData(); updateTimestamp(); } }

// ================================================================
// Export CSV
// ================================================================
function exportCSV() {
    var fd  = financialData;
    var csv = 'REST EASY - Financial Summary\n\n';
    csv += 'RENT COLLECTION\nExpected,' + (fd.rentExpected||0) + '\nCollected,' + (fd.rentCollected||0) + '\nOutstanding,' + ((fd.rentExpected||0)-(fd.rentCollected||0)) + '\n\n';
    csv += 'INCOME & EXPENSES\nIncome,' + (fd.monthIncome||0) + '\nExpenses,' + (fd.monthExpenses||0) + '\nNet,' + (fd.netCashflow||0) + '\n\n';
    csv += 'BY UNIT\nUnit,Tenant,Rent,Collected,Outstanding,Status\n';
    (fd.units||[]).forEach(function(u) { csv += [u.unit,u.tenant,u.rent,u.collected,u.outstanding,u.status].join(',') + '\n'; });
    csv += '\nMAINTENANCE\nTimestamp,Unit,Category,Urgency,Status,Description,Tenant,Email,Phone,Notes\n';
    maintenanceData.forEach(function(m) {
        var q = function(v) { return '"' + String(v||'').replace(/"/g,'""') + '"'; };
        csv += [q(TS(m)),q(UN(m)),q(CAT(m)),q(U(m)),q(S(m)),q(DES(m)),q(TN(m)),q(TE(m)),q(TP(m)),q(LN(m))].join(',') + '\n';
    });
    var a = document.createElement('a');
    a.href     = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'rest-easy-export.csv';
    a.click();
}

// Close modals on Escape or backdrop click
document.addEventListener('keydown', function(e) { if (e.key === 'Escape') { closeModal(); closeSettings(); } });
document.querySelectorAll('.modal').forEach(function(m) {
    m.addEventListener('click', function(e) { if (e.target === m) m.classList.remove('active'); });
});
