# 🚙⚡ Mobilis

> A Soroban-powered automated micro-credit treasury for unbanked transport drivers in the Philippines.

<p align="center">
  <img width="100%" alt="Mobilis Dashboard" src="https://github.com/user-attachments/assets/a722e22f-fa77-4339-8dd6-945c1a89ad2a" />
</p>

## 📖 Problem & Solution

**The Problem:** Unbanked tricycle and modernized jeepney drivers in the Philippines operate on razor-thin margins. Many cannot afford upfront daily fuel costs and are forced to borrow from predatory local loan sharks charging excessive daily interest rates just to start their routes.

**The Solution:** Mobilis allows local TODAs (Tricycle Operators and Drivers' Associations) to pool a USDC/XLM treasury on the Stellar network. Drivers receive instant, zero-interest fuel advances that are spent via QR code at partner stations. The loan is repaid at the end of the shift with a minimal 0.5% protocol fee, automatically split and settled via Soroban smart contracts.

---

## ✅ Submission Checklist & Requirements Met

- [x] **Public GitHub repository:** Included.
- [x] **README with complete documentation:** You are reading it.
- [x] **Minimum 10+ meaningful commits:** Verified in commit history.
- [x] **Live demo link:** [Mobilis Web App](https://mobilis-10f9a.web.app/)
- [x] **Contract deployment address:** `CAVFLXBG4MXGTGECI6WAZXMDNX2H3UWFTMNY4DHK2MR4YUYEEU5STBID`
- [x] **Advanced smart contract development:** Rust-based Soroban contracts managing immutable debt states and trustless fee-splitting (0.3% to Coop Admin, 0.2% to Platform).
- [x] **Event streaming & real-time updates:** Horizon API polling combined with Firebase Firestore for rich, real-time transaction metadata.
- [x] **Mobile responsive frontend:** Tailwind CSS implementation with an app-like bottom navigation tailored for drivers on mobile devices.
- [x] **Error handling & loading states:** Comprehensive UI blocking during transaction signing, error boundary catches, and pre-flight contract simulation.
- [x] **Production-ready architecture practices:** Clear separation of off-chain metadata (Firebase) and on-chain asset transfers (Stellar Ledger).

---

## 🚀 Live Links & Proof of Deployment

* **Live Platform:** [https://mobilis-10f9a.web.app/](https://mobilis-10f9a.web.app/)
* **Testnet Contract Address:** `CAVFLXBG4MXGTGECI6WAZXMDNX2H3UWFTMNY4DHK2MR4YUYEEU5STBID`

### Transaction Hashes (Stellar Testnet Explorer)
| Action | Transaction Hash / Explorer Link | Screenshot Proof |
| :--- | :--- | :--- |
| **Initial Funding** | [64d87c59f1d0...](https://stellar.expert/explorer/testnet/tx/64d87c59f1d037475199dfd8e56425cf7a9dc0b183ab6da6838b961eb1dcd481) | <img width="300" alt="Tx 1" src="https://github.com/user-attachments/assets/23435bd2-cf4a-4ac4-b4fb-c73b6af21429" /> |
| **Loan Advance** | [fc0766df376f...](https://stellar.expert/explorer/testnet/tx/fc0766df376f13ca3b1e5e4583fe7c01738a244206d30269dd8912bb0ccd1d5a) | <img width="300" alt="Tx 2" src="https://github.com/user-attachments/assets/23bff5da-6fd0-4251-80b4-6b6d295ce10d" /> |
| **Debt Settlement** | [1ab1a0a09207...](https://stellar.expert/explorer/testnet/tx/1ab1a0a09207bbaefda4f8f696866c43eed23995904303d063cb52c0e13994d3) | <img width="300" alt="Tx 3" src="https://github.com/user-attachments/assets/465a469d-54c2-4b6d-9b2a-0a849e90192a" /> |
| **Fee Routing** | [702d83033adc...](https://stellar.expert/explorer/testnet/tx/702d83033adcdc63375368ab6292b9e5e44a24fba01a8b206e542cf516faf331) | <img width="300" alt="Tx 4" src="https://github.com/user-attachments/assets/06300370-ddeb-41c8-8813-0ad82b9238d2" /> |

---

## 🏗️ Architecture & Tech Stack

Mobilis uses a hybrid Web2.5 architecture to ensure drivers have a frictionless experience while maintaining the security of decentralized finance.

**Frontend (Client)**
* **Framework:** React 18 (Vite)
* **Styling & UI:** Tailwind CSS, Framer Motion (for complex 3D Canvas / Earth visualizations)
* **Web3 Integration:** `@stellar/stellar-sdk`, `@stellar/freighter-api` (Non-custodial wallet connections via LOBSTR and Freighter)

**Backend (Off-Chain Metadata)**
* **Platform:** Firebase (Authentication, Firestore Database)
* **Purpose:** Stores user profiles, TODA affiliations, plate numbers, and pending node approvals without cluttering the blockchain with PII.

**Smart Contract (On-Chain Logic)**
* **Language:** Rust
* **Framework:** Soroban SDK
* **Purpose:** Immutable ledger to prevent double-borrowing, track active debt states, and execute atomic transactions for fee splitting upon loan settlement.

---

## 💻 Local Development & Testing Instructions

### Prerequisites
* [Node.js & npm](https://nodejs.org/en/)
* [Rust toolchain](https://www.rust-lang.org/tools/install) (`rustup target add wasm32-unknown-unknown`)
* [Soroban CLI](https://soroban.stellar.org/docs/getting-started/setup) (`cargo install --locked soroban-cli`)
* A Firebase Project (Ensure you have your `VITE_FIREBASE_*` environment variables)

### 1. Smart Contract Setup & Testing
Navigate to the contracts directory to run the unit tests and ensure the Soroban logic is sound.

```bash
cd contracts/Mobilis
# Run the test suite (Verifies 3+ passing unit tests for borrowing and settling logic)
cargo test

cd mobilis-frontend
npm install


### 2. Front End Setup
# Create your .env file
cp .env.example .env
# Add your Firebase and Soroban RPC endpoints to the .env file

# Start the Vite development server
npm run dev
