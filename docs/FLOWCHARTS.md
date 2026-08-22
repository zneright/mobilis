# 📊 Mobilis Architecture & Role-Based Flowcharts

> Comprehensive system, role-by-role user journeys, and Soroban smart contract state flowcharts for **Mobilis**.

---

## 🧭 Table of Contents
1. [MVP Core System Loop](#1-mvp-core-system-loop)
2. [Commuter Transit Journey](#2-commuter-transit-journey)
3. [Driver Operations & Micro-Credit Journey](#3-driver-operations--micro-credit-journey)
4. [Cooperative Admin Governance & Treasury Journey](#4-cooperative-admin-governance--treasury-journey)
5. [Soroban Smart Contract & Atomic Fee Routing State Machine](#5-soroban-smart-contract--atomic-fee-routing-state-machine)

---

## 1. 🚀 MVP Core System Loop

```mermaid
flowchart TB
    subgraph "1. Fast-Pass Onboarding"
        U["User"] -->|1-Click Provisioning| W["Auto-Generate ED25519 Wallet & Fund via Friendbot"]
    end

    subgraph "2. Live Transit Discovery & Micropayments"
        D["🛺 Driver 'Goes On Transit'"] -->|Broadcasts Real-Time GPS| FS[("🔥 Firestore DB")]
        C["🚶 Commuter Radar"] -->|Haversine Radial Discovery| FS
        C -->|1-Tap Preset: ₱15 / ₱25 / ₱50| S["⚡ Direct Stellar XLM Payment"]
        S -->|Sub-Second Ledger Settlement| DW["👛 Driver Wallet"]
        DW -->|Zero-Network Synthesizer| CH["🔊 Web Audio Dual-Chime Alert"]
    end

    subgraph "3. Soroban Micro-Credit Treasury"
        DW -->|Request 10-25 XLM Fuel Advance| SC["🏛️ Soroban Treasury Contract"]
        SC -->|Disburse Principal| DW
        DW -->|Shift Completion: Settle Loan| SC
        SC -->|Principal + 0.3% Risk Yield| AW["🏢 Coop Admin Wallet"]
        SC -->|0.2% Protocol Maintenance Fee| PW["⚙️ Platform Treasury"]
    end

    W --> D
    W --> C
```

---

## 2. 🚶 Commuter Transit Journey

```mermaid
flowchart LR
    A["1. 🚶 Fast-Pass Signup (Name, Email, Password)"] -->|Auto-Generated Wallet| B["2. 📡 Radar Discovery (Live Map & Filters)"]
    B -->|Haversine Proximity Filter| C["3. 🛺 Select Driver (TODA Fleet & Vehicle)"]
    C -->|Choose ₱15 / ₱25 / ₱50 Preset| D["4. ⚡ Instant Payment (Stellar XLM)"]
    D -->|3-5s Ledger Settlement| E["5. 🧾 Digital Receipt (StellarExpert Link)"]
```

---

## 3. 🛺 Driver Operations & Micro-Credit Journey

```mermaid
flowchart TD
    D1["1. 🛺 Driver Registration"] -->|Verify TODA Affiliation| D2["2. 🏛️ Request Fuel Advance"]
    D2 -->|Soroban Vault Disburses 10-25 XLM| D3["3. ⛽ Purchase Morning Fuel"]
    D3 -->|Toggle 'Go On Transit'| D4["4. 📡 Broadcast Live GPS Coordinates"]
    D4 -->|Commuter Pays Direct Fare| D5["5. 🔊 Web Audio Chime Alert"]
    D5 -->|Track Daily Net Revenue| D6["6. 📊 Real-Time Shift Tracker"]
    D6 -->|Evening Shift Completion| D7["7. 💳 Settle Loan on Soroban"]
    D7 -->|Single Atomic Transaction| D8["8. ✅ Debt Cleared & Net Income Retained"]
```

---

## 4. 🏢 Cooperative Admin Governance & Treasury Journey

```mermaid
flowchart TD
    A1["1. 🏢 Register TODA Coop"] -->|Deposit Reserve Capital| A2["2. 🏛️ Capitalize Soroban Vault"]
    A2 -->|Review License & Plate No.| A3["3. 👥 Approve Member Drivers"]
    A3 -->|Real-Time Debt Monitoring| A4["4. 📊 Supervise Fleet Liquidity"]
    A4 -->|Driver Settles Loan| A5["5. 💰 Receive 0.3% Protocol Yield"]
    A5 -->|Weather / Route Advisories| A6["6. 📢 Broadcast Priority Notices"]
```

---

## 5. 📜 Soroban Smart Contract & Atomic Fee Routing State Machine

```mermaid
flowchart TD
    subgraph "Driver Repayment Input"
        IN["Driver Repayment: Principal + 0.5% Total Fee"]
    end

    subgraph "Soroban Treasury Contract Execution"
        SC["MobilisTreasury: settle_loan"]
    end

    subgraph "Atomic Ledger Settlement Output"
        PR["🏛️ 100.0 XLM: Cooperative Treasury Pool (Principal Replenished)"]
        CA["🏢 0.30 XLM: Coop Admin Personal Wallet (0.3% Risk Margin)"]
        PW["⚙️ 0.20 XLM: Mobilis Platform Treasury (0.2% Maintenance)"]
    end

    IN --> SC
    SC -->|1. Transfer Principal| PR
    SC -->|2. Transfer Coop Share| CA
    SC -->|3. Transfer Platform Share| PW
```
