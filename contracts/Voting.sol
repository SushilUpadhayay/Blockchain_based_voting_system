// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**

* @title Voting
* @notice Single-election decentralized voting smart contract
* @dev Identity verification is handled off-chain
  */
  contract Voting {

  // =============================================================
  // STRUCTS
  // =============================================================

  struct Candidate {
  uint256 id;
  string name;
  uint256 voteCount;
  }

  // =============================================================
  // STATE VARIABLES
  // =============================================================

  address public immutable admin;
  bool public isActive;
  bool private electionStarted;

  Candidate[] private candidates;

  mapping(address => bool) public registeredVoters;
  mapping(address => bool) public hasVoted;

  // =============================================================
  // EVENTS
  // =============================================================

  event CandidateAdded(uint256 indexed candidateId, string name);
  event VoterAuthorized(address indexed voter);
  event ElectionStarted(uint256 timestamp);
  event ElectionEnded(uint256 timestamp);
  event VoteCast(address indexed voter, uint256 indexed candidateId);

  // =============================================================
  // MODIFIERS
  // =============================================================

  modifier onlyAdmin() {
  require(msg.sender == admin, "Only admin allowed");
  _;
  }

  modifier electionActive() {
  require(isActive, "Election not active");
  _;
  }

  modifier beforeElection() {
  require(!electionStarted, "Election already started");
  _;
  }

  // =============================================================
  // CONSTRUCTOR
  // =============================================================

  constructor() {
  admin = msg.sender;
  isActive = false;
  electionStarted = false;
  }

  // =============================================================
  // ADMIN FUNCTIONS
  // =============================================================

  function addCandidate(string memory name) external onlyAdmin beforeElection {
  require(bytes(name).length > 0, "Empty name");
   uint256 id = candidates.length + 1;
   candidates.push(Candidate(id, name, 0));
   emit CandidateAdded(id, name);

  }

  function authorizeVoter(address voter) external onlyAdmin {
  require(voter != address(0), "Invalid address");
  require(!registeredVoters[voter], "Already registered");
   registeredVoters[voter] = true;
   emit VoterAuthorized(voter);

  }

  function startElection() external onlyAdmin {
  require(!electionStarted, "Already started");
  require(candidates.length > 0, "No candidates");
   isActive = true;
   electionStarted = true;

   emit ElectionStarted(block.timestamp);
  }

  function endElection() external onlyAdmin electionActive {
  isActive = false;
  emit ElectionEnded(block.timestamp);
  }

  // =============================================================
  // USER FUNCTION
  // =============================================================

  function vote(uint256 candidateId) external electionActive {
  require(electionStarted, "Election not started");
  require(registeredVoters[msg.sender], "Not registered");
  require(!hasVoted[msg.sender], "Already voted");
  require(candidateId >= 1 && candidateId <= candidates.length, "Invalid candidate");
   hasVoted[msg.sender] = true;
   candidates[candidateId - 1].voteCount += 1;

   emit VoteCast(msg.sender, candidateId);

  }

  // =============================================================
  // VIEW FUNCTIONS
  // =============================================================

  function getCandidates() external view returns (Candidate[] memory) {
  return candidates;
  }

  function getCandidate(uint256 id) external view returns (Candidate memory) {
  require(id >= 1 && id <= candidates.length, "Invalid ID");
  return candidates[id - 1];
  }

  function getResults() external view returns (Candidate[] memory) {
  return candidates;
  }

  function getCandidateCount() external view returns (uint256) {
  return candidates.length;
  }

  function getElectionStatus() external view returns (bool active, bool started) {
  return (isActive, electionStarted);
  }

  function getWinner() external view returns (string memory winnerName) {
  require(!isActive, "Election still active");
  require(candidates.length > 0, "No candidates");
   uint256 winningVoteCount = 0;
   uint256 winnerIndex = 0;

   for (uint256 i = 0; i < candidates.length; i++) {
       if (candidates[i].voteCount > winningVoteCount) {
           winningVoteCount = candidates[i].voteCount;
           winnerIndex = i;
       }
   }

   return candidates[winnerIndex].name;
  }
  }
