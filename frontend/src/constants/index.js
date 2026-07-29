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
  ELECTIONS: '/elections',
  CREATE_ELECTION: '/elections/create',
  ELECTION_ADMIN: '/elections/:electionId/admin',
  ELECTION_VERIFIER: '/elections/:electionId/verifier',
  VOTING: '/elections/:electionId/voting',
  RESULTS: '/elections/:electionId/results',
};

export const DASHBOARD_CONFIG = {
  ADMIN: {
    to: ROUTES.ELECTIONS,
    label: 'ELECTION PORTAL',
    className: 'text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100 transition-all',
  },
  VOTING: {
    to: ROUTES.ELECTIONS,
    label: 'ELECTION PORTAL',
    className: 'text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-all',
  },
  STATUS: {
    to: ROUTES.DASHBOARD,
    label: 'STATUS DASHBOARD',
    className: 'text-sm font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 hover:bg-amber-100 transition-all',
  },
};

export const getDashboardConfig = (user) => {
  // Admin-role users (Election Administrators and Verifiers) link to the Election Portal.
  // Registered voters also link to the Election Portal.
  if ((user?.adminRoles || []).length > 0 || user?.status === USER_STATUS.REGISTERED) {
    return DASHBOARD_CONFIG.ADMIN;
  }
  return DASHBOARD_CONFIG.STATUS;
};

