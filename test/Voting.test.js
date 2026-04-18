// test/Voting.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Voting", function () {
  let voting;
  let admin, voter1, voter2, stranger;

  beforeEach(async function () {
    [admin, voter1, voter2, stranger] = await ethers.getSigners();

    const Voting = await ethers.getContractFactory("Voting");
    voting = await Voting.deploy();
    await voting.waitForDeployment();
  });

  // ── Deployment ─────────────────────────────────────────────────────────────
  describe("Deployment", function () {
    it("sets the deployer as admin", async function () {
      expect(await voting.admin()).to.equal(admin.address);
    });

    it("starts with election inactive and not started", async function () {
      const [active, started] = await voting.getElectionStatus();
      expect(active).to.equal(false);
      expect(started).to.equal(false);
    });

    it("starts with zero candidates", async function () {
      expect(await voting.getCandidateCount()).to.equal(0);
    });
  });

  // ── Admin Functions ────────────────────────────────────────────────────────
  describe("addCandidate", function () {
    it("allows admin to add a candidate before election", async function () {
      await voting.addCandidate("Alice");
      expect(await voting.getCandidateCount()).to.equal(1);
    });

    it("assigns sequential IDs starting at 1", async function () {
      await voting.addCandidate("Alice");
      await voting.addCandidate("Bob");
      const c = await voting.getCandidate(1);
      expect(c.id).to.equal(1n);
      expect(c.name).to.equal("Alice");
    });

    it("rejects empty candidate names", async function () {
      await expect(voting.addCandidate("")).to.be.revertedWith("Empty name");
    });

    it("rejects non-admin", async function () {
      await expect(
        voting.connect(voter1).addCandidate("Alice")
      ).to.be.revertedWith("Only admin allowed");
    });

    it("rejects adding candidate after election starts", async function () {
      await voting.addCandidate("Alice");
      await voting.startElection();
      await expect(voting.addCandidate("Bob")).to.be.revertedWith(
        "Election already started"
      );
    });
  });

  describe("authorizeVoter", function () {
    it("allows admin to authorize a voter", async function () {
      await voting.authorizeVoter(voter1.address);
      expect(await voting.registeredVoters(voter1.address)).to.equal(true);
    });

    it("rejects duplicate authorization", async function () {
      await voting.authorizeVoter(voter1.address);
      await expect(voting.authorizeVoter(voter1.address)).to.be.revertedWith(
        "Already registered"
      );
    });

    it("rejects zero address", async function () {
      await expect(
        voting.authorizeVoter(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid address");
    });

    it("rejects non-admin", async function () {
      await expect(
        voting.connect(voter1).authorizeVoter(voter2.address)
      ).to.be.revertedWith("Only admin allowed");
    });
  });

  describe("startElection", function () {
    it("starts election when candidates exist", async function () {
      await voting.addCandidate("Alice");
      await voting.startElection();
      const [active, started] = await voting.getElectionStatus();
      expect(active).to.equal(true);
      expect(started).to.equal(true);
    });

    it("rejects start with no candidates", async function () {
      await expect(voting.startElection()).to.be.revertedWith("No candidates");
    });

    it("rejects double start", async function () {
      await voting.addCandidate("Alice");
      await voting.startElection();
      await expect(voting.startElection()).to.be.revertedWith("Already started");
    });
  });

  // ── Voting ─────────────────────────────────────────────────────────────────
  describe("vote", function () {
    beforeEach(async function () {
      await voting.addCandidate("Alice");
      await voting.addCandidate("Bob");
      await voting.authorizeVoter(voter1.address);
      await voting.authorizeVoter(voter2.address);
      await voting.startElection();
    });

    it("allows authorized voter to cast a vote", async function () {
      await voting.connect(voter1).vote(1);
      expect(await voting.hasVoted(voter1.address)).to.equal(true);
    });

    it("increments candidate vote count", async function () {
      await voting.connect(voter1).vote(1);
      await voting.connect(voter2).vote(1);
      const candidate = await voting.getCandidate(1);
      expect(candidate.voteCount).to.equal(2n);
    });

    it("rejects double voting", async function () {
      await voting.connect(voter1).vote(1);
      await expect(voting.connect(voter1).vote(1)).to.be.revertedWith(
        "Already voted"
      );
    });

    it("rejects unauthorized voter", async function () {
      await expect(voting.connect(stranger).vote(1)).to.be.revertedWith(
        "Not registered"
      );
    });

    it("rejects invalid candidate ID", async function () {
      await expect(voting.connect(voter1).vote(99)).to.be.revertedWith(
        "Invalid candidate"
      );
    });
  });

  // ── End Election & Results ──────────────────────────────────────────────────
  describe("endElection & getWinner", function () {
    it("admin can end the election", async function () {
      await voting.addCandidate("Alice");
      await voting.startElection();
      await voting.endElection();
      const [active] = await voting.getElectionStatus();
      expect(active).to.equal(false);
    });

    it("returns correct winner after election ends", async function () {
      await voting.addCandidate("Alice");
      await voting.addCandidate("Bob");
      await voting.authorizeVoter(voter1.address);
      await voting.authorizeVoter(voter2.address);
      await voting.startElection();

      await voting.connect(voter1).vote(2); // Bob
      await voting.connect(voter2).vote(2); // Bob

      await voting.endElection();
      expect(await voting.getWinner()).to.equal("Bob");
    });

    it("rejects getWinner while election is active", async function () {
      await voting.addCandidate("Alice");
      await voting.startElection();
      await expect(voting.getWinner()).to.be.revertedWith(
        "Election still active"
      );
    });
  });
});
