# 🗳️ Technical Implementation Audit Report: VoteChain
**Prepared for Mid-Term Defense Documentation**  
**Date:** May 2026  
**Project Repository:** `SushilUpadhayay/Blockchain_based_voting_system`  
**Target Path:** `d:\Blockchain_based_voting_system`

---

## 1. Current Project Overview

### Actual Purpose of the System
**VoteChain** is a full-stack, decentralized electronic voting system designed to ensure democratic integrity by enforcing one-person-one-vote constraints, protecting voting records from tampering, and verifying voter identities off-chain. The system relies on a hybrid model:
* **Off-Chain Identity Registry:** User onboarding, data entry, and identity document storage are managed in a secure relational/document database to maintain privacy compliance and support administrative review.
* **On-Chain Ballot Casting:** Voting rules, candidate directories, and vote counts are hardcoded into an Ethereum Solidity smart contract. Votes are directly submitted to the blockchain by voters using MetaMask, rendering results immune to administrative or external database tampering.

### Current Implementation Status
The repository contains a fully functional, end-to-end working prototype that integrates a React Single Page Application (SPA), a Node.js/Express backend API, a MongoDB database, and an Ethereum local blockchain (running on Hardhat). 

### Actual Working Modules
1. **User Onboarding Portal:** Facilitates registration, wallet connection, cryptographic challenge signing, and email verification.
2. **Identity Verification Module:** Allows users to upload government IDs (PDF, JPG, PNG) and runs a mock OCR scan to simulate field validation.
3. **Admin Verification Dashboard:** Lists pending applications, shows document previews, and lets the administrator approve, reject, or block applicants.
4. **Election Control Center:** Restricts candidate registry additions, starts elections, and ends elections on the blockchain.
5. **Decentralized Voting Client:** Fetches candidates directly from the blockchain, whitelists voters via backend verification, gates vote casting with a voting-specific OTP, and sends transactions to MetaMask.

---

## 2. Actual System Architecture

The project leverages a distributed, multi-tier architecture to separate administrative validation, storage, and cryptographic consensus.

```
                              ┌─────────────────────────────────────────────────────────────┐
                              │                    REACT FRONTEND (Vite)                    │
                              │  - AuthContext.jsx & VotingContext.jsx Global States        │
                              │  - Ethers.js integrations with browser window.ethereum     │
                              │  - Dynamic CSS Theme Engine (Light/Dark variables)          │
                              └──────────────────┬──────────────────────┬───────────────────┘
                                                 │                      │
                                   HTTPS REST    │                      │ JSON-RPC Wallet
                                   JSON Payload  │                      │ Transaction Signs
                                                 ▼                      ▼
           ┌──────────────────────────────────────────┐  ┌─────────────────────────────────┐
           │           NODE.JS / EXPRESS API          │  │     LOCAL ETHEREUM NODE         │
           │  - JWT Auth & Role Authorization Gates   │  │     (Hardhat JSON-RPC Node)     │
           │  - OTP Nodemailer Service (SMTP)         │  │                                 │
           │  - Cryptographic Signature Recovery      │  │  ┌───────────────────────────┐  │
           │  - Mock OCR Document Scan Service        │  │  │        Voting.sol         │  │
           │                                          │  │  │     (Smart Contract)      │  │
           │  ┌────────────────────────────────────┐  │  │  │                           │  │
           │  │    Ethers.js Administrative Signer │──┼──┼─▶│  - authorizeVoter()       │  │
           │  │    (On-Chain whitelist injection)  │  │  │  │  - getCandidates()        │  │
           │  └────────────────────────────────────┘  │  │  │  - vote()                 │  │
           │                                          │  │  └───────────────────────────┘  │
           │  ┌────────────────────────────────────┐  │  └─────────────────────────────────┘
           │  │    MongoDB Storage (Mongoose)      │  │
           │  │    - User Profiles (Registered DB) │  │
           │  │    - Active OTPs & Nonces (TTL)    │  │
           │  └────────────────────────────────────┘  │
           └──────────────────────────────────────────┘
```

* **Frontend Structure:** Constructed as a single-page React app bundled with Vite. State is managed globally via React Contexts (`AuthContext` and `VotingContext`). Direct blockchain read-writes bypass the backend, querying the EVM via the MetaMask `BrowserProvider`.
* **Backend Structure:** Built as a RESTful Express API configured in `src/app.js` and running in CommonJS mode. Controllers execute business logic, while services manage off-chain integrations (Nodemailer, cryptographic checking, database models).
* **Blockchain Structure:** An EVM-compatible architecture configured using Hardhat. A single smart contract `Voting.sol` handles candidate arrays, voter authorization maps, ballot states, and vote counts.
* **Database Structure:** A document-oriented schema modeled via Mongoose. It uses three collections: `users` (profiles), `otps` (one-time codes), and `nonces` (cryptographic challenges).
* **Authentication Architecture:** Users log in by requesting an email OTP. The backend returns a stateless JSON Web Token (JWT) with user roles (`admin` or `user`) and registered wallet addresses, expiring in 2 hours.
* **Security Architecture:** The API is hardened against brute force and replay attacks via express-rate-limit middleware, MongoDB TTL-based self-destructing nonces, Express-validator inputs, and smart contract EVM constraints.
* **Wallet Integration Flow:** Frontend calls MetaMask to request the active account. During registration and login, MetaMask is prompted to sign a dynamic server challenge.
* **OTP Workflow:** Standard 6-digit random codes are generated via `crypto.randomInt` and SHA-256 hashed. Codes are delivered asynchronously via Gmail SMTP using a Nodemailer transporter pool.
* **Admin Workflow:** Admins authenticate with a secure JWT. They review document uploads, approve accounts (which triggers a backend transaction to write the wallet to the contract's whitelist), add candidates, and toggle election states.

---

## 3. Implemented Features

The following features are fully implemented and verified in the codebase:
* **Voter Registration:** Initial sign-up requiring name, email, DOB, address, ID number, and wallet address. Gated by a wallet signature challenge and email OTP validation.
* **Admin Approval:** Administrative portal allowing documents to be viewed in-app. Approving registers the voter on the blockchain ledger.
* **Wallet Binding:** Ensures a voter's profile is permanently bound to a specific Ethereum address. Direct wallet changes after registration are blocked.
* **OTP Verification:** Temporary 6-digit codes sent for registration, login, and voting confirmation.
* **JWT Authentication:** Stateful user session tokens containing `id`, `role`, and `walletAddress` sent in headers as `Bearer` tokens.
* **Wallet Signature Verification:** Signature recovery using `ethers.verifyMessage` to confirm ownership of the private keys mapping to the public address.
* **Blockchain Vote Recording:** Direct contract execution using gas-based transactions signed by the voter's MetaMask key.
* **Candidate Management:** Admin interface to add candidate names before the election goes live.
* **Election Management:** Admin actions to start the election (opening the contract to voting) and end it (locking the contract and enabling winner calculation).
* **Protected Routes:** React route guards (`ProtectedRoute` and `AdminRoute`) that redirect unauthenticated or unauthorized users.
* **Role-Based Authorization:** Gating of backend routes (via `/middleware/admin.js`) and frontend panels (using JWT decoded roles).
* **Rate Limiting:** IP-based request restrictions: 5 attempts per 5 minutes for authentication, and 10 attempts per 5 minutes for nonce queries.
* **Validation Middleware:** Meticulous schema validation of body/query parameters using `express-validator` to catch malformed inputs before database queries.
* **OTP Hashing:** Hashing of raw OTP codes using SHA-256 to ensure database breaches do not compromise active codes.
* **MongoDB Persistence:** Mongoose ODM models for persistent users, nonces, and OTP sessions.
* **Session Validation:** Startup checks on token validity that query the backend `/api/user/profile` before restoring the user session.
* **Logout System:** Complete local session invalidation (clearing localStorage, context reset, and success toast).
* **Smart Contract Validations:** Strict EVM modifiers: `onlyAdmin` restricting admin functions, `beforeElection` protecting candidates, `electionActive` checking dates, and `hasVoted` preventing double-voting.

---

## 4. Technology Stack (REAL IMPLEMENTATION)

The current implementation utilizes the following library and framework versions:

### Frontend
* **Core Framework:** React v19.2.4 (Single Page Application)
* **Build Tool:** Vite v8.0.4
* **Routing:** React Router DOM v7.14.1
* **Styles & Icons:** Tailwind CSS v4.2.2, Lucide React v1.8.0
* **API Client:** Axios v1.15.0
* **Notifications:** React Hot Toast v2.6.0
* **Blockchain Client:** Ethers.js v6.16.0

### Backend
* **Runtime & Framework:** Node.js, Express.js v5.2.1
* **Database Driver:** Mongoose v9.4.1 (MongoDB ODM)
* **Auth & Cryptography:** jsonwebtoken v9.0.3, ethers v6.16.0
* **File Uploads:** Multer v2.1.1
* **Mailing:** Nodemailer v8.0.5
* **Security Middleware:** express-rate-limit v8.5.2, express-validator v7.3.2
* **Environment Configuration:** dotenv v17.4.2

### Blockchain & Smart Contracts
* **Language:** Solidity v0.8.20
* **Environment:** Hardhat v2.22.0
* **Toolbox:** `@nomicfoundation/hardhat-toolbox` v5.0.0 (Mocha, Chai, Ethers plugins)
* **RPC node:** Hardhat Local Node (running on `http://127.0.0.1:8545` with chain ID `31337`)

### Database
* **Database Server:** MongoDB Community Edition (Default port `27017`)

---

## 5. Current Workflow

### Registration Workflow
1. **Details Entry:** The voter enters profile information and clicks "Connect Wallet" to fetch their MetaMask address.
2. **Signing Challenge:** The frontend calls `/api/auth/nonce?walletAddress=...` to fetch a unique signing challenge containing a random nonce.
3. **MetaMask Signature:** MetaMask prompts the user to sign the challenge using `personal_sign`.
4. **Data Submission:** The registration details, signature, and challenge are sent to `/api/auth/register-init`.
5. **Verification & Cache:** The backend recovers the signer address using `ethers.verifyMessage` and compares it to the claimed address. If correct, an OTP is generated, hashed with SHA-256, and stored in a new `Otp` document containing the pending registration fields.
6. **OTP Delivery:** Nodemailer sends the raw 6-digit OTP to the user's email.
7. **Verification and Profile Creation:** The user inputs the OTP, sending it to `/api/auth/verify-register-otp`. The backend checks the hashed value. On success, it creates a new `User` document with a `pending` status, deletes the OTP document, and returns a session JWT.
8. **Document Upload:** The client is redirected to `/upload` to submit an identity document via Multer. Upon receipt, a mock OCR check simulates success, and the status changes to pending review.

### Login Workflow
1. **Email Submission:** The voter enters their email at `/login`.
2. **Validation:** The backend checks the user's status. Blocked users are rejected, and normal users are checked to ensure their wallet is connected and authorized on-chain.
3. **Challenge Generation:** The backend issues a signing challenge via `/api/auth/nonce`.
4. **MetaMask Login Signature:** MetaMask prompts the voter to sign the challenge.
5. **OTP Generation:** An OTP is sent to the user's registered email.
6. **Double-Factor Verification:** The voter inputs the OTP. The frontend sends the OTP, signature, and challenge message to `/api/auth/verify-otp`.
7. **Session Issuance:** The backend checks the OTP hash and recovers the wallet signer. If both are valid, a JWT session token is returned.

### Admin Approval Workflow
1. **Fetch Pending:** The admin logs in, and the dashboard fetches pending users from `/api/admin/pending-users`.
2. **Review:** The admin reviews identity details and views uploaded document files (PDF/images) in the viewer modal.
3. **EVM Whitelisting:** Clicking "Approve" triggers `/api/admin/approve/:id`. The backend loads the admin's private key (`process.env.PRIVATE_KEY`), calls the contract's `authorizeVoter(walletAddress)` function, and waits for the transaction to be mined.
4. **Finalization:** The user's status is updated to `registered` in MongoDB, and the transaction hash is logged.

### Voting Workflow
1. **Dashboard Loading:** Approved users view candidate cards.
2. **Cast Ballot Trigger:** Clicking "Cast Your Vote" checks if the connected MetaMask wallet matches the registered address.
3. **Voting OTP Gate:** If valid, the UI requests an OTP from `/api/auth/request-vote-otp` and displays the `OTPModal` input.
4. **OTP Verification:** The user inputs the OTP, which is verified on the backend via `/api/auth/verify-vote-otp`.
5. **Direct On-Chain Casting:** Once verified, the frontend instantiates the contract via MetaMask's provider and calls `vote(candidateId)`.
6. **EVM Processing:** The transaction is signed with the user's private key. The EVM checks that they are authorized, have not voted, and that the election is active. It then increments the candidate's vote count and emits `VoteCast`.

### Blockchain Interaction Workflow
The project implements two distinct routes of blockchain interaction, introducing a slight design mismatch:
* **Backend Administrative Calls (Relayed):** The backend relies on a server-managed wallet initialized using `process.env.PRIVATE_KEY` to run administrative tasks, such as whitelisting voters on-chain during approval (`authorizeVoter`).
* **Frontend Voter Calls (Direct):** Voters submit transactions directly to the contract via MetaMask. This avoids gas costs for the server and maintains voter key security.
* **Redundant API Routes:** The backend includes controllers for `startElection`, `endElection`, and `addCandidate` that execute using the server's private key. However, the React frontend ignores these API endpoints, triggering the contract calls directly from the admin's MetaMask wallet in `AdminDashboard.jsx`.

---

## 6. Security Features Implemented

### 1. Cryptographic Wallet Proof-of-Ownership
By forcing voters to sign a dynamic nonce challenge during registration and login, VoteChain prevents **wallet hijacking**. A voter cannot register or login with another voter's public address without possessing the associated private keys.

### 2. Multi-Factor Gating (MFA)
Sensitive actions are gated by two-factor authentication. Ballot casting requires:
1. **JWT Verification:** Validates session credentials.
2. **Email OTP:** Confirms access to the registered email address.
3. **EVM Whitelisting & Signature:** The transaction is sent from the registered wallet and signed by the voter.

### 3. Protection Against Replay & Nonce Reuse
Nonces and OTPs are destroyed immediately upon verification (`deleteOne`). This prevents attackers from intercepting and reusing verification details.

### 4. Automatic TTL Purging
Database entries for OTPs and nonces use MongoDB TTL indexes (`expireAfterSeconds: 0`). Expired sessions self-delete after 3 to 5 minutes, preventing stale data access.

### 5. Input Sanitization & Rate Limiting
* All requests are screened for schema anomalies and malicious parameters using `express-validator` middleware.
* IP-based rate limiting prevents brute-force OTP guessing and server overloading on auth endpoints.

---

## 7. Current Project Status

### Completed Modules
* **Voter Whitelisting Engine:** Database registration, document uploads, and contract whitelisting.
* **MFA Session Security:** Hashed OTPs, rate limiters, and signature verification.
* **Solidity Smart Contract:** Clean execution of ballot casting, double-voting prevention, and winner determination.
* **Admin Verification Portal:** Document rendering, status controls, and candidate registry additions.

### Partially Completed Modules & Mocks
* **OCR Service:** The file `ocrService.js` is a placeholder mock. It simulates processing with a 1.5-second timeout and returns a static match (`confidence: 0.95`).
* **Whitelisted Citizen List:** The system lacks a seed list of eligible citizens. Currently, anyone can register and request review, requiring the admin to manually verify eligibility.

### Planned Future Enhancements
* **Zero-Knowledge Anonymity (zk-SNARKs):** Masking voter wallet addresses on-chain to protect ballot privacy.
* **Redis Caching:** Moving nonces and OTP sessions out of MongoDB into Redis for better scaling.
* **Factory Contract Design:** Refactoring the contract to deploy multiple elections dynamically from a master factory contract.
* **Decentralized Document Storage:** Storing identity files on IPFS instead of local disk storage.

---

## 8. Current Limitations / Remaining Problems

### Vote Anonymity Gap
Votes are submitted directly by voters' wallets. Although the contract does not store names, the blockchain ledger records the voter's public address alongside their vote. Since the database maps users' real names to their wallet addresses, a database leak would compromise ballot secrecy.

### Admin Centralization
The system admin wields significant control:
* The admin key can approve arbitrary wallet addresses, bypassing the registration checks.
* The admin can block voters or reject applications, creating a single point of failure.

### Mock OCR Service
The lack of a production-ready OCR engine means the system does not automatically parse document details or check for identity fraud, relying entirely on manual admin verification.

### Single-Election Constraint
The contract is designed for a single election. Once closed, the contract cannot be reset or reused, requiring a redeployment for every new election.

### Local Blockchain Dependency
The contract ABI and address configurations are compiled locally, and network connections are restricted to Hardhat's local port (`http://127.0.0.1:8545`).

---

## 9. Testing & Verification

### Smart Contract Unit Testing
The contract has a comprehensive Mocha/Chai test suite in `test/Voting.test.js` (23 unit tests):
* **Deployment:** Verifies admin address initialization and default states.
* **Admin Functions:** Validates candidate additions, address whitelisting, and duplicate prevention.
* **Election Lifecycle:** Tests state locks for starting and ending elections.
* **Voting Logic:** Checks vote counts, double-voting prevention, and boundary limits.
* **Results Verification:** Tests winner calculations and tie-breaking behavior.

### Frontend Build Verification
The Vite builder is verified and compiles successfully:
* The build output bundles all assets into the `dist/` directory.
* Direct MetaMask and Ethers.js integration is tested on standard browsers.

### API & Input Validation Testing
API route robustness is tested against rate limits and validation schemas:
* Express Validator caught malformed wallet addresses and invalid ISO DOB dates.
* IP rate limiters blocked consecutive API hits, returning HTTP status `429`.
* Hashed OTPs were verified to match the storage records, rejecting reuse attempts.

---

## 10. Folder Structure Summary

```
blockchain-voting-system/
├── contracts/                  # Solidity smart contracts
│   └── Voting.sol              # Core EVM election contract
├── scripts/                    # Hardhat deployment & initialization scripts
│   ├── deploy.js               # Contract compiler and address exporter
│   └── initialize.js           # Verification test connection script
├── test/                       # Hardhat Mocha/Chai contract tests
│   └── Voting.test.js          # Core unit test suite (23 tests)
├── backend/                    # Node.js Express REST API
│   ├── src/
│   │   ├── config/             # Database connection and ABI configurations
│   │   ├── controllers/        # Express route handlers (Auth, Admin, User)
│   │   ├── middleware/         # Security guards (JWT auth, Admin locks, upload limits)
│   │   ├── models/             # MongoDB Mongoose schemas (User, Nonce, Otp)
│   │   ├── routes/             # REST Endpoints mapping
│   │   ├── services/           # Off-chain services (blockchain, Nodemailer, wallet verification)
│   │   └── utils/              # JWT token generation utilities
│   ├── server.js               # API Entrypoint
│   └── .env                    # Secret environment file (excluded from git)
└── frontend/                   # React SPA client (Vite + Tailwind CSS)
    ├── src/
    │   ├── api/                # API Client wrapper
    │   ├── components/         # Reusable glassmorphic UI controls
    │   ├── context/            # Shared Context states (Auth, Voting, Theme)
    │   ├── pages/              # Visual view routers (Home, Register, Login, Dashboards)
    │   └── utils/              # Hardhat exported ABIs and address files
```

---

## 11. API Structure

The backend API exposes the following endpoints (configured in `backend/src/routes`):

### Authentication Routing (`/api/auth`)
* `GET  /nonce` — Fetches a dynamic wallet challenge.
* `POST /register-init` — Submits profile details and verifies wallet ownership.
* `POST /verify-register-otp` — Confirms registration OTP and creates a pending user.
* `POST /login` — Requests login OTP and generates a challenge.
* `POST /verify-otp` — Verifies login OTP and signature to issue a JWT.
* `POST /request-vote-otp` — Sends a voting OTP (Requires JWT).
* `POST /verify-vote-otp` — Verifies voting OTP (Requires JWT).

### User Routing (`/api/user`)
* `POST /upload-document` — Receives document files and runs mock OCR (Requires JWT).
* `POST /connect-wallet` — Disabled (throws error; wallet must be bound at registration).
* `GET  /profile` — Retrieves the logged-in user's profile (Requires JWT).

### Administrative Routing (`/api/admin`)
* `GET  /pending-users` — Lists pending voter registrations.
* `POST /approve/:id` — Approves voter and writes their address to the contract whitelist.
* `POST /reject/:id` — Rejects registration and stores the reason.
* `POST /block/:id` — Permanently blocks the voter.
* `POST /start-election` — Unused (redundant; frontend calls the contract directly).
* `POST /end-election` — Unused (redundant; frontend calls the contract directly).
* `POST /add-candidate` — Unused (redundant; frontend calls the contract directly).

---

## 12. Smart Contract Analysis (`Voting.sol`)

The `Voting.sol` smart contract implements the following architecture:

### Contract Properties & Structures
* `Candidate` (Struct): Contains `id`, `name`, and `voteCount`.
* `admin` (address): Immutable deployer address set in the constructor.
* `isActive` (bool): Toggles voter access.
* `electionStarted` (bool): Prevents candidate changes after voting begins.
* `candidates` (Candidate[]): Array of registered candidates.
* `registeredVoters` (mapping): Maps wallet addresses to authorization status (`bool`).
* `hasVoted` (mapping): Maps wallet addresses to voting status (`bool`).

### Core Contract Logic
* `addCandidate(string name)`: Restricts additions to the admin before the election starts.
* `authorizeVoter(address voter)`: Whitelists voter wallets.
* `startElection()`: Opens the election to voters.
* `endElection()`: Closes the election and stops vote submissions.
* `vote(uint256 candidateId)`: Registers a vote. It requires the election to be active, the voter to be whitelisted, and that they have not already voted. It flags the voter as having voted and increments the candidate's count.
* `getWinner()`: Calculates the winner based on vote counts (only available after the election ends).

---

## 13. Database Schema Summary

The database uses three Mongoose schemas:

### 1. User Model (`User.js`)
Stores voter credentials and verification states:
* `name` (String, required)
* `email` (String, required, unique)
* `idNumber` (String, required for users, unique, sparse index)
* `dob` (String, required for users)
* `address` (String, required for users)
* `documentPath` (String, default: `'pending_upload'`)
* `status` (String, enum: `['pending', 'registered', 'rejected', 'blocked']`, default: `'pending'`)
* `rejectionReason` (String, optional)
* `walletAddress` (String, required for users)
* `role` (String, enum: `['user', 'admin']`, default: `'user'`)

### 2. Otp Model (`Otp.js`)
Manages temporary verification codes:
* `email` (String, required, lowercase)
* `otp` (String, required, SHA-256 hashed)
* `purpose` (String, enum: `['registration', 'login', 'voting']`, required)
* `attempts` (Number, default: `0`)
* `userData` (Mixed, optional): Temporarily caches registration details during onboarding.
* `expiresAt` (Date, required): Cleared by a MongoDB TTL index.

### 3. Nonce Model (`Nonce.js`)
Stores challenges for cryptographic wallet signatures:
* `walletAddress` (String, required, lowercase)
* `message` (String, required): Challenge text shown in MetaMask.
* `expiresAt` (Date, required): Cleared by a MongoDB TTL index after 3 minutes.
