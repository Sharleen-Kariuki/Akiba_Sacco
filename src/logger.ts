import { Language } from './types.js';

// Declare DataTables / jQuery globals
declare const DataTable: any;

export type SessionStatus = 'ACTIVE' | 'SUCCESS' | 'ERROR' | 'TIMEOUT' | 'TERMINATED';

export interface SessionEventDetail {
  step: number;
  timestamp: string; // Exact time event occurred e.g. "14:55:12"
  page: string;
  action: string;
  value: string;
  status: SessionStatus;
}

export interface USSDSession {
  sessionId: string;
  phone: Language;
  startTime: string;
  lastActive: string;
  status: SessionStatus;
  transactedValue: number;
  events: SessionEventDetail[];
}

export interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  totalLogs: number;
  totalValueTransacted: number;
}

// In-memory session repository
const sessionStore = new Map<string, USSDSession>();
const sessionList: USSDSession[] = [];
const sessionRowMap = new Map<string, any>();
const openDrawerSessionIds = new Set<string>();

// Active session tracking per phone
interface PhoneSessionInfo {
  sessionId: string;
  isActive: boolean;
  startTime: Date;
}

const activeSessions: Record<Language, PhoneSessionInfo | null> = {
  en: null,
  sw: null,
};

// DataTables instance reference
let dtInstance: any = null;
let selectedPageFilter = 'ALL';

/**
 * Generates an authentic USSD session identifier (e.g. USSD-8492)
 */
export function generateSessionId(): string {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `USSD-${randomNum}`;
}

/**
 * Starts a new session for a phone device
 */
export function startNewSession(phone: Language): string {
  const sessionId = generateSessionId();
  activeSessions[phone] = {
    sessionId,
    isActive: true,
    startTime: new Date(),
  };
  return sessionId;
}

/**
 * Retrieves the current session ID for a phone, or creates one if none exists
 */
export function getOrCreateSessionId(phone: Language): string {
  const session = activeSessions[phone];
  if (session && session.isActive) {
    return session.sessionId;
  }
  return startNewSession(phone);
}

/**
 * Marks the active session as closed/terminated
 */
export function endSession(phone: Language): void {
  const session = activeSessions[phone];
  if (session) {
    session.isActive = false;
  }
}

/**
 * Formats row data array for DataTables master session row
 */
function generateRowData(session: USSDSession): any[] {
  const phoneLabel = session.phone === 'en' ? 'EN (Phone 1)' : 'SW (Phone 2)';
  const phoneBadge = `<span class="device-pill device-${session.phone}">${phoneLabel}</span>`;
  const badgeClass = `badge badge-${session.status.toLowerCase()}`;
  const isOpen = openDrawerSessionIds.has(session.sessionId);
  const iconClass = isOpen ? 'fa-chevron-down' : 'fa-chevron-right';
  const valueDisplay =
    session.transactedValue > 0
      ? `<span class="value-highlight">KES ${session.transactedValue.toLocaleString('en-KE', {
          minimumFractionDigits: 0,
        })}</span>`
      : '-';

  return [
    `<button type="button" class="btn-drawer-toggle" data-session-id="${session.sessionId}" title="Click to open/close event drawer"><i class="fas ${iconClass}"></i></button>`,
    `<code>${session.sessionId}</code>`,
    phoneBadge,
    `<span class="col-time">${session.startTime}</span>`,
    `<span class="col-time">${session.lastActive}</span>`,
    `<span class="badge-count">${session.events.length} step${session.events.length === 1 ? '' : 's'}</span>`,
    valueDisplay,
    `<span class="${badgeClass}">${session.status}</span>`,
  ];
}

/**
 * Renders the expandable drawer HTML containing all event details for a session
 */
export function formatSessionEventsDrawer(session: USSDSession): string {
  const eventsHtml = session.events
    .map((evt) => {
      const badgeClass = `badge badge-${evt.status.toLowerCase()}`;
      return `
        <tr>
          <td class="drawer-step">#${evt.step}</td>
          <td class="drawer-time"><code>${evt.timestamp}</code></td>
          <td class="drawer-page"><strong>${escapeHtml(evt.page)}</strong></td>
          <td class="drawer-action">${escapeHtml(evt.action)}</td>
          <td class="drawer-value"><span class="value-highlight">${escapeHtml(evt.value)}</span></td>
          <td class="drawer-status"><span class="${badgeClass}">${evt.status}</span></td>
        </tr>
      `;
    })
    .join('');

  return `
    <div class="session-drawer-wrapper">
      <div class="drawer-header">
        <div class="drawer-title">
          <i class="fas fa-layer-group"></i> SESSION AUDIT TRAIL: <code>${session.sessionId}</code>
        </div>
        <div class="drawer-meta">
          <span>Device: <strong>${session.phone === 'en' ? 'EN (Phone 1)' : 'SW (Phone 2)'}</strong></span>
          <span>Started: <strong>${session.startTime}</strong></span>
          <span>Last Active: <strong>${session.lastActive}</strong></span>
          <span>Total Steps: <strong>${session.events.length}</strong></span>
        </div>
      </div>
      <table class="drawer-events-table">
        <thead>
          <tr>
            <th style="width: 45px;">Step</th>
            <th style="width: 95px;">Event Time</th>
            <th style="width: 140px;">Page / Screen</th>
            <th>What They Did (Action)</th>
            <th style="width: 140px;">Value Inserted</th>
            <th style="width: 95px;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${eventsHtml}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Renders fallback native table rows if DataTables library is unavailable
 */
function renderNativeTable(): void {
  const tbody = document.getElementById('ussd-table-body');
  if (!tbody) return;

  if (sessionList.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-row">
        <td colspan="8">
          <div class="empty-state">
            <i class="fas fa-inbox"></i>
            <span>No sessions recorded yet. Dial *144# on either phone to begin.</span>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  sessionList.forEach((session) => {
    const rowData = generateRowData(session);
    const isOpen = openDrawerSessionIds.has(session.sessionId);
    html += `
      <tr class="${isOpen ? 'drawer-open' : ''}" data-session-id="${session.sessionId}">
        <td class="col-control">${rowData[0]}</td>
        <td>${rowData[1]}</td>
        <td>${rowData[2]}</td>
        <td>${rowData[3]}</td>
        <td>${rowData[4]}</td>
        <td>${rowData[5]}</td>
        <td>${rowData[6]}</td>
        <td>${rowData[7]}</td>
      </tr>
    `;
    if (isOpen) {
      html += `
        <tr class="session-drawer-row">
          <td colspan="8">${formatSessionEventsDrawer(session)}</td>
        </tr>
      `;
    }
  });

  tbody.innerHTML = html;
}

/**
 * Records a new event in the USSD Session Audit Log and syncs with the DataTables Session Drawer
 */
export function recordSessionLog(
  phone: Language,
  page: string,
  action: string,
  value: string,
  status: SessionStatus,
  customSessionId?: string
): SessionEventDetail {
  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0]; // Exact event time e.g. "14:47:05"

  let sessionId = customSessionId;
  if (!sessionId) {
    sessionId = getOrCreateSessionId(phone);
  }

  // Retrieve or create the USSDSession
  let session = sessionStore.get(sessionId);
  if (!session) {
    session = {
      sessionId,
      phone,
      startTime: timeStr,
      lastActive: timeStr,
      status: 'ACTIVE',
      transactedValue: 0,
      events: [],
    };
    sessionStore.set(sessionId, session);
    sessionList.unshift(session); // Place newest session at top
  }

  // Update session metadata
  session.lastActive = timeStr;
  if (status === 'SUCCESS' || status === 'TIMEOUT' || status === 'TERMINATED') {
    session.status = status;
    endSession(phone);
  }

  // Record amount if confirmed transaction
  if (status === 'SUCCESS') {
    const match = value.match(/KES\s*([0-9]+(?:\.[0-9]+)?)/i);
    if (match && match[1]) {
      session.transactedValue = parseFloat(match[1]);
    }
  }

  const eventDetail: SessionEventDetail = {
    step: session.events.length + 1,
    timestamp: timeStr,
    page,
    action,
    value: value || '-',
    status,
  };
  session.events.push(eventDetail);

  updateStatsRibbon();
  updatePageFilterDropdown();

  // Sync real-time with DataTables or native fallback
  if (dtInstance) {
    try {
      const existingRow = sessionRowMap.get(sessionId);
      if (existingRow) {
        existingRow.data(generateRowData(session)).draw(false);
        if (existingRow.child && existingRow.child.isShown()) {
          existingRow.child(formatSessionEventsDrawer(session));
        }
      } else {
        const newRow = dtInstance.row.add(generateRowData(session)).draw(false);
        sessionRowMap.set(sessionId, newRow);
      }
    } catch (err) {
      console.warn('DataTables row sync fallback:', err);
      renderNativeTable();
    }
  } else {
    renderNativeTable();
  }

  return eventDetail;
}

/**
 * Calculates real-time session metrics
 */
export function calculateStats(): SessionStats {
  let totalValueTransacted = 0;
  let totalLogs = 0;

  sessionList.forEach((session) => {
    totalValueTransacted += session.transactedValue;
    totalLogs += session.events.length;
  });

  const activeCount = Object.values(activeSessions).filter((s) => s && s.isActive).length;

  return {
    totalSessions: sessionList.length,
    activeSessions: activeCount,
    totalLogs,
    totalValueTransacted,
  };
}

/**
 * Updates the live stats ribbon cards
 */
export function updateStatsRibbon(): void {
  const stats = calculateStats();

  const sessionsEl = document.getElementById('stat-sessions');
  const activeEl = document.getElementById('stat-active');
  const logsEl = document.getElementById('stat-logs');
  const valueEl = document.getElementById('stat-value');

  if (sessionsEl) sessionsEl.textContent = stats.totalSessions.toString();
  if (activeEl) activeEl.textContent = stats.activeSessions.toString();
  if (logsEl) logsEl.textContent = stats.totalLogs.toString();
  if (valueEl) {
    valueEl.textContent = `KES ${stats.totalValueTransacted.toLocaleString('en-KE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }
}

/**
 * Dynamically populates the Page filter dropdown with all visited pages
 */
function updatePageFilterDropdown(): void {
  const pageSelect = document.getElementById('filter-page') as HTMLSelectElement | null;
  if (!pageSelect) return;

  const currentSelection = pageSelect.value;
  const pageSet = new Set<string>();

  sessionList.forEach((s) => {
    s.events.forEach((e) => pageSet.add(e.page));
  });

  const uniquePages = Array.from(pageSet).sort();

  pageSelect.innerHTML = '<option value="ALL">All Pages</option>';

  uniquePages.forEach((page) => {
    const opt = document.createElement('option');
    opt.value = page;
    opt.textContent = page;
    if (page === currentSelection) opt.selected = true;
    pageSelect.appendChild(opt);
  });
}

/**
 * Clears all logged sessions and resets table
 */
export function clearLogs(): void {
  if (sessionList.length === 0) return;
  if (!confirm('Are you sure you want to clear all USSD session logs?')) return;

  sessionStore.clear();
  sessionList.length = 0;
  sessionRowMap.clear();
  openDrawerSessionIds.clear();
  activeSessions.en = null;
  activeSessions.sw = null;

  if (dtInstance) {
    try {
      dtInstance.clear().draw();
    } catch {
      renderNativeTable();
    }
  } else {
    renderNativeTable();
  }

  updateStatsRibbon();
  updatePageFilterDropdown();
}

/**
 * Seeds an initial demonstration session so the table is immediately populated upon first load
 */
function seedInitialDemoSession(): void {
  if (sessionList.length > 0) return;

  const demoSessionId = 'USSD-1042';
  const demoSession: USSDSession = {
    sessionId: demoSessionId,
    phone: 'en',
    startTime: '10:00:15',
    lastActive: '10:00:42',
    status: 'SUCCESS',
    transactedValue: 15250,
    events: [
      {
        step: 1,
        timestamp: '10:00:15',
        page: 'Dialer',
        action: 'Session Initiated (*144#)',
        value: '*144#',
        status: 'ACTIVE',
      },
      {
        step: 2,
        timestamp: '10:00:24',
        page: 'Main Menu',
        action: 'Selected Option 1: Balance Enquiry',
        value: '1',
        status: 'ACTIVE',
      },
      {
        step: 3,
        timestamp: '10:00:42',
        page: 'Balance Screen',
        action: 'Account Balance Viewed (KES 15,250.00)',
        value: 'KES 15,250.00',
        status: 'SUCCESS',
      },
    ],
  };

  sessionStore.set(demoSessionId, demoSession);
  sessionList.push(demoSession);

  if (dtInstance) {
    try {
      const row = dtInstance.row.add(generateRowData(demoSession));
      sessionRowMap.set(demoSessionId, row);
      dtInstance.draw(false);
    } catch {
      renderNativeTable();
    }
  } else {
    renderNativeTable();
  }

  updateStatsRibbon();
  updatePageFilterDropdown();
}

/**
 * Initializes DataTables CDN instance with Master-Detail Drawer support
 */
export function initDataTable(): void {
  const globalAny = window as any;

  // 1. Initialize DataTables library if available (via jQuery or native constructor)
  try {
    if (globalAny.$ && globalAny.$.fn && globalAny.$.fn.DataTable) {
      dtInstance = globalAny.$('#ussd-table').DataTable({
        pageLength: 10,
        order: [[1, 'desc']],
        columnDefs: [{ orderable: false, targets: 0 }],
        language: {
          search: "Search:",
          lengthMenu: "Show _MENU_ sessions",
          info: "Showing _START_ to _END_ of _TOTAL_ sessions",
          infoEmpty: "Showing 0 to 0 of 0 sessions",
          infoFiltered: "(filtered from _MAX_ total)",
          zeroRecords: "No matching USSD sessions found",
          emptyTable: "No sessions recorded yet.",
        },
      });
    } else if (typeof DataTable !== 'undefined') {
      dtInstance = new DataTable('#ussd-table', {
        pageLength: 10,
        order: [[1, 'desc']],
        columnDefs: [{ orderable: false, targets: 0 }],
        language: {
          search: "Search:",
          lengthMenu: "Show _MENU_ sessions",
          info: "Showing _START_ to _END_ of _TOTAL_ sessions",
          infoEmpty: "Showing 0 to 0 of 0 sessions",
          infoFiltered: "(filtered from _MAX_ total)",
          zeroRecords: "No matching USSD sessions found",
          emptyTable: "No sessions recorded yet.",
        },
      });
    }
  } catch (err) {
    console.warn('DataTables initialization note:', err);
    dtInstance = null;
  }

  // 2. Pre-seed demo session so the table is immediately populated upon page load
  seedInitialDemoSession();

  // 3. Drawer Toggle Click Listener (Event Delegation on #ussd-table)
  const tableEl = document.getElementById('ussd-table');
  tableEl?.addEventListener('click', (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const toggleBtn = target.closest('.btn-drawer-toggle') || target.closest('.col-control');
    if (!toggleBtn) return;

    const tr = toggleBtn.closest('tr') as HTMLElement | null;
    if (!tr) return;

    // Retrieve session ID
    let sessionId = toggleBtn.getAttribute('data-session-id') || tr.getAttribute('data-session-id');
    if (!sessionId && dtInstance) {
      const row = dtInstance.row(tr);
      const rowData = row?.data();
      if (rowData && rowData[1]) {
        const match = rowData[1].match(/USSD-[0-9]+/);
        sessionId = match ? match[0] : null;
      }
    }
    if (!sessionId) return;

    const session = sessionStore.get(sessionId);
    if (!session) return;

    // Toggle logic for DataTables
    if (dtInstance) {
      try {
        const row = dtInstance.row(tr);
        if (row && row.length > 0) {
          if (row.child.isShown()) {
            row.child.hide();
            openDrawerSessionIds.delete(sessionId);
            tr.classList.remove('drawer-open');
            const icon = tr.querySelector('.btn-drawer-toggle i');
            if (icon) icon.className = 'fas fa-chevron-right';
          } else {
            row.child(formatSessionEventsDrawer(session), 'session-drawer-row').show();
            openDrawerSessionIds.add(sessionId);
            tr.classList.add('drawer-open');
            const icon = tr.querySelector('.btn-drawer-toggle i');
            if (icon) icon.className = 'fas fa-chevron-down';
          }
          return;
        }
      } catch (err) {
        console.warn('DataTables drawer toggle fallback:', err);
      }
    }

    // Toggle logic for Native Table fallback
    if (openDrawerSessionIds.has(sessionId)) {
      openDrawerSessionIds.delete(sessionId);
    } else {
      openDrawerSessionIds.add(sessionId);
    }
    renderNativeTable();
  });

  // 4. Device Filter
  const deviceSelect = document.getElementById('filter-device') as HTMLSelectElement | null;
  deviceSelect?.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value;
    if (dtInstance) {
      const term = val === 'ALL' ? '' : val === 'en' ? 'Phone 1' : 'Phone 2';
      dtInstance.column(2).search(term).draw();
    }
  });

  // 5. Status Filter
  const statusSelect = document.getElementById('filter-status') as HTMLSelectElement | null;
  statusSelect?.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value;
    if (dtInstance) {
      const term = val === 'ALL' ? '' : val;
      dtInstance.column(7).search(term ? `^${term}$` : '', true, false).draw();
    }
  });

  // 6. Page Filter
  const pageSelect = document.getElementById('filter-page') as HTMLSelectElement | null;
  pageSelect?.addEventListener('change', (e) => {
    selectedPageFilter = (e.target as HTMLSelectElement).value;
    if (dtInstance) {
      dtInstance.draw();
    }
  });

  // 7. Reset Filters Button
  const resetBtn = document.getElementById('btn-reset-filters');
  resetBtn?.addEventListener('click', () => {
    selectedPageFilter = 'ALL';
    if (deviceSelect) deviceSelect.value = 'ALL';
    if (statusSelect) statusSelect.value = 'ALL';
    if (pageSelect) pageSelect.value = 'ALL';

    if (dtInstance) {
      dtInstance.search('').columns().search('').draw();
    }
  });

  // 8. Clear logs button
  const clearBtn = document.getElementById('btn-clear-logs');
  clearBtn?.addEventListener('click', clearLogs);

  // Initial render of stats
  updateStatsRibbon();
}

/**
 * Simple HTML escaping utility to prevent XSS
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
