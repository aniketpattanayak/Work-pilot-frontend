// Every route this harness checks, with which role(s) it is meaningful
// for. Admin gets the full route list (broadest access); other roles
// each get the handful of routes that are specific to / most exercised
// by that role, per Sidebar.jsx's own role gating - this keeps the
// matrix (routes x roles x widths) from exploding while still covering
// every route at least once and every role at least once, per the spec.
const ADMIN_ROUTES = [
  '', 'employees', 'manage-tasks', 'my-tasks', 'tracking', 'mapping',
  'checklist-setup', 'manage-checklist', 'checklist-monitor',
  'rewards-log', 'settings', 'reports', 'fms-dashboard', 'chat',
  'order-forms', 'new-order', 'flow-management', 'flow-tasks',
  'leave', 'attendance', 'payroll', 'raise-ticket', 'review-meeting',
];

const ROLE_ROUTES = {
  Admin: ADMIN_ROUTES,
  Assigner: ['', 'manage-tasks', 'my-tasks', 'create-task', 'chat'],
  Doer: ['', 'my-tasks', 'attendance', 'leave', 'chat'],
  Coordinator: ['', 'tracking', 'my-tasks', 'chat'],
  Viewer: ['global-view'],
};

const WIDTHS = [360, 390, 430, 768];
const DESKTOP_WIDTHS = [1280, 1920];

module.exports = { ROLE_ROUTES, WIDTHS, DESKTOP_WIDTHS };
