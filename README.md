# 🚙⚡ Mobilis Pay — Level 4 Production MVP

> **A Soroban-Powered Automated Micro-Credit Treasury, Non-Custodial Liquidity Routing, and Digital Fare Payment Infrastructure for Transport Drivers and Commuters in the Philippines.**

<p align="center">
  <img width="100%" alt="Mobilis Dashboard" src="https://github.com/user-attachments/assets/a722e22f-fa77-4339-8dd6-945c1a89ad2a" />
</p>

---

## 📖 Problem & Solution

### The Real-World Problem
According to recent public transport research in the Philippines, **over 70% of tricycle, jeepney, and modernized transport operators remain unbanked** or underserved by formal financial institutions. Operating on daily micro-margins, drivers lack liquid capital for morning fuel costs and rely on predatory **"5-6" lending networks (200%+ APR)**. Meanwhile, daily transport commuters lack seamless, cashless micro-payment solutions suited for local transport routes.

### The Mobilis Pay Solution
Mobilis Pay introduces an end-to-end Web3 transport ecosystem powered by **Stellar and Soroban Smart Contracts**:
1. **Automated Micro-Credit Treasury:** TODAs and cooperatives manage decentralized liquidity for fuel advances.
2. **Direct Digital Fare Payment (Level 4 MVP):** Commuters discover nearby active drivers on a radar UI and pay fares instantly via Stellar native transactions.

---

## ✅ Level 4 Requirements & Implementation Checklist

- [x] **Commuter Onboarding & Wallet Provisioning:** Automated Stellar wallet generation for commuters requiring only Name, Email, and Password.
- [x] **Driver Presence (GPS Duty Tracking):** Drivers toggle "Go On Duty" to broadcast live GPS location to Firestore using `navigator.geolocation.watchPosition()` with battery movement thresholding.
- [x] **Nearby Driver Discovery (Radar UI):** Animated circular pulse radar, search radius selector (1, 3, 5, 10 km), distance sorting (Haversine formula), and empty/loading state fallbacks.
- [x] **Direct Stellar Fare Payments:** Commuters send direct Stellar XLM payments to drivers with instant PHP conversion and pre-flight balance checks.
- [x] **Transit Ledger (Ride History):** Real-time history page displaying fare receipts and contract transactions with direct links to StellarExpert testnet explorer.
- [x] **Driver Real-Time Alerts:** Web Audio API synthesized double chime (`AudioContext` / `OscillatorNode`), animated in-app toast banner, and native browser notifications on payment arrival.
- [x] **Firebase Cloud Messaging (FCM):** Background push notification service worker (`firebase-messaging-sw.js`) and token registration.
- [x] **Production Architecture:** Feature-first organization, strict TypeScript, responsive mobile-first + desktop layouts, dark/light theme toggle, and Firebase Analytics integration.

---

## 🚀 Live Links & Testnet Proofs

* **Live Platform Demo:** [https://mobilis-10f9a.web.app/](https://mobilis-10f9a.web.app/)
* **Testnet Contract Address:** `CAVFLXBG4MXGTGECI6WAZXMDNX2H3UWFTMNY4DHK2MR4YUYEEU5STBID`

### On-Chain Transaction Verification

| Action Log | Transaction Hash / Explorer Link | Ledger Verification |
| :--- | :--- | :--- |
| **Initial Funding** | [64d87c59f1d0...](https://stellar.expert/explorer/testnet/tx/64d87c59f1d037475199dfd8e56425cf7a9dc0b183ab6da6838b961eb1dcd481) | Confirmed on Stellar Ledger |
| **Loan Advance** | [fc0766df376f...](https://stellar.expert/explorer/testnet/tx/fc0766df376f13ca3b1e5e4583fe7c01738a244206d30269dd8912bb0ccd1d5a) | Confirmed on Soroban |
| **Debt Settlement** | [1ab1a0a09207...](https://stellar.expert/explorer/testnet/tx/1ab1a0a09207bbaefda4f8f696866c43eed23995904303d063cb52c0e13994d3) | Confirmed on Soroban |
| **Fare Payment** | [702d83033adc...](https://stellar.expert/explorer/testnet/tx/702d83033adcdc63375368ab6292b9e5e44a24fba01a8b206e542cf516faf331) | Direct Stellar XLM Transfer |

---

## 🗄️ Firestore Database Schema

```typescript
// users/{uid}
interface UserData {
  uid: string;
  email: string;
  role: 'driver' | 'admin' | 'superadmin' | 'commuter';
  status: 'pending' | 'approved' | 'rejected';
  publicKey: string;
  secret: string;
  fullName?: string;
  plateNumber?: string;
  todaAffiliation?: string;
  fcmToken?: string;
}

// driver_locations/{driverUid}
interface DriverLocationDoc {
  uid: string;
  publicKey: string;
  driverName: string;
  plateNumber: string;
  todaAffiliation: string;
  lat: number;
  lng: number;
  active: boolean;
  updatedAt: string;
}

// fare_transactions/{autoId}
interface FareTransaction {
  txHash: string;
  driverId: string;
  driverName: string;
  driverPublicKey: string;
  commuterId: string;
  commuterName: string;
  commuterPublicKey: string;
  amount: string;
  amountPhp: string;
  timestamp: string;
  status: 'completed';
  type: 'fare_payment';
}
```

---

## 💻 Local Development & Testing Instructions

### Prerequisites
* **Node.js & npm** (v18+)
* **Rust Toolchain & Soroban CLI** (for contract verification)

### 1. Frontend System Initialization
```bash
cd mobilis-frontend
npm install

# Copy environment variables template
cp .env.example .env

# Start local Vite development server
npm run dev
```

### 2. Verify Production Build & TypeScript Types
```bash
# Run TypeScript compilation & Vite production build
npm run build
```

---

## 🔒 Security & Performance Guardrails

- **Zero MP3 Audio Assets:** Web Audio API (`AudioContext` / `OscillatorNode`) synthesizes dual-tone chime locally with zero network overhead.
- **Battery & GPS Movement Thresholding:** Geolocation updates are published only when driver position shifts > 10 meters or after 30 seconds to conserve mobile battery.
- **Pre-Flight Asset Safety:** Pre-flight balance checks verify available XLM on Horizon before signing payment operations.
