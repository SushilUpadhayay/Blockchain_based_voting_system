const ROLE_LABELS = {
  voter: 'Voter',
  verifier: 'Registration Verifier',
  superadmin: 'Election Administrator',
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const normalizeWallet = (walletAddress) => String(walletAddress || '').trim().toLowerCase();

const getUserRoleKinds = (user) => {
  if (!user) return [];

  const roles = new Set();
  const adminRoles = user.adminRoles || [];

  adminRoles.forEach((entry) => {
    if (entry?.role) roles.add(entry.role);
  });

  if ((user.elections || []).length > 0 || user.citizenshipNumber || user.role === 'user') {
    roles.add('voter');
  }

  return [...roles];
};

const getRoleConflict = (user, requestedRole) => {
  return getUserRoleKinds(user).find((role) => role !== requestedRole) || null;
};

const describeRole = (role) => ROLE_LABELS[role] || role;

const describeRoles = (roles) => roles.map(describeRole).join(', ');

const assertUserCanUseRole = (user, requestedRole, res) => {
  const conflict = getRoleConflict(user, requestedRole);
  if (!conflict) return;

  if (res) res.status(409);
  const currentRoles = describeRoles(getUserRoleKinds(user));
  throw new Error(
    `This email is already assigned to ${currentRoles}. Use a different email for the ${describeRole(requestedRole)} role.`
  );
};

module.exports = {
  normalizeEmail,
  normalizeWallet,
  getUserRoleKinds,
  getRoleConflict,
  describeRole,
  assertUserCanUseRole,
};
