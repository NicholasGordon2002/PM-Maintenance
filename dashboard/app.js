// Rest Easy Property Dashboard - App Logic

// ============================================
// State
// ============================================
let maintenanceData = [];
let financialData = {};     // { rentExpected, rentCollected, monthIncome, monthExpenses, netCashflow, units: [...] }
let unitsData = [];
let settings = {
    scriptUrl: '',
    propertyName: 'Maple Ridge Apartments'
};

// ============================================
// Initialization
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    loadSettings();
    loadData();
    updateTimestamp();

    // Auto-refresh every 60 seconds
    setInterval(loadData, 60000);
});

// ============================================
// Tab Navigation
// ============================================
function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;

            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${tabId}-view`).classList.add('active');
        });
    });
}

// ============================================
// Data Loading
// ============================================
async function loadData() {
    if (settings.scriptUrl) {
        await loadFromGoogleSheets();
    } else {
        loadDemoData();
    }
    renderAll();
    updateTimestamp();
}

async function loadFromGoogleSheets() {
    try {
        const response = await fetch(settings.scriptUrl);
        if (!response.ok) throw new Error('Non-OK response');
        const data = await response.json();

        maintenanceData = data.maintenance || [];
        financialData  = data.summary  || {};
        unitsData     = data.units     || [];

        updateConnectionStatus(true);
    } catch (error) {
        console.warn('Could not load from Google Sheets, using demo data:', error);
        loadDemoData();
        updateConnectionStatus(false);
    }
}

function loadDemoData() {
    maintenanceData = [
        { id: 'ML-001', timestamp: '2026-04-29 08:30 AM', unit: 'Unit 3', tenantName: 'Maria Garcia', tenantEmail: 'mgarcia@email.com', tenantPhone: '(555) 123-4567', category: 'Plumbing', description: 'Kitchen sink draining slowly. Water backs up when running the dishwasher.', urgency: 'Medium', status: 'In Progress', landlordNotes: 'Scheduled plumber for Thursday' },
        { id: 'ML-002', timestamp: '2026-04-28 03:15 PM', unit: 'Unit 7', tenantName: 'James Wilson', tenantEmail: 'jwilson@email.com', tenantPhone: '(555) 987-6543', category: 'Electrical', description: 'Bedroom ceiling light flickers intermittently.', urgency: 'Low', status: 'New', landlordNotes: '' },
        { id: 'ML-003', timestamp: '2026-04-28 09:00 AM', unit: 'Unit 1', tenantName: 'Robert Chen', tenantEmail: 'rchen@email.com', tenantPhone: '(555) 456-7890', category: 'HVAC', description: 'AC unit not cooling properly. Making loud noise when running.', urgency: 'High', status: 'Pending Parts', landlordNotes: 'Ordered compressor part, ETA 3 days' },
        { id: 'ML-004', timestamp: '2026-04-27 11:45 AM', unit: 'Unit 5', tenantName: 'Sarah Johnson', tenantEmail: 'sjohnson@email.com', tenantPhone: '(555) 234-5678', category: 'Appliance', description: 'Refrigerator making buzzing noise and not maintaining temperature.', urgency: 'Emergency', status: 'Resolved', landlordNotes: 'Replaced compressor motor.' },
        { id: 'ML-005', timestamp: '2026-04-26 02:30 PM', unit: 'Unit 2', tenantName: 'Linda Martinez', tenantEmail: 'lmartinez@email.com', tenantPhone: '(555) 345-6789', category: 'Pest', description: 'Seeing ants in kitchen area. Store-bought traps not working.', urgency: 'Low', status: 'Resolved', landlordNotes: 'Exterminator sprayed 4/25.' },
        { id: 'ML-006', timestamp: '2026-04-25 10:00 AM', unit: 'Unit 8', tenantName: 'Michael Brown', tenantEmail: 'mbrown@email.com', tenantPhone: '(555) 567-8901', category: 'Plumbing', description: 'Toilet running constantly.', urgency: 'Medium', status: 'New', landlordNotes: '' },
        { id: 'ML-007', timestamp: '2026-04-24 04:20 PM', unit: 'Unit 4', tenantName: 'Emily Davis', tenantEmail: 'edavis@email.com', tenantPhone: '(555) 678-9012', category: 'Structural', description: 'Crack appearing in bedroom wall near window. Getting wider.', urgency: 'High', status: 'In Progress', landlordNotes: 'Called structural engineer.' }
    ];

    financialData = {
        rentExpected: 6400,
        rentCollected: 4800,
        monthIncome: 5200,
        monthExpenses: 1850,
        netCashflow: 3350,
        units: [
            { unit: 'Unit 1', tenant: 'Robert Chen',   rent: 800, collected: 800, outstanding: 0,   status: 'current' },
            { unit: 'Unit 2', tenant: 'Linda Martinez', rent: 800, collected: 800, outstanding: 0,   status: 'current' },
            { unit: 'Unit 3', tenant: 'Maria Garcia',  rent: 800, collected: 600, outstanding: 200,  status: 'delinquent' },
            { unit: 'Unit 4', tenant: 'Emily Davis',   rent: 800, collected: 800, outstanding: 0,   status: 'current' },
            { unit: 'Unit 5', tenant: 'Sarah Johnson', rent: 800, collected: 0,   outstanding: 800,  status: 'delinquent' },
            { unit: 'Unit 6', tenant: '—',             rent: 800, collected: 0,   outstanding: 0,    status: 'vacant' },
            { unit: 'Unit 7', tenant: 'James Wilson',  rent: 800, collected: 800, outstanding: 0,   status: 'current' },
            { unit: 'Unit 8', tenant: 'Michael Brown', rent: 800, collected: 0,   outstanding: 800,  status: 'delinquent' }
        ]
    };
}

// ============================================
// Helpers — get status/urgency/timestamp from both demo (lowercase) and sheet (Capitalized) formats
// ============================================
function getStatus(r) {
    return r.Status || r.status || '';
}

function getUrgency(r) {
    return r.Urgency || r.urgency || '';
}

function getTimestamp(r) {
    return r.Timestamp || r.timestamp || '';
}

function getUnit(r) {
    return r['Unit Number'] || r.unit || '';
}

function getCategory(r) {
    return r.Category || r.category || '';
}

function getDescription(r) {
    return r.Description || r.description || '';
}

function getTenantName(r) {
    return r['Tenant Name'] || r.tenantName || '';
}

function getTenantEmail(r) {
    return r['Tenant Email'] || r.tenantEmail || '';
}

function getTenantPhone(r) {
    return r['Tenant Phone'] || r.tenantPhone || '';
}

function getLandlordNotes(r) {
    return r['Landlord Notes'] || r.landlordNotes || '';
}

function statusToClass(status) {
    if (!status) return '';
    return status.toLowerCase().replace(/\s+/g, '-');
}

function truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '...' : str;
}

// ============================================
// Rendering
// ============================================
function renderAll() {
    renderMaintenanceTable();
    renderMaintenanceStats();
    renderFinancialSummary();
    renderUnitsTable();
}

function renderMaintenanceTable() {
    const tbody = document.getElementById('maintenance-tbody');
    if (!tbody) return;

    const statusFilter = document.getElementById('status-filter').value;
    const urgencyFilter = document.getElementById('urgency-filter').value;

    let filtered = maintenanceData;

    if (statusFilter) {
        filtered = filtered.filter(r => getStatus(r) === statusFilter);
    }
    if (urgencyFilter) {
        filtered = filtered.filter(r => getUrgency(r) === urgencyFilter);
    }

    tbody.innerHTML = filtered.map((request) => `
        <tr>
            <td>${getTimestamp(request)}</td>
            <td><strong>${getUnit(request)}</strong></td>
            <td>${getCategory(request)}</td>
            <td><span class="urgency-badge ${statusToClass(getUrgency(request))}">${getUrgency(request)}</span></td>
            <td><span class="status-badge ${statusToClass(getStatus(request))}">${getStatus(request)}</span></td>
            <td><div class="description-cell" title="${getDescription(request)}">${truncate(getDescription(request), 50)}</div></td>
            <td>
                <div class="tenant-info">
                    <strong>${getTenantName(request)}</strong>
                    <span>${getTenantEmail(request)}</span>
                    ${getTenantPhone(request) ? `<span>${getTenantPhone(request)}</span>` : ''}
                </div>
            </td>
            <td>
                <button class="btn-action primary" onclick="openMaintenanceModal(${maintenanceData.indexOf(request)})">Update</button>
            </td>
        </tr>
    `).join('');

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: var(--gray-400);">
                    No maintenance requests found
                </td>
            </tr>
        `;
    }
}

function renderMaintenanceStats() {
    const emergency = maintenanceData.filter(r => getUrgency(r) === 'Emergency' && getStatus(r) !== 'Resolved').length;
    const high = maintenanceData.filter(r => getUrgency(r) === 'High' && getStatus(r) !== 'Resolved').length;
    const open = maintenanceData.filter(r => getStatus(r) !== 'Resolved' && getStatus(r) !== 'Rejected').length;

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const resolved = maintenanceData.filter(r => {
        if (getStatus(r) !== 'Resolved') return false;
        const d = new Date(getTimestamp(r));
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;

    document.getElementById('emergency-count').textContent = emergency;
    document.getElementById('high-count').textContent = high;
    document.getElementById('open-count').textContent = open;
    document.getElementById('resolved-count').textContent = resolved;
}

function renderFinancialSummary() {
    const fd = financialData;
    if (!fd || typeof fd !== 'object') return;

    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };

    el('rent-expected',     formatCurrency(fd.rentExpected || 0));
    el('rent-collected',   formatCurrency(fd.rentCollected || 0));
    el('rent-outstanding',  formatCurrency((fd.rentExpected || 0) - (fd.rentCollected || 0)));

    const rate = (fd.rentExpected > 0) ? Math.round(((fd.rentCollected || 0) / fd.rentExpected) * 100) : 0;
    el('collection-rate', rate + '%');

    el('month-income',    formatCurrency(fd.monthIncome || 0));
    el('month-expenses',  formatCurrency(fd.monthExpenses || 0));
    el('net-cashflow',    formatCurrency(fd.netCashflow || 0));

    const netEl = document.getElementById('net-cashflow');
    if (netEl) netEl.className = 'metric-value ' + ((fd.netCashflow || 0) >= 0 ? 'success' : 'danger');
}

function renderUnitsTable() {
    const tbody = document.getElementById('units-tbody');
    if (!tbody) return;

    const units = financialData && financialData.units;
    if (!units || !Array.isArray(units)) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--gray-400);">No unit data</td></tr>';
        return;
    }

    tbody.innerHTML = units.map(unit => `
        <tr>
            <td><strong>${unit.unit || ''}</strong></td>
            <td>${unit.tenant === '—' ? '<span style="color:var(--gray-400)">Vacant</span>' : (unit.tenant || '—')}</td>
            <td>${formatCurrency(unit.rent || 0)}</td>
            <td>${formatCurrency(unit.collected || 0)}</td>
            <td style="color: ${(unit.outstanding || 0) > 0 ? 'var(--danger)' : 'var(--success)'}">${formatCurrency(unit.outstanding || 0)}</td>
            <td><span class="unit-status ${unit.status || ''}">${statusLabel(unit.status)}</span></td>
        </tr>
    `).join('');

    // Maintenance summary widgets
    const openRequests = maintenanceData.filter(r => getStatus(r) !== 'Resolved' && getStatus(r) !== 'Rejected').length;
    document.getElementById('open-requests').textContent = openRequests;

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const resolvedMonth = maintenanceData.filter(r => {
        if (getStatus(r) !== 'Resolved') return false;
        return true;
    }).length;
    document.getElementById('resolved-month').textContent = resolvedMonth;
}

function statusLabel(status) {
    const labels = { 'current': 'Current', 'delinquent': 'Delinquent', 'vacant': 'Vacant' };
    return labels[status] || status || '';
}

function formatCurrency(amount) {
    return '$' + Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ============================================
// Filtering
// ============================================
function filterMaintenance() {
    renderMaintenanceTable();
}

// ============================================
// Modal Handling
// ============================================
function openMaintenanceModal(index) {
    const request = maintenanceData[index];
    if (!request) return;

    document.getElementById('request-index').value = index;
    document.getElementById('request-rowIndex').value = request._rowIndex || '';
    document.getElementById('request-status').value = getStatus(request) || 'New';
    document.getElementById('landlord-notes').value = getLandlordNotes(request);

    document.getElementById('maintenance-modal').classList.add('active');
}

function closeModal() {
    document.getElementById('maintenance-modal').classList.remove('active');
}

async function saveMaintenanceUpdate(event) {
    event.preventDefault();

    const rowIndex = document.getElementById('request-rowIndex').value;
    const status   = document.getElementById('request-status').value;
    const notes    = document.getElementById('landlord-notes').value;
    const index    = parseInt(document.getElementById('request-index').value);

    // Update local state
    if (!isNaN(index) && maintenanceData[index]) {
        maintenanceData[index].Status = status;
        maintenanceData[index]['Landlord Notes'] = notes;
    }

    // Persist to Google Sheet
    if (settings.scriptUrl && rowIndex) {
        const body = 'formType=updateMaintenance&rowIndex=' + encodeURIComponent(rowIndex) +
            '&status=' + encodeURIComponent(status) +
            '&landlordNotes=' + encodeURIComponent(notes);

        fetch(settings.scriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body
        }).catch(err => console.warn('Sheet update failed:', err));
    }

    closeModal();
    renderMaintenanceTable();
    renderMaintenanceStats();
}

// ============================================
// Settings
// ============================================
function openSettings() {
    document.getElementById('script-url').value = settings.scriptUrl;
    document.getElementById('property-name').value = settings.propertyName;
    document.getElementById('settings-modal').classList.add('active');
}

function closeSettings() {
    document.getElementById('settings-modal').classList.remove('active');
}

function saveSettings(event) {
    event.preventDefault();

    settings.scriptUrl    = document.getElementById('script-url').value.trim();
    settings.propertyName = document.getElementById('property-name').value.trim();

    localStorage.setItem('restEasySettings', JSON.stringify(settings));
    document.querySelector('.property-name').textContent = settings.propertyName;

    closeSettings();
    loadData();
}

function loadSettings() {
    const saved = localStorage.getItem('restEasySettings');
    if (saved) {
        try {
            settings = { ...settings, ...JSON.parse(saved) };
            document.querySelector('.property-name').textContent = settings.propertyName;
        } catch (e) { /* ignore */ }
    }
}

function updateConnectionStatus(connected) {
    const statusEl = document.getElementById('connection-status');
    if (!statusEl) return;
    const dotEl = statusEl.querySelector('.status-dot');
    const textEl = statusEl.querySelector('.status-text');
    if (connected) {
        statusEl.classList.add('connected');
        if (dotEl) dotEl.style.background = '#059669';
        if (textEl) textEl.textContent = 'Connected';
    } else {
        statusEl.classList.remove('connected');
        if (dotEl) dotEl.style.background = '#D97706';
        if (textEl) textEl.textContent = 'Demo Mode';
    }
}

function updateTimestamp() {
    const el = document.getElementById('last-updated');
    if (el) el.textContent = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// ============================================
// Actions
// ============================================
async function refreshData() {
    await loadData();
}

function exportCSV() {
    const fd = financialData;
    let csv = 'REST EASY PROPERTY MANAGEMENT - Financial Summary\n\n';

    csv += 'RENT COLLECTION\n';
    csv += 'Expected This Month,' + (fd.rentExpected || 0) + '\n';
    csv += 'Collected,' + (fd.rentCollected || 0) + '\n';
    csv += 'Outstanding,' + ((fd.rentExpected || 0) - (fd.rentCollected || 0)) + '\n\n';

    csv += 'INCOME & EXPENSES\n';
    csv += 'Total Income,' + (fd.monthIncome || 0) + '\n';
    csv += 'Total Expenses,' + (fd.monthExpenses || 0) + '\n';
    csv += 'Net Cash Flow,' + (fd.netCashflow || 0) + '\n\n';

    csv += 'BY UNIT\n';
    csv += 'Unit,Tenant,Monthly Rent,Collected,Outstanding,Status\n';
    (fd.units || []).forEach(u => {
        csv += `${u.unit || ''},${u.tenant || ''},${u.rent || 0},${u.collected || 0},${u.outstanding || 0},${statusLabel(u.status)}\n`;
    });

    csv += '\nMAINTENANCE REQUESTS\n';
    csv += 'Timestamp,Unit,Category,Urgency,Status,Description,Tenant,Email,Phone,Notes\n';
    maintenanceData.forEach(m => {
        csv += `"${getTimestamp(m)}","${getUnit(m)}","${getCategory(m)}","${getUrgency(m)}","${getStatus(m)}","${getDescription(m)}","${getTenantName(m)}","${getTenantEmail(m)}","${getTenantPhone(m)}","${getLandlordNotes(m)}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rest-easy-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ============================================
// Keyboard & backdrop close
// ============================================
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
        closeSettings();
    }
});

document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });
});
