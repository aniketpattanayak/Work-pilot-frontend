import { useState, useEffect } from 'react';
import API from '../api/axiosConfig';

const ORDER = ['self', 'team', 'department', 'branch', 'company'];

/**
 * What the logged-in person may do in Attendance, Leave and Payroll.
 *   const { can, ready } = usePermissions();   can('payroll.viewSalary')   can('attendance.view', 'team')
 * Screens use this to show or hide things. The server still checks every request.
 */
export default function usePermissions() {
  const [state, setState] = useState({ permissions: {}, modules: {}, ready: false });
  useEffect(() => {
    let live = true;
    API.get('/tasks/access/me')
      .then((r) => { if (live) setState({ permissions: r.data?.permissions || {}, modules: r.data?.modules || {}, ready: true }); })
      .catch(() => { if (live) setState((s) => ({ ...s, ready: true })); });
    return () => { live = false; };
  }, []);
  const can = (key, min = 'self') => !!state.permissions[key] && ORDER.indexOf(state.permissions[key]) >= ORDER.indexOf(min);
  return { ...state, can };
}
