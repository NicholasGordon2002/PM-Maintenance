// Rest Easy Property Dashboard - App Logic

var maintenanceData = [];
var financialData = {};
var settings = { scriptUrl: '', propertyName: 'Rest Easy Properties' };

document.addEventListener('DOMContentLoaded', function() {
    initTabs();
    loadSettings();
    loadData();
    updateTimestamp();
    setInterval(loadData, 60000);
});

function initTabs() {
    document.querySelectorAll('.tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
            var tabId = tab.dataset.tab;
            document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
            tab.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });
            document.getElementById(tabId + '-view').classList.add('active');
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

function loadDemoData() {
    maintenanceData = [
        { _rowIndex: 2, Timestamp: '2026-04-29 08:30 AM', 'Unit Number': 'Unit 3', 'Tenant Name': 'Maria Garcia', 'Tenant Email': 'mgarcia@email.com', 'Tenant Phone': '(555) 123-4567', Category: 'Plumbing', Description: 'Kitchen sink draining slowly. Water backs up when running the dishwasher.', Urgency: 'Medium', Status: 'In Progress', 'Landlord Notes': 'Scheduled plumber for Thursday' },
        { _rowIndex: 3, Timestamp: '2026-04-28 03:15 PM', 'Unit Number': 'Unit 7', 'Tenant Name': 'James Wilson', 'Tenant Email': 'jwilson@email.com', 'Tenant Phone': '(555) 987-6543', Category: 'Electrical', Description: 'Bedroom ceiling light flickers intermittently.', Urgency: 'Low', Status: 'New', 'Landlord Notes': '' },
        { _rowIndex: 4, Timestamp: '2026-04-28 09:00 AM', 'Unit Number': 'Unit 1', 'Tenant Name': 'Robert Chen', 'Tenant Email': 'rchen@email.com', 'Tenant Phone': '(555) 456-7890', Category: 'HVAC', Description: 'AC unit not cooling properly. Making loud noise when running.', Urgency: 'High', Status: 'Pending Parts', 'Landlord Notes': 'Ordered compressor part, ETA 3 days' },
        { _rowIndex: 5, Timestamp: '2026-04-27 11:45 AM', 'Unit Number': 'Unit 5', 'Tenant Name': 'Sarah Johnson', 'Tenant Email': 'sjohnson@email.com', 'Tenant Phone': '(555) 234-5678', Category: 'Appliance', Description: 'Refrigerator not maintaining temperature.', Urgency: 'Emergency', Status: 'Resolved', 'Landlord Notes': 'Replaced compressor motor.' },
        { _rowIndex: 6, Timestamp: '2026-04-24 04:20 PM', 'Unit Number': 'Unit 4', 'Tenant Name': 'Emily Davis', 'Tenant Email': 'edavis@email.com', 'Tenant Phone': '(555) 678-9012', Category: 'Structural', Description: 'Crack in bedroom wall near window. Getting wider.', Urgency: 'High', Status: 'In Progress', 'Landlord Notes': 'Called structural engineer.' }
    ];

    financialData = {
        rentExpected: 6400, rentCollected: 4800,
        monthIncome: 5200, monthExpenses: 1850, netCashflow: 3350,
        units: [
            { unit: 'Unit 1', tenant: 'Robert Chen',   rent: 800, collected: 800, outstanding: 0,   status: 'current' },
            { unit: 'Unit 2', tenant: 'Linda Martinez', rent: 800, collected: 800, outstanding: 0,   status: 'current' },
            { unit: 'Unit 3', tenant: 'Maria Garcia',  rent: 800, collected: 600, outstanding: 200,  status: 'delinquent' },
            { unit: 'Unit 4', tenant: 'Emily Davis',   rent: 800, collected: 800, outstanding: 0,   status: 'current' },
            { unit: 'Unit 5', tenant: 'Sarah Johnson', rent: 800, collected: 0,   outstanding: 800,  status: 'delinquent' },
            { unit: 'Unit 6', tenant: '—',           rent: 800, collected: 0,   outstanding: 0,    status: 'vacant' },
            { unit: 'Unit 7', tenant: 'James Wilson',  rent: 800, collected: 800, outstanding: 0,   status: 'current' },
            { unit: 'Unit 8', tenant: 'Michael Brown', rent: 800, collected: 0,   outstanding: 800,  status: 'delinquent' }
        ]
    };

    renderAll();
    updateConnectionStatus(false);
}

function loadFromGoogleSheets() {
    fetch(settings.scriptUrl)
        .then(function(response) { return response.json(); })
        .then(function(data) {
            maintenanceData = data.maintenance || [];
            financialData  = data.summary  || {};
            renderAll();
            updateConnectionStatus(true);
        })
        .catch(function(err) {
            console.warn('Sheets fetch failed, using demo data:', err);
            loadDemoData();
            updateConnectionStatus(false);
        });
}

// ================================================================
// Helpers — normalize property names for both demo (lowercase) and sheet (Capitalized) formats
// ================================================================
function S(r)  { return r.Status        || r.status        || ''; }
function U(r)  { return r.Urgency      || r.urgency      || ''; }
function TS(r) { return r.Timestamp    || r.timestamp    || ''; }
function UN(r) { return r['Unit Number'] || r.unit        || ''; }
function CAT(r){ return r.Category      || r.category      || ''; }
function DES(r){ return r.Description   || r.description || ''; }
function TN(r) { return r['Tenant Name']  || r.tenantName  || ''; }
function TE(r) { return r['Tenant Email'] || r.tenantEmail || ''; }
function TP(r) { return r['Tenant Phone'] || r.tenantPhone || ''; }
function LN(r) { return r['Landlord Notes'] || r.landlordNotes || ''; }
function RI(r) { return r._rowIndex || ''; }

function statusClass(s) {
    if (!s) return '';
    return s.toLowerCase().replace(/\s+/g, '-');
}

function fmt(n) {
    return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0 });
}

function trunc(str, len) {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '...' : str;
}

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
        return '<tr>' +
            '<td>' + TS(r) + '</td>' +
            '<td><strong>' + UN(r) + '</strong></td>' +
            '<td>' + CAT(r) + '</td>' +
            '<td><span class="urgency-badge ' + statusClass(U(r)) + '">' + U(r) + '</span></td>' +
            '<td><span class="status-badge ' + statusClass(S(r)) + '">' + S(r) + '</span></td>' +
            '<td><div class="desc-cell" title="' + DES(r) + '">' + trunc(DES(r), 45) + '</div></td>' +
            '<td><strong>' + TN(r) + '</strong><br><span>' + TE(r) + '</span>' + (TP(r) ? '<br><span>' + TP(r) + '</span>' : '') + '</td>' +
            '<td><button class="btn-action primary" onclick="openModal(' + maintenanceData.indexOf(r) + ')">Update</button></td>' +
            '</tr>';
    }).join('');

    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#9ca3af;">No requests found</td></tr>';
    }
}

function renderMaintenanceStats() {
    var emergency = maintenanceData.filter(function(r) { return U(r) === 'Emergency' && S(r) !== 'Resolved'; }).length;
    var high     = maintenanceData.filter(function(r) { return U(r) === 'High'     && S(r) !== 'Resolved'; }).length;
    var open     = maintenanceData.filter(function(r) { return S(r) !== 'Resolved' && S(r) !== 'Rejected'; }).length;
    var now = new Date(), thisM = now.getMonth(), thisY = now.getFullYear();
    var resolved = maintenanceData.filter(function(r) {
        if (S(r) !== 'Resolved') return false;
        var d = new Date(TS(r)); return d.getMonth() === thisM && d.getFullYear() === thisY;
    }).length;

    document.getElementById('emergency-count').textContent = emergency;
    document.getElementById('high-count').textContent     = high;
    document.getElementById('open-count').textContent     = open;
    document.getElementById('resolved-count').textContent  = resolved;
}

function renderFinancialSummary() {
    var fd = financialData;
    document.getElementById('rent-expected').textContent     = fmt(fd.rentExpected || 0);
    document.getElementById('rent-collected').textContent   = fmt(fd.rentCollected || 0);
    document.getElementById('rent-outstanding').textContent = fmt((fd.rentExpected || 0) - (fd.rentCollected || 0));
    var rate = fd.rentExpected > 0 ? Math.round((fd.rentCollected / fd.rentExpected) * 100) : 0;
    document.getElementById('collection-rate').textContent = rate + '%';
    document.getElementById('month-income').textContent    = fmt(fd.monthIncome || 0);
    document.getElementById('month-expenses').textContent  = fmt(fd.monthExpenses || 0);
    document.getElementById('net-cashflow').textContent    = fmt(fd.netCashflow || 0);
    var netEl = document.getElementById('net-cashflow');
    netEl.className = 'metric-value ' + ((fd.netCashflow || 0) >= 0 ? 'success' : 'danger');
}

function renderUnitsTable() {
    var tbody = document.getElementById('units-tbody');
    var units = (financialData && financialData.units) ? financialData.units : [];
    var self = this;

    tbody.innerHTML = units.map(function(u) {
        var outstanding = u.outstanding || 0;
        return '<tr>' +
            '<td><strong>' + (u.unit || '') + '</strong></td>' +
            '<td>' + (u.tenant === '—' ? '<span style="color:#9ca3af">Vacant</span>' : (u.tenant || '—')) + '</td>' +
            '<td>' + fmt(u.rent || 0) + '</td>' +
            '<td>' + fmt(u.collected || 0) + '</td>' +
            '<td style="color:' + (outstanding > 0 ? 'var(--danger)' : 'var(--success)') + '">' + fmt(outstanding) + '</td>' +
            '<td><span class="unit-status ' + (u.status || '') + '">' + (u.status || '') + '</span></td>' +
            '</tr>';
    }).join('');

    if (!units.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#9ca3af;">No units configured</td></tr>';
    }

    var openReq = maintenanceData.filter(function(r) { return S(r) !== 'Resolved' && S(r) !== 'Rejected'; }).length;
    document.getElementById('open-requests').textContent = openReq;
    var resolvedM = maintenanceData.filter(function(r) { return S(r) === 'Resolved'; }).length;
    document.getElementById('resolved-month').textContent = resolvedM;
}

function filterMaintenance() { renderMaintenanceTable(); }

// ================================================================
// Modal
// ================================================================
function openModal(idx) {
    var r = maintenanceData[idx];
    if (!r) return;
    document.getElementById('req-index').value = idx;
    document.getElementById('req-rowIndex').value = RI(r);
    document.getElementById('req-status').value = S(r) || 'New';
    document.getElementById('req-notes').value = LN(r);
    document.getElementById('maintenance-modal').classList.add('active');
}

function closeModal() {
    document.getElementById('maintenance-modal').classList.remove('active');
    clearToast();
}

function showToast(msg, type) {
    var existing = document.getElementById('toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = 'position:fixed;bottom:24px;right:24px;padding:14px 20px;border-radius:8px;font-size:14px;font-weight:500;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.15);';
    if (type === 'success') {
        toast.style.background = '#059669'; toast.style.color = '#fff';
    } else if (type === 'error') {
        toast.style.background = '#DC2626'; toast.style.color = '#fff';
    } else {
        toast.style.background = '#374151'; toast.style.color = '#fff';
    }
    toast.textContent = msg;
    document.body.appendChild(toast);
}

function clearToast() {
    var t = document.getElementById('toast');
    if (t) t.remove();
}

function setButtonState(btn, label, disabled) {
    btn.disabled = disabled;
    btn.textContent = label;
}

function saveUpdate(e) {
    if (e) e.preventDefault();
    var idx = parseInt(document.getElementById('req-index').value);
    var rowIdx = document.getElementById('req-rowIndex').value;
    var status = document.getElementById('req-status').value;
    var notes = document.getElementById('req-notes').value;
    // Use getElementById for reliability — querySelector can fail if CSS class differs
    var btn = document.getElementById('save-changes-btn');

    if (btn) setButtonState(btn, 'Saving…', true);

    if (!isNaN(idx) && maintenanceData[idx]) {
        maintenanceData[idx].Status = status;
        maintenanceData[idx]['Landlord Notes'] = notes;
    }

    if (!settings.scriptUrl) {
        // Demo mode — simulate success locally
        if (btn) setButtonState(btn, 'Saved', false);
        showToast('Saved locally (demo mode)', 'info');
        closeModal();
        renderMaintenanceTable();
        renderMaintenanceStats();
        return;
    }

    var body = 'formType=updateMaintenance&rowIndex=' + encodeURIComponent(rowIdx) +
               '&status=' + encodeURIComponent(status) +
               '&landlordNotes=' + encodeURIComponent(notes);

    var didError = false;
    fetch(settings.scriptUrl, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body
    }).catch(function(err) {
        didError = true;
        console.warn('Update fetch failed:', err);
    });

    // With no-cors the response is opaque — we cannot read the HTTP status.
    // Treat as probable success after a short window. This is the best we can do
    // without a CORS-enabled endpoint.
    setTimeout(function() {
        if (btn) setButtonState(btn, 'Save Changes', false);
        if (!didError) {
            showToast('Update saved successfully', 'success');
        } else {
            showToast('Saved locally — could not reach server', 'error');
        }
        closeModal();
        renderMaintenanceTable();
        renderMaintenanceStats();
    }, 800);
}

// ================================================================
// Settings
// ================================================================
function openSettings() {
    document.getElementById('set-url').value = settings.scriptUrl;
    document.getElementById('set-name').value = settings.propertyName;
    document.getElementById('settings-modal').classList.add('active');
}

function closeSettings() {
    document.getElementById('settings-modal').classList.remove('active');
}

function saveSettings(e) {
    e.preventDefault();
    settings.scriptUrl = document.getElementById('set-url').value.trim();
    settings.propertyName = document.getElementById('set-name').value.trim();
    localStorage.setItem('restEasySettings', JSON.stringify(settings));
    document.querySelectorAll('.property-name').forEach(function(el) { el.textContent = settings.propertyName; });
    closeSettings();
    loadData();
}

function loadSettings() {
    var s = localStorage.getItem('restEasySettings');
    if (s) {
        try { settings = JSON.parse(s); } catch(e) {}
    }
    if (settings.propertyName) {
        document.querySelectorAll('.property-name').forEach(function(el) { el.textContent = settings.propertyName; });
    }
}

function updateConnectionStatus(connected) {
    var el = document.getElementById('connection-status');
    if (!el) return;
    el.querySelector('.status-text').textContent = connected ? 'Connected' : 'Demo Mode';
    el.querySelector('.status-dot').style.background = connected ? '#059669' : '#D97706';
}

function updateTimestamp() {
    var el = document.getElementById('last-updated');
    if (el) el.textContent = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function refreshData() { loadData(); }

// ================================================================
// Export
// ================================================================
function exportCSV() {
    var fd = financialData;
    var csv = 'REST EASY — Financial Summary\n\n';
    csv += 'RENT COLLECTION\nExpected,' + (fd.rentExpected||0) + '\nCollected,' + (fd.rentCollected||0) + '\nOutstanding,' + ((fd.rentExpected||0)-(fd.rentCollected||0)) + '\n\n';
    csv += 'INCOME & EXPENSES\nIncome,' + (fd.monthIncome||0) + '\nExpenses,' + (fd.monthExpenses||0) + '\nNet,' + (fd.netCashflow||0) + '\n\n';
    csv += 'BY UNIT\nUnit,Tenant,Rent,Collected,Outstanding,Status\n';
    (fd.units||[]).forEach(function(u){ csv += (u.unit||'')+','+(u.tenant||'')+','+(u.rent||0)+','+(u.collected||0)+','+(u.outstanding||0)+','+(u.status||'')+'\n'; });
    csv += '\nMAINTENANCE\nTimestamp,Unit,Category,Urgency,Status,Description,Tenant,Email,Phone,Notes\n';
    maintenanceData.forEach(function(m){
        csv += '"'+(TS(m)||'').replace(/"/g,'""')+'","'+(UN(m)||'').replace(/"/g,'""')+'","'+(CAT(m)||'').replace(/"/g,'""')+'","'+(U(m)||'').replace(/"/g,'""')+'","'+(S(m)||'').replace(/"/g,'""')+'","'+(DES(m)||'').replace(/"/g,'""')+'","'+(TN(m)||'').replace(/"/g,'""')+'","'+(TE(m)||'').replace(/"/g,'""')+'","'+(TP(m)||'').replace(/"/g,'""')+'","'+(LN(m)||'').replace(/"/g,'""')+'"\n';
    });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download = 'rest-easy-export.csv';
    a.click();
}

// Close modals on Escape / backdrop click
document.addEventListener('keydown', function(e) { if (e.key==='Escape') { closeModal(); closeSettings(); } });
document.querySelectorAll('.modal').forEach(function(m) { m.addEventListener('click', function(e){ if(e.target===m) m.classList.remove('active'); }); });
