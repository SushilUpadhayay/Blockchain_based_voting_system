// Shared User Status Constants
export const USER_STATUS = {
  PENDING: 'pending',
  REGISTERED: 'registered',
  REJECTED: 'rejected',
  BLOCKED: 'blocked',
};

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  VERIFY_OTP: '/verify-otp',
  UPLOAD: '/upload',
  DASHBOARD: '/dashboard',
  VOTING: '/voting',
  ADMIN: '/admin',
};

export const DASHBOARD_CONFIG = {
  ADMIN: {
    to: ROUTES.ADMIN,
    label: 'ADMIN PANEL',
    className: 'text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100 transition-all',
  },
  VOTING: {
    to: ROUTES.VOTING,
    label: 'VOTING DASHBOARD',
    className: 'text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-all',
  },
  STATUS: {
    to: ROUTES.DASHBOARD,
    label: 'STATUS DASHBOARD',
    className: 'text-sm font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 hover:bg-amber-100 transition-all',
  },
};

export const getDashboardConfig = (user) => {
  if (user?.role === 'admin') {
    return DASHBOARD_CONFIG.ADMIN;
  }
  if (user?.status === USER_STATUS.REGISTERED) {
    return DASHBOARD_CONFIG.VOTING;
  }
  return DASHBOARD_CONFIG.STATUS;
};
