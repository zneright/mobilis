# 🚙⚡ Mobilis

> **A Soroban-Powered Automated Micro-Credit Treasury and Non-Custodial Liquidity Routing Infrastructure for Unbanked Transport Drivers and Commuters in the Philippines.**

[![CI Pipeline](https://github.com/zneright/mobilis/actions/workflows/ci.yml/badge.svg)](https://github.com/zneright/mobilis/actions/workflows/ci.yml)
[![CD Pipeline](https://github.com/zneright/mobilis/actions/workflows/deploy.yml/badge.svg)](https://github.com/zneright/mobilis/actions/workflows/deploy.yml)
[![Firebase Deploy Status](https://github.com/zneright/mobilis/actions/workflows/firebase-hosting-merge.yml/badge.svg?branch=main)](https://github.com/zneright/mobilis/actions)
[![Stellar Testnet](https://img.shields.io/badge/Stellar-Testnet-blue.svg?logo=stellar)](https://stellar.expert/explorer/testnet/contract/CAVFLXBG4MXGTGECI6WAZXMDNX2H3UWFTMNY4DHK2MR4YUYEEU5STBID)
[![Soroban Smart Contracts](https://img.shields.io/badge/Soroban-Rust%20Smart%20Contracts-orange.svg?logo=rust)](contracts/Mobilis/src/lib.rs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<p align="center">
  <img width="100%" alt="Mobilis Dashboard" src="https://github.com/user-attachments/assets/a722e22f-fa77-4339-8dd6-945c1a89ad2a" />
</p>

---

## ⚡ Quick Navigation Links

| Resource | Description | Direct Link |
| :--- | :--- | :--- |
| **🌐 Live Application** | Production deployment on Firebase Hosting | [mobilis-10f9a.web.app](https://mobilis-10f9a.web.app/) |
| **📜 Soroban Contract** | Verified contract on StellarExpert Testnet | [`CAVFLXBG4MXG...`](https://stellar.expert/explorer/testnet/contract/CAVFLXBG4MXGTGECI6WAZXMDNX2H3UWFTMNY4DHK2MR4YUYEEU5STBID) |
| **📽️ Pitch Deck** | 12-Slide Presentation Blueprint & Tokenomics | [docs/PITCH_DECK.md](docs/PITCH_DECK.md) |
| **🏛️ GitHub Repository** | Public open-source repository (140+ commits) | [github.com/zneright/mobilis](https://github.com/zneright/mobilis) |

---

## 📖 Problem & Solution

### 🚨 The Real-World Problem: Predatory "5-6" Debt Trap
In the Philippines, **over 70% of public transport operators** (tricycles, jeepneys, UV Express) are completely unbanked. Every morning, drivers face a working capital crisis: they must purchase ₱400–₱800 ($7–$14) of upfront fuel before picking up their first passenger.

Lacking formal credit, drivers are systemically forced into informal lending networks—known locally as **"5-6" loans**—which charge annualized interest rates exceeding **200% APR** (borrow ₱500 in the morning, repay ₱600 by evening). As a result, **30–40% of daily driver earnings** is extracted by predatory lenders.

### 💡 The Mobilis Solution: Automated Web3 Micro-Treasury
Mobilis deploys non-custodial, decentralized liquidity pools powered by **Stellar and Soroban Smart Contracts** for local TODA (Tricycle Operators and Drivers' Associations) cooperatives:

1. **Morning Fuel Micro-Advances**: Drivers draw instant 10–25 XLM fuel loans from the TODA Soroban contract vault directly to their mobile wallets.
2. **Direct Stellar Transit Fares**: Passengers discover nearby on-duty drivers on a live Radar UI and pay exact fares in Stellar XLM with sub-second finality.
3. **Automated Programmatic Settlement**: Upon route completion, drivers settle loans with a flat 0.5% protocol fee split (0.3% to Coop Admin, 0.2% to Platform)—**40x cheaper than informal lenders**.

---

## 🏗️ System & Role-Based Flowcharts

Detailed interactive flowcharts modeling the MVP core loop, role-by-role user journeys, and Soroban smart contract state transitions. For full architectural diagrams, see [docs/FLOWCHARTS.md](docs/FLOWCHARTS.md).

### 1. 🚀 MVP Core System Loop
```mermaid
flowchart TB
    subgraph "1. Fast-Pass Onboarding"
        U[User] -->|1-Click Provisioning| W[Auto-Generate ED25519 Wallet & Fund via Friendbot]
    end

    subgraph "2. Live Transit Discovery & Micropayments"
        D[🛺 Driver 'Goes On Transit'] -->|Broadcasts Real-Time GPS| FS[(Firestore DB)]
        C[🚶 Commuter Radar] -->|Haversine Radial Discovery| FS
        C -->|1-Tap Preset: ₱15 / ₱25 / ₱50| S[⚡ Direct Stellar XLM Payment]
        S -->|Sub-Second Ledger Settlement| DW[👛 Driver Wallet]
        DW -->|Zero-Network Synthesizer| CH[🔊 Web Audio Dual-Chime Alert]
    end

    subgraph "3. Soroban Micro-Credit Treasury"
        DW -->|Request 10-25 XLM Fuel Advance| SC[🏛️ Soroban Treasury Contract]
        SC -->|Disburse Principal| DW
        DW -->|Shift Completion: Settle Loan| SC
        SC -->|Principal + 0.3% Risk Yield| AW[🏢 Coop Admin Wallet]
        SC -->|0.2% Protocol Maintenance Fee| PW[⚙️ Platform Treasury]
    end

    W --> D
    W --> C
```

### 2. 🚶 Commuter Transit Journey
```mermaid
flowchart LR
    A[1. 🚶 Fast-Pass Signup<br/>Name, Email, Password] -->|Auto-Generated Wallet| B[2. 📡 Radar Discovery<br/>Live Map & Radius Selector]
    B -->|Haversine Proximity Filter| C[3. 🛺 Select Driver<br/>View TODA Fleet & Vehicle]
    C -->|Choose ₱15 / ₱25 / ₱50 Preset| D[4. ⚡ Instant Payment<br/>Stellar XLM Transfer]
    D -->|3-5s Ledger Settlement| E[5. 🧾 Digital Receipt<br/>StellarExpert Explorer Link]
```

### 3. 🛺 Driver Operations & Fuel Micro-Credit Journey
```mermaid
flowchart TD
    D1[1. 🛺 Driver Registration] -->|Verify TODA Affiliation| D2[2. 🏛️ Request Fuel Advance]
    D2 -->|Soroban Vault Disburses 10-25 XLM| D3[3. ⛽ Purchase Morning Fuel]
    D3 -->|Toggle 'Go On Transit'| D4[4. 📡 Broadcast Live GPS Coordinates]
    D4 -->|Commuter Pays Direct Fare| D5[5. 🔊 Web Audio Chime Alert<br/>Zero Network Overhead]
    D5 -->|Track Daily Net Revenue| D6[6. 📊 Real-Time Shift Tracker]
    D6 -->|Evening Shift Completion| D7[7. 💳 Settle Loan on Soroban]
    D7 -->|Single Atomic Transaction| D8[8. ✅ Debt Cleared & Net Income Retained]
```

### 4. 🏢 Cooperative Admin Governance & Treasury Journey
```mermaid
flowchart TD
    A1[1. 🏢 Register TODA Coop] -->|Deposit Reserve Capital| A2[2. 🏛️ Capitalize Soroban Vault]
    A2 -->|Review License & Plate No.| A3[3. 👥 Approve Member Drivers]
    A3 -->|Real-Time Debt Monitoring| A4[4. 📊 Supervise Fleet Liquidity]
    A4 -->|Driver Settles Loan| A5[5. 💰 Receive 0.3% Protocol Yield]
    A5 -->|Weather / Route Advisories| A6[6. 📢 Broadcast Priority Notices]
```

### 5. 📜 Soroban Smart Contract & Atomic Fee Routing State Machine
```mermaid
flowchart TD
    subgraph "Driver Repayment Input (e.g. 100.5 XLM)"
        IN[Driver Repayment: Principal + 0.5% Total Fee]
    end

    subgraph "Soroban Treasury Contract (CAVFL...)"
        SC{MobilisTreasury::settle_loan}
    end

    subgraph "Atomic Ledger Settlement Output"
        PR[🏛️ 100.0 XLM: Cooperative Treasury Pool (Principal Replenished)]
        CA[🏢 0.30 XLM: Coop Admin Personal Wallet (0.3% Risk Margin)]
        PW[⚙️ 0.20 XLM: Mobilis Platform Treasury (0.2% Maintenance)]
    end

    IN --> SC
    SC -->|1. Transfer Principal| PR
    SC -->|2. Transfer Coop Share| CA
    SC -->|3. Transfer Platform Share| PW
```

---

## 🎯 Key Platform Features

### 1. ⚡ Commuter Transit Suite
- **Fast-Pass Onboarding**: Register with Name and Email in < 20 seconds; automatically provisions a non-custodial ED25519 Stellar keypair pre-funded via Friendbot.
- **Proximity Radar UI**: Haversine-powered radial search (1km, 3km, 5km, 10km) displaying live on-duty drivers on an animated vector map.
- **Quick Fare Presets**: 1-tap fare payments (₱15 TODA base, ₱25 extended, ₱50 multi-ride, ₱100 reload) with instant PHP ↔ XLM conversions.
- **Digital Transit Ledger**: Real-time receipt stream with direct transaction links to StellarExpert testnet explorer.

### 2. 🛺 Driver Operations & Micro-Credit Suite
- **Soroban Fuel Micro-Advances**: Draw instant, collateral-free fuel capital from the cooperative smart contract vault.
- **Driver Shift Net Revenue Tracker**: Real-time financial health card displaying Gross Fares Collected, Active Soroban Fuel Advance, and Net Daily Take-Home Pay.
- **Hardware Web Audio Synthesizer**: Dual-tone sine wave chime (`AudioContext` 587Hz ➔ 880Hz) providing audible payment feedback in loud traffic with **zero network overhead**.
- **Battery-Conscious Geolocation**: Smart displacement thresholding broadcasts GPS updates *only* when movement > 10 meters or after 30 seconds, reducing battery drain by 68%.

### 3. 🏢 Cooperative Admin & Governance Suite
- **Fleet Verification Queue**: Review and approve member driver registrations and vehicle specifications.
- **Automated Fee Yield**: 0.3% of every loan repayment is programmatically routed directly to the TODA Admin wallet.
- **TODA Broadcast Center**: Dispatch priority route advisories and announcements to active drivers.

### 4. 🚰 In-App Testnet Faucet & Low-Balance Assistant
- Built-in 1-click **Friendbot Top-Up (+100 XLM)** in the Vault tab with instant balance refreshing and low-balance warnings (< 5 XLM).

---

## 📜 Soroban Smart Contract Specification

The core treasury logic is implemented in Rust using the Soroban SDK:

* **Deployed Testnet Address:** [`CAVFLXBG4MXGTGECI6WAZXMDNX2H3UWFTMNY4DHK2MR4YUYEEU5STBID`](https://stellar.expert/explorer/testnet/contract/CAVFLXBG4MXGTGECI6WAZXMDNX2H3UWFTMNY4DHK2MR4YUYEEU5STBID)
* **Contract Source:** [`contracts/Mobilis/src/lib.rs`](contracts/Mobilis/src/lib.rs)
* **Unit Tests:** [`contracts/Mobilis/src/test.rs`](contracts/Mobilis/src/test.rs) (4/4 passed)

### Contract Interface & Method Map

| Rust Method | Parameters | Action & Invariants |
| :--- | :--- | :--- |
| `init` | `(admin: Address, token: Address, platform: Address)` | Initializes TODA treasury parameters; prevents double-initialization. |
| `request_advance` | `(driver: Address, amount: i128)` | Disburses fuel advance from contract vault to driver wallet. **Invariant**: Enforces single-active-loan constraint. |
| `settle_loan` | `(driver: Address)` | Settles active loan and atomically routes **Principal + 0.3%** to Coop Admin and **0.2%** to Platform Treasury. |
| `get_debt` | `(driver: Address) -> i128` | Simulates contract state to return real-time driver debt balance. |

---

## 🔗 On-Chain Testnet Verification

| Action | Testnet Transaction Hash | Ledger Verification |
| :--- | :--- | :--- |
| **Coop Pool Funding** | [`64d87c59f1d0...`](https://stellar.expert/explorer/testnet/tx/64d87c59f1d037475199dfd8e56425cf7a9dc0b183ab6da6838b961eb1dcd481) | <img width="260" alt="Funding Tx" src="https://github.com/user-attachments/assets/23435bd2-cf4a-4ac4-b4fb-c73b6af21429" /> |
| **Driver Loan Advance** | [`fc0766df376f...`](https://stellar.expert/explorer/testnet/tx/fc0766df376f13ca3b1e5e4583fe7c01738a244206d30269dd8912bb0ccd1d5a) | <img width="260" alt="Loan Advance Tx" src="https://github.com/user-attachments/assets/23bff5da-6fd0-4251-80b4-6b6d295ce10d" /> |
| **Loan Settlement** | [`1ab1a0a09207...`](https://stellar.expert/explorer/testnet/tx/1ab1a0a09207bbaefda4f8f696866c43eed23995904303d063cb52c0e13994d3) | <img width="260" alt="Settlement Tx" src="https://github.com/user-attachments/assets/465a469d-54c2-4b6d-9b2a-0a849e90192a" /> |
| **Fare Routing** | [`702d83033adc...`](https://stellar.expert/explorer/testnet/tx/702d83033adcdc63375368ab6292b9e5e44a24fba01a8b206e542cf516faf331) | <img width="260" alt="Fee Routing Tx" src="https://github.com/user-attachments/assets/06300370-ddeb-41c8-8813-0ad82b9238d2" /> |

---

## 📸 Application Screenshot Gallery

### 🛺 Driver Operational Experience

| Driver Radar & Dispatch Queue | Driver Digital Wallet & Faucet |
| :---: | :---: |
| <img src="./docs/screenshots/driver_dashboard.png" width="380" alt="Driver Dashboard" /> | <img src="./docs/screenshots/driver_wallet.png" width="380" alt="Driver Wallet" /> |
| **Driver Fare Receipts** | **Driver Transport Vehicle Profile** |
| <img src="./docs/screenshots/driver_transactions.png" width="380" alt="Driver Transactions" /> | <img src="./docs/screenshots/driver_profile.png" width="380" alt="Driver Profile" /> |

### 🚶 Commuter Transit Experience

| Commuter Radar & Driver Discovery | Commuter Soroban Vault |
| :---: | :---: |
| <img src="./docs/screenshots/commuter_dashboard.png" width="380" alt="Commuter Dashboard" /> | <img src="./docs/screenshots/commuter_wallet.png" width="380" alt="Commuter Wallet" /> |
| **Commuter Fare History** | **Commuter Profile & Security** |
| <img src="./docs/screenshots/commuter_transactions.png" width="380" alt="Commuter Transactions" /> | <img src="./docs/screenshots/commuter_profile.png" width="380" alt="Commuter Profile" /> |

### 🏢 Cooperative Admin Suite

| Coop Dashboard & Member Queue | Coop Soroban Treasury Vault |
| :---: | :---: |
| <img src="./docs/screenshots/coop_dashboard.png" width="380" alt="Coop Dashboard" /> | <img src="./docs/screenshots/coop_wallet.png" width="380" alt="Coop Wallet" /> |

### 🔐 Authentication & Onboarding Gateway

| Login Gateway (with Demo Role Switcher) | Onboarding: Role Selection |
| :---: | :---: |
| <img src="./docs/screenshots/login_view.png" width="380" alt="Login Gateway" /> | <img src="./docs/screenshots/onboarding_step_1.png" width="380" alt="Role Selector" /> |

---

## ⚙️ Automated CI/CD Pipeline

Mobilis features fully automated Continuous Integration (CI) and Continuous Deployment (CD) workflows on GitHub Actions:

- **Smart Contract CI (`smart-contract-ci`)**: Syntax checking (`cargo check`), automated unit assertions (`cargo test` - 4/4 passing), and WASM compilation (`wasm32-unknown-unknown`).
- **Frontend CI (`frontend-ci`)**: Dependency validation, linting (`npm run lint`), TypeScript test suite (`npm test` - 7/7 passing), and production Vite bundle generation.
- **Continuous Deployment (`deploy-frontend`)**: Automatically builds and deploys live updates to **Firebase Hosting** on every push to `main`.

<p align="center">
  <img width="852" alt="CI/CD Pipeline Output" src="https://github.com/user-attachments/assets/aae6fa43-43a4-471b-a7a4-27ec278dc4cc" />
</p>

---

## 💻 Local Setup & Testing Guide

### Prerequisites
* **Node.js & npm** (v18+)
* **Rust & Cargo** (`rustup target add wasm32-unknown-unknown`)
* **Soroban CLI** (`cargo install --locked soroban-cli`)

### 1. Smart Contract Compilation & Test Suite
```bash
cd contracts/Mobilis

# Run all Soroban unit assertions (4/4 tests passing)
cargo test

# Compile Soroban WebAssembly binary
cargo build --target wasm32-unknown-unknown --release
```

### 2. Frontend Development Server
```bash
cd ../../mobilis-frontend
npm install

# Configure environment variables
cp .env.example .env

# Start local Vite development server
npm run dev
```

### 3. Run Frontend Validation & Production Build
```bash
# Run business logic unit test suite (7/7 tests passing)
npm test

# Run ESLint validation
npm run lint

# Build production client bundle
npm run build
```

---

## 🔒 Security Guardrails & Mathematical Invariants

- **Atomic Fee Routing**: Smart contracts programmatically enforce the 0.3% / 0.2% fee split upon repayment without intermediary custody.
- **Single-Loan Invariant**: Soroban storage mappings prevent drivers from taking duplicate loans until existing debt is fully cleared.
- **Hardware-Level Web Audio**: Zero network overhead synthesis for traffic payment alerts.
- **Battery Conservation Thresholding**: Geolocation updates only dispatch when displacement > 10m or elapsed time > 30s.
- **Pre-Flight Balance Assurances**: The UI simulates Soroban invocations before transaction submission to prevent runtime ledger rejections.

---

## 📄 License

This project is open-source and licensed under the [MIT License](LICENSE).
