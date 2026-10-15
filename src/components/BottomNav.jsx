import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, CheckSquare, Users, MessageSquare, Eye, Clock, Menu } from 'lucide-react';

/**
 * BottomNav
 * ---------
 * Native-app bottom tab bar for phones/tablets (hidden at lg:+, where the
 * sidebar already covers navigation - see .bottom-nav in index.css).
 * Shows the 4-5 most used destinations for the signed-in user's role(s),
 * plus a "More" item that opens the existing drawer/Sidebar for
 * everything else - it does not duplicate the drawer, it fronts it.
 *
 * Role -> destination priority (product decision made for this pass,
 * since the spec left the exact set to engineering judgement):
 *   Admin/Assigner : Dashboard, Manage Tasks, My Tasks, Employees
 *   Doer           : Dashboard, My Tasks, Attendance, Chat
 *   Coordinator    : Dashboard, Tracking, My Tasks, Chat
 * A role with no tasks module (Viewer-only) gets no bottom nav - it has
 * exactly one screen (Global View) and the sticky header is enough.
 */
const ALL_ITEMS = {
  dashboard:  { name: 'Home',      route: '',               icon: LayoutDashboard },
  manageTasks:{ name: 'Manage',    route: 'manage-tasks',    icon: ClipboardList },
  myTasks:    { name: 'My Tasks',  route: 'my-tasks',        icon: CheckSquare },
  employees:  { name: 'Employees', route: 'employees',       icon: Users },
  chat:       { name: 'Chat',      route: 'chat',            icon: MessageSquare },
  tracking:   { name: 'Tracking',  route: 'tracking',        icon: Eye },
  attendance: { name: 'Attendance',route: 'attendance',      icon: Clock },
};

function getItemsForRoles(roles, hideChat = false) {
  const r = roles.map((x) => String(x).toLowerCase());
  const keys = [];
  if (r.includes('admin')) keys.push('dashboard', 'manageTasks', 'myTasks', 'employees');
  else if (r.includes('assigner')) keys.push('dashboard', 'manageTasks', 'myTasks', 'chat');
  else if (r.includes('coordinator')) keys.push('dashboard', 'tracking', 'myTasks', 'chat');
  else if (r.includes('doer')) keys.push('dashboard', 'myTasks', 'attendance', 'chat');
  else keys.push('dashboard', 'myTasks');
  // De-dupe while preserving order, cap at 4 (5th slot is always "More").
  return [...new Set(keys)].filter((k) => !(hideChat && k === 'chat')).slice(0, 4).map((k) => ALL_ITEMS[k]);
}

export default function BottomNav({ roles = [], viewerOnly = false, hideChat = false, onOpenMore }) {
  const navigate = useNavigate();
  const location = useLocation();

  if (viewerOnly) return null;

  const items = getItemsForRoles(Array.isArray(roles) ? roles : [], hideChat);
  const currentPath = location.pathname.split('/').pop() || '';
  const isActive = (route) => (route === '' ? currentPath === 'dashboard' || currentPath === '' : currentPath === route);

  return (
    <nav className="bottom-nav" aria-label="Primary">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.route);
        return (
          <button
            key={item.route || 'home'}
            type="button"
            className={`bottom-nav-item${active ? ' active' : ''}`}
            onClick={() => navigate(`/dashboard/${item.route}`)}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 2} />
            <span>{item.name}</span>
          </button>
        );
      })}
      <button type="button" className="bottom-nav-item" onClick={onOpenMore}>
        <Menu size={20} />
        <span>More</span>
      </button>
    </nav>
  );
}
