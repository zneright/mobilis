# 📊 Mobilis Architecture & Role-Based Flowcharts

> Comprehensive system, role-by-role user journeys, offline voucher engines, and Soroban smart contract state flowcharts for **Mobilis**.

---

## 🧭 Table of Contents
1. [End-to-End Multi-Layer System Architecture](#1-end-to-end-multi-layer-system-architecture)
2. [MVP Core System Loop](#2-mvp-core-system-loop)
3. [Commuter Transit & Beacon Journey](#3-commuter-transit--beacon-journey)
4. [Offline-First Cryptographic Micropayment Pipeline](#4-offline-first-cryptographic-micropayment-pipeline)
5. [Driver Operations & Tiered Micro-Credit Journey](#5-driver-operations--tiered-micro-credit-journey)
6. [Driver Pickup Dispatch & Approach State Machine](#6-driver-pickup-dispatch--approach-state-machine)
7. [Cooperative Admin Governance & Treasury Journey](#7-cooperative-admin-governance--treasury-journey)
8. [Platform Superadmin System Governance](#8-platform-superadmin-system-governance)
9. [Soroban Dynamic Credit Tier & Atomic Fee Routing State Machine](#9-soroban-dynamic-credit-tier--atomic-fee-routing-state-machine)

---

## 1. 🏛️ End-to-End Multi-Layer System Architecture

```mermaid
flowchart TB
    subgraph L1["📱 Layer 1: Client Presentation & PWA"]
        UI_C["🚶 Commuter Experience\n• Proximity Radar UI\n• 1-Tap Fare Presets\n• Offline QR Generator\n• Waiting Beacons"]
        UI_D["🛺 Driver Operations\n• Real-Time Shift Tracker\n• Audio Synthesizer\n• Offline QR Scanner\n• Dispatch Radar"]
        UI_A["🏢 Coop & Superadmin\n• Fleet Verification\n• Vault Capitalization\n• System Governance\n• Audit Ledger"]
    end

    subgraph L2["🔐 Layer 2: Cryptography & Account Abstraction"]
        PASS["🔑 WebAuthn / Passkeys Enclave\n(PRF Seedless Key Derivation)"]
        NONCUST["👛 ED25519 Non-Custodial Keypairs\n& Freighter Wallet API"]
        OFF_CRYPTO["📜 HMAC-SHA256 & ED25519\nOffline Voucher Signing Engine"]
    end

    subgraph L3["⚡ Layer 3: Real-Time Sync & Storage Engine"]
        FS_LOC[("🔥 Firestore Real-Time DB\n• Driver Locations (10m / 30s)\n• Commuter Waiting Beacons\n• Pickup Sessions")]
        FCM["📢 Firebase Cloud Messaging (FCM)\nPush Dispatch & Advisories"]
        IDB[("💾 IndexedDB & Local Cache\nOffline Settlement Queue")]
    end

    subgraph L4["⛓️ Layer 4: Stellar Blockchain & Soroban Contracts"]
        HORIZON["⚡ Stellar Horizon Testnet\nDirect XLM Transit Micropayments"]
        SOROBAN["🏛️ Soroban Treasury Contract\n(contracts/Mobilis/src/lib.rs)\n• Dynamic Credit Tiers (Bronze/Silver/Gold)\n• Reputation State Machine\n• Programmatic 0.3% / 0.2% Fee Split"]
    end

    UI_C --> PASS & NONCUST & OFF_CRYPTO
    UI_D --> PASS & NONCUST & OFF_CRYPTO
    UI_A --> NONCUST

    PASS & NONCUST --> HORIZON & SOROBAN
    OFF_CRYPTO --> IDB
    IDB -->|Network Reconnection Sync| HORIZON

    UI_C & UI_D <-->|Bi-directional Sync| FS_LOC
    FS_LOC <--> FCM
    UI_D -->|Audible Chime Trigger| UI_D
    HORIZON & SOROBAN -->|Receipt Stream| UI_C & UI_D & UI_A
```

---

## 2. 🚀 MVP Core System Loop

```mermaid
flowchart TB
    subgraph "1. Fast-Pass / Passkey Onboarding"
        U["User"] -->|Biometric Passkey or 1-Click Provisioning| W["Auto-Generate ED25519 Wallet & Fund via Friendbot"]
    end

    subgraph "2. Live Transit Discovery & Micropayments"
        D["🛺 Driver 'Goes On Transit'"] -->|Broadcasts Real-Time GPS| FS[("🔥 Firestore DB")]
        C["🚶 Commuter Radar"] -->|Haversine Radial Discovery| FS
        C -->|1-Tap Preset: ₱15 / ₱25 / ₱50| S["⚡ Direct Stellar XLM Payment"]
        S -->|Sub-Second Ledger Settlement| DW["👛 Driver Wallet"]
        DW -->|Zero-Network Synthesizer| CH["🔊 Web Audio Dual-Chime Alert"]
    end

    subgraph "3. Soroban Dynamic Micro-Credit Treasury"
        DW -->|Request Tier-Validated Fuel Advance| SC["🏛️ Soroban Treasury Contract"]
        SC -->|Disburse Principal: 15-75 XLM| DW
        DW -->|Shift Completion: Settle Loan| SC
        SC -->|Principal + Dynamic Risk Yield| AW["🏢 Coop Admin Wallet"]
        SC -->|Dynamic Protocol Maintenance| PW["⚙️ Platform Treasury"]
        SC -->|Update On-Chain Credit Reputation| REP["⭐ Driver Reputation: Bronze ➔ Silver ➔ Gold"]
    end

    W --> D
    W --> C
```

---

## 3. 🚶 Commuter Transit & Beacon Journey

```mermaid
flowchart LR
    A["1. 🚶 Passkey or Fast-Pass Signup"] -->|Auto-Generated Wallet| B["2. 📡 Radar Discovery & Waiting Beacon"]
    B -->|Haversine Proximity Filter| C["3. 🛺 Select Driver or Beacon Pickup"]
    C -->|Choose ₱15 / ₱25 / ₱50 Preset or Offline QR| D["4. ⚡ Instant Payment: Stellar XLM"]
    D -->|Sub-second Ledger Settlement| E["5. 🧾 Digital Receipt: StellarExpert Link"]
```

---

## 4. 📴 Offline-First Cryptographic Micropayment Pipeline

```mermaid
flowchart TD
    subgraph "Phase A: Zero-Connectivity Fare Generation"
        C1["🚶 Commuter App (Offline)"] -->|Signs Fare Amount + Nonce + Timestamp| C2["🔐 Local Ed25519 / HMAC Signature"]
        C2 -->|Encodes Payload| QR["📱 Dynamic Offline Voucher QR Code"]
    end

    subgraph "Phase B: Cryptographic Driver Scan & Receipt"
        QR -->|Driver Camera Scans QR| D1["🛺 Driver Scanner (Offline)"]
        D1 -->|Validates Signature & Nonce Uniqueness| D2["✅ Cryptographic Acceptance"]
        D2 -->|Stores in IndexedDB Queue| D3["💾 Local Offline Ledger"]
        D2 -->|Triggers Zero-Network Audio Alert| D4["🔊 Web Audio Payment Chime"]
    end

    subgraph "Phase C: Automatic Ledger Reconciliation"
        D3 -->|Internet Connectivity Detected| SYNC["🔄 OfflineSync Engine"]
        SYNC -->|Atomic Batch Broadcast| STL["⚡ Stellar Network Testnet"]
        STL -->|Settled & Confirmed| FIN["🧾 Final On-Chain Receipts Generated"]
    end
```

---

## 5. 🛺 Driver Operations & Tiered Micro-Credit Journey

```mermaid
flowchart TD
    D1["1. 🛺 Driver Registration & Vehicle Profile"] -->|TODA Coop Verification| D2["2. 🏛️ Request Fuel Micro-Advance"]
    D2 -->|Soroban Vault Validates Tier: 15-75 XLM| D3["3. ⛽ Purchase Morning Working Fuel"]
    D3 -->|Toggle 'Go On Transit'| D4["4. 📡 Broadcast Live GPS"]
    D4 -->|Commuter Pays Direct Fare| D5["5. 🔊 Instant Web Audio Dual-Chime"]
    D5 -->|Track Daily Net Revenue| D6["6. 📊 Real-Time Financial Health Tracker"]
    D6 -->|Evening Shift Completion| D7["7. 💳 Settle Loan on Soroban"]
    D7 -->|Discounts Fee & Advances Reputation| D8["8. ⭐ Tier Upgraded: Bronze ➔ Silver ➔ Gold"]
```

---

## 6. 🛺 Driver Pickup Dispatch & Approach State Machine

```mermaid
stateDiagram-v2
    [*] --> Idle : Driver Online
    Idle --> CommuterBeaconDetected : Beacon within range
    CommuterBeaconDetected --> Accepted : Driver accepts pickup
    Accepted --> Approaching : Driver en route live GPS
    Approaching --> Arrived : Driver within 25m of Commuter
    Arrived --> Completed : Commuter completes payment
    Accepted --> Cancelled : Commuter or Driver cancels
    Completed --> Idle : Return to patrol
    Cancelled --> Idle : Return to patrol
```

---

## 7. 🏢 Cooperative Admin Governance & Treasury Journey

```mermaid
flowchart TD
    A1["1. 🏢 Register TODA Coop & Reserve Fund"] -->|Deposit Initial Capital| A2["2. 🏛️ Capitalize Soroban Vault"]
    A2 -->|Review License & Vehicle Type| A3["3. 👥 Approve Member Drivers & Fleet Changes"]
    A3 -->|Real-Time Debt Monitoring| A4["4. 📊 Supervise Fleet Liquidity & Risk"]
    A4 -->|Driver Settles Loan| A5["5. 💰 Receive Dynamic Protocol Yield"]
    A5 -->|Weather / Route Advisories| A6["6. 📢 Broadcast FCM Priority Push Notices"]
```

---

## 8. 🛡️ Platform Superadmin System Governance

```mermaid
flowchart TD
    S1["1. 🛡️ Platform Superadmin Login"] -->|Multi-TODA Overview| S2["2. 🌐 Monitor System-Wide Liquidity & Volume"]
    S2 -->|Protocol Treasury Inflows: 0.1% to 0.2%| S3["3. ⚙️ Audit Fee Routing Invariants"]
    S3 -->|Soroban Contract Verification| S4["4. 🔍 Inspect Testnet Ledger & Reputation Logs"]
```

---

## 9. 📜 Soroban Dynamic Credit Tier & Atomic Fee Routing State Machine

```mermaid
flowchart TD
    subgraph "Driver Repayment Input"
        IN["Driver Repayment: Principal + Tier Discounted Fee"]
    end

    subgraph "Soroban Treasury Contract Execution"
        SC["MobilisTreasury: settle_loan"]
        TIER{"Evaluate Credit Tier"}
        SC --> TIER
        TIER -->|Tier 1 Bronze: 0-2 Loans| T1["Coop: 0.30% | Platform: 0.20% (0.50% total)"]
        TIER -->|Tier 2 Silver: 3-7 Loans| T2["Coop: 0.25% | Platform: 0.15% (0.40% total)"]
        TIER -->|Tier 3 Gold: 8+ Loans| T3["Coop: 0.20% | Platform: 0.10% (0.30% total)"]
    end

    subgraph "Atomic Ledger Settlement Output"
        PR["🏛️ Principal + Coop Yield: Coop Admin Wallet"]
        PW["⚙️ Platform Maintenance: Platform Treasury"]
        REP["⭐ Reputation State: +1 Repayment & Upgrade Tier"]
    end

    T1 & T2 & T3 -->|Atomic Transfer| PR
    T1 & T2 & T3 -->|Atomic Transfer| PW
    T1 & T2 & T3 -->|State Write| REP
```
