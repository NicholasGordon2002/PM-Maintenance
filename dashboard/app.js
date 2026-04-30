// Rest Easy Property Dashboard - App Logic

// ============================================
// State
// ============================================
let maintenanceData = [];
let financialData = [];
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
            
            // Update tab buttons
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Update content
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
        if (response.ok) {
            const data = await response.json();
            maintenanceData = data.maintenance || [];
            financialData = data.summary || [];   // ← WRONG
            unitsData = data.units || [];
            updateConnectionStatus(true);
        } else {
            throw new Error('Failed to fetch');
        }
    } catch (error) {
        console.warn('Could not load from Google Sheets, using demo data:', error);
        loadDemoData();
        updateConnectionStatus(false);
    }
}

function loadDemoData() {
    // Demo maintenance requests
    maintenanceData = [
        {
            id: 'ML-001',
            timestamp: '2026-04-29 08:30 AM',
            unit: 'Unit 3',
            tenantName: 'Maria Garcia',
            tenantEmail: 'mgarcia@email.com',
            tenantPhone: '(555) 123-4567',
            category: 'Plumbing',
            description: 'Kitchen sink is draining very slowly. Water backs up when running the dishwasher.',
            urgency: 'Medium',
            status: 'In Progress',
            landlordNotes: 'Scheduled plumber for Thursday'
        },
        {
            id: 'ML-002',
            timestamp: '2026-04-28 03:15 PM',
            unit: 'Unit 7',
            tenantName: 'James Wilson',
            tenantEmail: 'jwilson@email.com',
            tenantPhone: '(555) 987-6543',
            category: 'Electrical',
            description: 'Bedroom ceiling light flickers intermittently. Need replacement.',
            urgency: 'Low',
            status: 'New',
            landlordNotes: ''
        },
        {
            id: 'ML-003',
            timestamp: '2026-04-28 09:00 AM',
            unit: 'Unit 1',
            tenantName: 'Robert Chen',
            tenantEmail: 'rchen@email.com',
            tenantPhone: '(555) 456-7890',
            category: 'HVAC',
            description: 'AC unit not cooling properly. Making loud noise when running.',
            urgency: 'High',
            status: 'Pending Parts',
            landlordNotes: 'Ordered compressor part, ETA 3 days'
        },
        {
            id: 'ML-004',
            timestamp: '2026-04-27 11:45 AM',
            unit: 'Unit 5',
            tenantName: 'Sarah Johnson',
            tenantEmail: 'sjohnson@email.com',
            tenantPhone: '(555) 234-5678',
            category: 'Appliance',
            description: 'Refrigerator making buzzing noise and not maintaining temperature.',
            urgency: 'Emergency',
            status: 'Resolved',
            landlordNotes: 'Replaced compressor motor. Good for now.'
        },
        {
            id: 'ML-005',
            timestamp: '2026-04-26 02:30 PM',
            unit: 'Unit 2',
            tenantName: 'Linda Martinez',
            tenantEmail: 'lmartinez@email.com',
            tenantPhone: '(555) 345-6789',
            category: 'Pest',
            description: 'Seeing ants in kitchen area. Have tried store-bought traps with no success.',
            urgency: 'Low',
            status: 'Resolved',
            landlordNotes: 'Exterminator sprayed on 4/25. Follow-up scheduled.'
        },
        {
            id: 'ML-006',
            timestamp: '2026-04-25 10:00 AM',
            unit: 'Unit 8',
            tenantName: 'Michael Brown',
            tenantEmail: 'mbrown@email.com',
            tenantPhone: '(555) 567-8901',
            category: 'Plumbing',
            description: 'Toilet running constantly. Tried jiggling handle but doesn\'t help.',
            urgency: 'Medium',
            status: 'New',
            landlordNotes: ''
        },
        {
            id: 'ML-007',
            timestamp: '2026-04-24 04:20 PM',
            unit: 'Unit 4',
            tenantName: 'Emily Davis',
            tenantEmail: 'edavis@email.com',
            tenantPhone: '(555) 678-9012',
            category: 'Structural',
            description: 'Crack appearing in bedroom wall near window. Getting wider.',
            urgency: 'High',
            status: 'In Progress',
            landlordNotes: 'Called structural engineer for assessment'
        }
    ];

    // Demo financial data
    financialData = {
        rentExpected: 6400,
        rentCollected: 4800,
        monthIncome: 5200,
        monthExpenses: 1850,
        netCashflow: 3350,
        units: [
            { unit: 'Unit 1', tenant: 'Robert Chen', rent: 800, collected: 800, outstanding: 0, status: 'current' },
            { unit: 'Unit 2', tenant: 'Linda Martinez', rent: 800, collected: 800, outstanding: 0, status: 'current' },
            { unit: 'Unit 3', tenant: 'Maria Garcia', rent: 800, collected: 600, outstanding: 200, status: 'delinquent' },
            { unit: 'Unit 4', tenant: 'Emily Davis', rent: 800, collected: 800, outstanding: 0, status: 'current' },
            { unit: 'Unit 5', tenant: 'Sarah Johnson', rent: 800, collected: 0, outstanding: 800, status: 'delinquent' },
            { unit: 'Unit 6', tenant: '—', rent: 800, collected: 0, outstanding: 0, status: 'vacant' },
            { unit: 'Unit 7', tenant: 'James Wilson', rent: 800, collected: 800, outstanding: 0, status: 'current' },
            { unit: 'Unit 8', tenant: 'Michael Brown', rent: 800, collected: 0, outstanding: 800, status: 'delinquent' }
        ]
    };
}

function updateConnectionStatus(connected) {
    const statusEl = document.getElementById('connection-status');
    const dotEl = statusEl.querySelector('.status-dot');
    const textEl = statusEl.querySelector('.status-text');
    
    if (connected) {
        statusEl.classList.add('connected');
        dotEl.style.background = '#059669';
        textEl.textContent = 'Connected';
    } else {
        statusEl.classList.remove('connected');
        dotEl.style.background = '#D97706';
        textEl.textContent = 'Demo Mode';
    }
}

function updateTimestamp() {
    const now = new Date();
    document.getElementById('last-updated').textContent = 
        now.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
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
    const statusFilter = document.getElementById('status-filter').value;
    const urgencyFilter = document.getElementById('urgency-filter').value;
    
    let filtered = maintenanceData;
    if (statusFilter) {
        filtered = filtered.filter(r => r.status === statusFilter);
    }
    if (urgencyFilter) {
        filtered = filtered.filter(r => r.urgency === urgencyFilter);
    }
    
    tbody.innerHTML = filtered.map(request => `
        <tr>
            <td>${request.timestamp}</td>
            <td><strong>${request.unit}</strong></td>
            <td>${request.category}</td>
            <td><span class="urgency-badge ${request.urgency.toLowerCase()}">${request.urgency}</span></td>
            <td><span class="status-badge ${statusToClass(request.status)}">${request.status}</span></td>
            <td><div class="description-cell" title="${request.description}">${truncate(request.description, 50)}</div></td>
            <td>
                <div class="tenant-info">
                    <strong>${request.tenantName}</strong>
                    <span>${request.tenantEmail}</span>
                    ${request.tenantPhone ? `<span>${request.tenantPhone}</span>` : ''}
                </div>
            </td>
            <td>
                <button class="btn-action primary" onclick="openMaintenanceModal('${request.id}')">Update</button>
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

function statusToClass(status) {
    return status.toLowerCase().replace(' ', '-');
}

function truncate(str, len) {
    return str.length > len ? str.substring(0, len) + '...' : str;
}

function renderMaintenanceStats() {
    const emergency = maintenanceData.filter(r => r.urgency === 'Emergency' && r.status !== 'Resolved').length;
    const high = maintenanceData.filter(r => r.urgency === 'High' && r.status !== 'Resolved').length;
    const open = maintenanceData.filter(r => r.status !== 'Resolved' && r.status !== 'Rejected').length;
    
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const resolved = maintenanceData.filter(r => {
        if (r.status !== 'Resolved') return false;
        const d = new Date(r.timestamp);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;
    
    document.getElementById('emergency-count').textContent = emergency;
    document.getElementById('high-count').textContent = high;
    document.getElementById('open-count').textContent = open;
    document.getElementById('resolved-count').textContent = resolved;
}

function renderFinancialSummary() {
    const fd = financialData;
    
    document.getElementById('rent-expected').textContent = formatCurrency(fd.rentExpected);
    document.getElementById('rent-collected').textContent = formatCurrency(fd.rentCollected);
    document.getElementById('rent-outstanding').textContent = formatCurrency(fd.rentExpected - fd.rentCollected);
    
    const collectionRate = fd.rentExpected > 0 ? Math.round((fd.rentCollected / fd.rentExpected) * 100) : 0;
    document.getElementById('collection-rate').textContent = collectionRate + '%';
    
    document.getElementById('month-income').textContent = formatCurrency(fd.monthIncome);
    document.getElementById('month-expenses').textContent = formatCurrency(fd.monthExpenses);
    document.getElementById('net-cashflow').textContent = formatCurrency(fd.netCashflow);
    
    // Net cash flow color
    const netEl = document.getElementById('net-cashflow');
    netEl.className = 'metric-value ' + (fd.netCashflow >= 0 ? 'success' : 'danger');
}

function renderUnitsTable() {
    const tbody = document.getElementById('units-tbody');
    
    tbody.innerHTML = financialData.units.map(unit => `
        <tr>
            <td><strong>${unit.unit}</strong></td>
            <td>${unit.tenant === '—' ? '<span style="color: var(--gray-400)">Vacant</span>' : unit.tenant}</td>
            <td>${formatCurrency(unit.rent)}</td>
            <td>${formatCurrency(unit.collected)}</td>
            <td style="color: ${unit.outstanding > 0 ? 'var(--danger)' : 'var(--success)'}">${formatCurrency(unit.outstanding)}</td>
            <td><span class="unit-status ${unit.status}">${statusLabel(unit.status)}</span></td>
        </tr>
    `).join('');
    
    // Maintenance summary
    const openRequests = maintenanceData.filter(r => r.status !== 'Resolved' && r.status !== 'Rejected').length;
    document.getElementById('open-requests').textContent = openRequests;
    
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const resolvedMonth = maintenanceData.filter(r => {
        if (r.status !== 'Resolved') return false;
        return true; // In real app, check resolved date
    }).length;
    document.getElementById('resolved-month').textContent = resolvedMonth;
}

function statusLabel(status) {
    const labels = {
        'current': 'Current',
        'delinquent': 'Delinquent',
        'vacant': 'Vacant'
    };
    return labels[status] || status;
}

function formatCurrency(amount) {
    return '$' + Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
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
function openMaintenanceModal(id) {
    const request = maintenanceData.find(r => r.id === id);
    if (!request) return;
    
    document.getElementById('request-id').value = id;
    document.getElementById('request-status').value = request.status;
    document.getElementById('landlord-notes').value = request.landlordNotes || '';
    
    document.getElementById('maintenance-modal').classList.add('active');
}

function closeModal() {
    document.getElementById('maintenance-modal').classList.remove('active');
}

async function saveMaintenanceUpdate(event) {
    event.preventDefault();
    
    const id = document.getElementById('request-id').value;
    const status = document.getElementById('request-status').value;
    const notes = document.getElementById('landlord-notes').value;
    
    // Update local data
    const request = maintenanceData.find(r => r.id === id);
    if (request) {
        request.status = status;
        request.landlordNotes = notes;
    }
    
    // If Google Sheets integration is set up, update there
    if (settings.scriptUrl) {
        try {
            await fetch(settings.scriptUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'updateMaintenance',
                    id: id,
                    status: status,
                    landlordNotes: notes
                })
            });
        } catch (error) {
            console.warn('Failed to update Google Sheet:', error);
        }
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
    
    settings.scriptUrl = document.getElementById('script-url').value.trim();
    settings.propertyName = document.getElementById('property-name').value.trim();
    
    // Save to localStorage
    localStorage.setItem('restEasySettings', JSON.stringify(settings));
    
    // Update property name in header
    document.querySelector('.property-name').textContent = settings.propertyName;
    
    closeSettings();
    loadData(); // Reload data with new settings
}

function loadSettings() {
    const saved = localStorage.getItem('restEasySettings');
    if (saved) {
        try {
            settings = { ...settings, ...JSON.parse(saved) };
            document.querySelector('.property-name').textContent = settings.propertyName;
        } catch (e) {
            console.warn('Failed to load settings:', e);
        }
    }
}

// ============================================
// Actions
// ============================================
async function refreshData() {
    await loadData();
}

function exportCSV() {
    // Export financial summary as CSV
    let csv = 'REST EASY PROPERTY MANAGEMENT - Financial Summary\n\n';
    
    csv += 'RENT COLLECTION\n';
    csv += 'Expected This Month,' + financialData.rentExpected + '\n';
    csv += 'Collected,' + financialData.rentCollected + '\n';
    csv += 'Outstanding,' + (financialData.rentExpected - financialData.rentCollected) + '\n\n';
    
    csv += 'INCOME & EXPENSES\n';
    csv += 'Total Income,' + financialData.monthIncome + '\n';
    csv += 'Total Expenses,' + financialData.monthExpenses + '\n';
    csv += 'Net Cash Flow,' + financialData.netCashflow + '\n\n';
    
    csv += 'BY UNIT\n';
    csv += 'Unit,Tenant,Monthly Rent,Collected,Outstanding,Status\n';
    financialData.units.forEach(u => {
        csv += `${u.unit},${u.tenant},${u.rent},${u.collected},${u.outstanding},${statusLabel(u.status)}\n`;
    });
    
    csv += '\nMAINTENANCE REQUESTS\n';
    csv += 'Timestamp,Unit,Category,Urgency,Status,Description,Tenant,Email,Phone,Notes\n';
    maintenanceData.forEach(m => {
        csv += `"${m.timestamp}","${m.unit}","${m.category}","${m.urgency}","${m.status}","${m.description}","${m.tenantName}","${m.tenantEmail}","${m.tenantPhone}","${m.landlordNotes}"\n`;
    });
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rest-easy-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// Close modals on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
        closeSettings();
    }
});

// Close modals on backdrop click
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});
