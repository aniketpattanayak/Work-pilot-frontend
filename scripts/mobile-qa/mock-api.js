// Generic mock for every /api/** call the app makes, keyed on URL
// keywords rather than an exhaustive per-endpoint fixture set (there are
// 80+ distinct endpoints across this app - modelling every one exactly
// would be its own multi-day project). The goal here is layout QA, not
// functional/business-logic testing: every response just needs to be a
// plausible shape so a page renders its real UI (tables, cards, filters)
// instead of an infinite spinner or a thrown error, so the responsive
// CSS/markup can actually be checked.
//
// Pages that need something more specific than these generic lists can
// still render correctly, since most list endpoints are tolerant of
// extra/missing fields (the UI already defends with `|| []` /
// `Array.isArray(...) ? ... : []` almost everywhere - verified in the
// pages this harness exercises).

function person(i, overrides = {}) {
  return {
    _id: `emp${i}`,
    id: `emp${i}`,
    name: `Employee Number ${i} With A Fairly Long Display Name`,
    email: `employee${i}@example.com`,
    department: ['Production', 'Quality', 'Logistics'][i % 3],
    location: ['Mumbai Plant', 'Pune Warehouse'][i % 2],
    whatsappNumber: '9876543210',
    roles: ['Doer'],
    role: 'Doer',
    totalPoints: 120 * i,
    earnedBadges: [],
    leaveStatus: null,
    hasSalary: true,
    basic: 25000,
    gross: 32000,
    effectiveFrom: '2026-01-01',
    managedDoers: [],
    managedAssigners: [],
    ...overrides,
  };
}

const EMPLOYEES = Array.from({ length: 8 }, (_, i) => person(i + 1));

function task(i, overrides = {}) {
  return {
    _id: `task${i}`,
    id: `task${i}`,
    title: `A reasonably long operational task title for row ${i} that could overflow a narrow card`,
    taskType: ['Delegation', 'Checklist', 'FMS'][i % 3],
    status: ['Pending', 'Accepted', 'Completed', 'Verified'][i % 4],
    assignedTo: EMPLOYEES[i % EMPLOYEES.length].name,
    assignedBy: EMPLOYEES[(i + 1) % EMPLOYEES.length].name,
    dueDate: '2026-10-20',
    createdAt: '2026-10-10T10:00:00.000Z',
    department: EMPLOYEES[i % EMPLOYEES.length].department,
    location: EMPLOYEES[i % EMPLOYEES.length].location,
    ...overrides,
  };
}

const TASKS = Array.from({ length: 10 }, (_, i) => task(i + 1));

const GENERIC_SETTINGS = {
  companyName: 'QA Test Co',
  logo: '',
  superAdmin: { features: { fms: true, reviewMeeting: true } },
  hrModules: { attendance: true, leave: true, payroll: true },
};

function matchFixture(url, method) {
  const u = url.toLowerCase();

  if (u.includes('/tasks/employees/')) return EMPLOYEES;
  if (u.includes('/tasks/settings/')) return GENERIC_SETTINGS;
  if (u.includes('/tasks/verify/')) return { subscription: { status: 'active' }, companyName: 'QA Test Co' };
  if (u.includes('/tasks/user-dashboard/')) {
    return {
      employee: { totalPoints: 480, earnedBadges: [] },
      stats: {
        checklist: { total: 10, notDone: 2 },
        delegation: { total: 8, notDone: 1 },
      },
    };
  }
  if (u.includes('/tasks') && method === 'GET') return TASKS;
  if (u.includes('activity') || u.includes('audit-log')) return { rows: TASKS.map((t, i) => ({ at: t.createdAt, employee: t.assignedTo, module: 'Login', action: 'Signed in', details: '', reference: '' })), total: TASKS.length };
  if (u.includes('leave')) return { leaveTypes: [{ _id: 'lt1', name: 'Casual', halfDayAllowed: true }], requests: [], balance: [] };
  if (u.includes('attendance')) return { records: [], summary: {} };
  if (u.includes('payroll')) return { runs: [], salaries: EMPLOYEES };
  if (u.includes('flow') || u.includes('fms')) return { flows: [], missions: [], pipelines: [] };
  if (u.includes('ticket')) return { tickets: [] };
  if (u.includes('order')) return { orders: [], forms: [] };
  if (u.includes('report')) return { report: [], rows: [] };
  // useChat.js reads the bare array off res.data for all of these - a
  // wrapped { conversations: [] } object fails `.find`/`.map` on it.
  if (u.includes('/chat/conversations') || u.includes('/chat/employees') || (u.includes('/chat/') && u.includes('/messages'))) return [];
  if (u.includes('chat') || u.includes('conversation')) return { conversations: [], messages: [] };
  if (u.includes('badge') || u.includes('reward')) return { log: [] };

  // Fallback: an empty-but-well-shaped object so `.something || []` and
  // `Array.isArray(x) ? x : []` guards both resolve cleanly either way.
  return { data: [], items: [], rows: [], employees: EMPLOYEES, tasks: TASKS };
}

async function installApiMock(page) {
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const body = matchFixture(req.url(), req.method());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
}

module.exports = { installApiMock, EMPLOYEES, TASKS };
