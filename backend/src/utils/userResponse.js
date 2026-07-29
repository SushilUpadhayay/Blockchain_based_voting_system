const Election = require('../models/Election');
const User = require('../models/User');

const getRelevantRegistration = (user, electionId = null) => {
  const obj = user?.toObject ? user.toObject() : user;
  const registrations = obj?.elections || [];

  if (electionId !== null && electionId !== undefined && electionId !== '') {
    const eId = Number(electionId);
    return registrations.find((entry) => Number(entry.electionId) === eId) || null;
  }

  return [...registrations].sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return bTime - aTime;
  })[0] || null;
};

const serializeSessionUser = (user, electionId = null) => {
  const obj = user?.toObject ? user.toObject() : user;
  const reg = getRelevantRegistration(obj, electionId);

  return {
    _id: obj._id,
    name: obj.name,
    email: obj.email,
    phone: obj.phone,
    citizenshipNumber: obj.citizenshipNumber,
    employeeId: obj.employeeId,
    dob: obj.dob,
    gender: obj.gender,
    address: obj.address,
    documentPath: obj.documentPath,
    documentFrontPath: obj.documentFrontPath,
    documentBackPath: obj.documentBackPath,
    status: reg?.status || null,
    rejectionReason: reg?.rejectionReason,
    electionId: reg?.electionId || null,
    elections: obj.elections || [],
    role: obj.role,
    adminRoles: obj.adminRoles || [],
    walletAddress: obj.walletAddress,
  };
};

const serializeElectionSchedule = (election) => {
  if (!election) return null;

  return {
    electionId: election.electionId,
    title: election.title,
    status: election.status,
    registrationPeriod: {
      startDate: election.registrationPeriod?.startDate || null,
      endDate: election.registrationPeriod?.endDate || null,
    },
    votingPeriod: {
      startDate: election.votingPeriod?.startDate || null,
      endDate: election.votingPeriod?.endDate || null,
    },
  };
};

const getElectionScheduleForElection = async (electionId) => {
  const eId = Number(electionId);
  if (!Number.isFinite(eId)) return null;

  const election = await Election.findOne({ electionId: eId })
    .select('electionId title status registrationPeriod votingPeriod');

  return serializeElectionSchedule(election);
};

const getVerifierContactsForElection = async (electionId) => {
  const eId = Number(electionId);
  if (!Number.isFinite(eId)) return [];

  const election = await Election.findOne({ electionId: eId }).select('verifiers');
  const verifierWallets = (election?.verifiers || [])
    .map((wallet) => String(wallet || '').toLowerCase())
    .filter(Boolean);

  const query = {
    adminRoles: { $elemMatch: { electionId: eId, role: 'verifier' } },
  };

  if (verifierWallets.length > 0) {
    query.walletAddress = { $in: verifierWallets };
  }

  const verifiers = await User.find(query)
    .select('name email phone walletAddress')
    .sort({ name: 1, email: 1 });

  return verifiers.map((verifier) => ({
    _id: verifier._id,
    name: verifier.name,
    email: verifier.email,
    phone: verifier.phone || '',
    walletAddress: verifier.walletAddress,
  }));
};

const serializeSessionUserWithVerifierContacts = async (user, electionId = null) => {
  const sessionUser = serializeSessionUser(user, electionId);

  if (sessionUser.role === 'user' && sessionUser.electionId) {
    const [verifierContacts, electionSchedule] = await Promise.all([
      getVerifierContactsForElection(sessionUser.electionId),
      getElectionScheduleForElection(sessionUser.electionId),
    ]);
    sessionUser.verifierContacts = verifierContacts;
    sessionUser.electionSchedule = electionSchedule;
  } else {
    sessionUser.verifierContacts = [];
    sessionUser.electionSchedule = null;
  }

  return sessionUser;
};

module.exports = {
  getRelevantRegistration,
  serializeSessionUser,
  getElectionScheduleForElection,
  getVerifierContactsForElection,
  serializeSessionUserWithVerifierContacts,
};
