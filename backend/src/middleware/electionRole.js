const Election = require('../models/Election');

const getElectionRole = (user, electionId) => {
  if (!user) return null;
  if (typeof user.getElectionRole === 'function') {
    return user.getElectionRole(electionId);
  }
  const roleEntry = (user.adminRoles || []).find((entry) => Number(entry.electionId) === Number(electionId));
  return roleEntry?.role || null;
};

/**
 * Middleware: Enforces that the caller's wallet matches the election's superAdmin.
 */
const isSuperAdmin = async (req, res, next) => {
  try {
    const electionId = req.params.electionId || req.body.electionId;
    if (!electionId) {
      res.status(400);
      return next(new Error('Election ID is required'));
    }

    const election = await Election.findOne({ electionId: Number(electionId) });
    if (!election) {
      res.status(404);
      return next(new Error('Election not found'));
    }

    const userWallet = (req.user?.walletAddress || '').toLowerCase();
    const superAdminWallet = (election.superAdmin || '').toLowerCase();
    const roleForElection = getElectionRole(req.user, electionId);

    if (roleForElection === 'superadmin' || (userWallet && userWallet === superAdminWallet)) {
      req.election = election;
      return next();
    }

    res.status(403);
    return next(new Error('Only the election Super Admin is authorized to perform this action'));
  } catch (error) {
    return next(error);
  }
};

/**
 * Middleware: Enforces that the caller's wallet is either superAdmin OR an assigned Registration Verifier.
 */
const isRegistrationVerifier = async (req, res, next) => {
  try {
    const electionId = req.params.electionId || req.body.electionId;
    if (!electionId) {
      res.status(400);
      return next(new Error('Election ID is required'));
    }

    const election = await Election.findOne({ electionId: Number(electionId) });
    if (!election) {
      res.status(404);
      return next(new Error('Election not found'));
    }

    const userWallet = (req.user?.walletAddress || '').toLowerCase();
    const superAdminWallet = (election.superAdmin || '').toLowerCase();
    const verifiers = (election.verifiers || []).map((v) => v.toLowerCase());
    const roleForElection = getElectionRole(req.user, electionId);

    const hasElectionRole = roleForElection === 'superadmin' || roleForElection === 'verifier';
    const hasOnChainRole = userWallet && (userWallet === superAdminWallet || verifiers.includes(userWallet));
    const isAuthorized = hasElectionRole || hasOnChainRole;

    if (isAuthorized) {
      req.election = election;
      return next();
    }

    res.status(403);
    return next(new Error('Only the Super Admin or an assigned Registration Verifier is allowed'));
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  isSuperAdmin,
  isRegistrationVerifier,
};
