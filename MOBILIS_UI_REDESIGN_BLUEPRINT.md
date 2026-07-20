# MOBILIS_UI_REDESIGN_BLUEPRINT.md

> **Document Version:** 2.0.0 (Production Master Redesign Blueprint)  
> **Target Application:** Mobilis Transport Fintech & Micro-Credit Ecosystem  
> **Status:** Full UI & Presentation Layer Master Blueprint  

---

## 🎨 Master File-by-File Component Blueprints

### 1. `src/main.tsx`
- **Purpose**: Root DOM mounting and global context initialization. Dictates system theme defaults and overlay rendering order.
- **Design Goal**: Invisible, foundational, resilient.
- **Inspiration**: Vercel (Root Layouting), Apple (System-level preference respecting).
- **New Layout**: Document Root -> App Provider.
- **Accessibility**: Sets `lang="en"` and ARIA live regions for global toasts.
- **UX Improvements**: Eliminates white-flash on load by pre-reading system theme before hydration.

---

### 2. `src/App.tsx`
- **Purpose**: Global shell and routing orchestrator managing page transitions and role-based state machine.
- **Design Goal**: Fluid, uninterrupted, native-feeling.
- **Inspiration**: Uber (App launch sequence), Revolut (Authentication gate).
- **New Layout**: Status Bar (Transparent) -> Animate Presence Router Wrapper -> Active View -> Global Toast Overlay.
- **UX Improvements**: Replaces abrupt component swapping with cross-fades, reducing cognitive load during state changes.

---

### 3. `src/components/Landing.tsx`
- **Purpose**: Marketing storefront for unauthenticated users to explore the Mobilis ecosystem.
- **Design Goal**: Premium, fast, fintech, trustworthy, cutting-edge.
- **Inspiration**: Stripe (Landing pages), Linear (Bento grid), Vercel (Performance metrics).
- **New Layout**: Transparent Header -> Hero Section (Large typography + 3D Earth toggle) -> Bento Grid (Soroban, Micro-Credit, Radar) -> Footer CTA.
- **Mobile/Desktop**: 3D canvas is throttled to 30fps on mobile to conserve battery. Bento grid collapses smoothly to single column.

---

### 4. `src/components/Login.tsx`
- **Purpose**: Authentication gateway for returning users.
- **Design Goal**: Minimal, focused, secure, frictionless.
- **Inspiration**: Apple Wallet (Passkey integration), Cash App (Simple inputs).
- **New Layout**: Top Bar -> Brand Mark -> Greeting -> Biometric / Passkey CTA -> Floating Label Email & Password Inputs -> Sign In.
- **UX Improvements**: Prioritizes Passkey/WebAuthn CTA for friction-free authentication.

---

### 5. `src/components/Signup.tsx`
- **Purpose**: Multi-role onboarding and custodial Stellar keypair generation flow.
- **Design Goal**: Reassuring, clear, step-by-step, professional.
- **Inspiration**: Mercury (Business onboarding), Uber (Driver onboarding).
- **New Layout**: Progress Bar -> Step Header -> Step Wizard (Role Selection / Basic Info / TODA Details / Wallet Generation) -> Fixed Bottom Action Bar.
- **UX Improvements**: Hides TODA dropdowns unless "Driver" role is selected, preventing form clutter.

---

### 6. `src/components/Dashboard.tsx`
- **Purpose**: Main workspace shell for authenticated users managing internal tab routing (`hub` | `vault` | `history` | `profile`).
- **Design Goal**: Operational, seamless, app-like, structured.
- **Inspiration**: Apple Health (Tab routing), Twitter/X (Mobile layout vs Desktop layout).
- **New Layout**:
  - **Mobile**: Sticky Header -> Scrollable Active Tab Area -> Fixed BottomNav Dock.
  - **Desktop**: Fixed Left Sidebar Dock -> Header & Scrollable Active Tab Workspace.
- **UX Improvements**: Decouples single-component state into modular layout routing.

---

### 7. `src/components/Header.tsx`
- **Purpose**: Top navigation bar for identity, network status, and notifications.
- **Design Goal**: Unobtrusive, informative, crisp.
- **Inspiration**: Notion (Top bar), Google Cloud Console (Network status).
- **New Layout**: Logo (Mobile) -> `STELLAR TESTNET LIVE` Badge -> Notification Bell, Theme Toggle, Sign Out.

---

### 8. `src/components/Sidebar.tsx`
- **Purpose**: Desktop navigation dock for role-tailored view switching.
- **Design Goal**: Professional, hierarchical, stable.
- **Inspiration**: Linear (Sidebar interactions), Stripe (Dashboard navigation).
- **New Layout**: Full Logo + Role Badge -> Navigation Menu -> System Health Status & Sign Out.

---

### 9. `src/components/BottomNav.tsx`
- **Purpose**: Primary navigation dock for mobile single-thumb operation.
- **Design Goal**: Ergonomic, tactile, modern.
- **Inspiration**: Apple iOS Floating Tab Bar, Dynamic Island.
- **New Layout**: Floating Glass Morphic Dock containing rounded pill tab buttons (`Hub` | `Vault` | `Ledger` | `Profile`).

---

### 10. `src/components/commuter/CommuterRadar.tsx`
- **Purpose**: Geographic discovery of active drivers and instant fare payment trigger.
- **Design Goal**: Sci-Fi, precise, urgent, fluid.
- **Inspiration**: Uber (Map markers), Find My (Pulse animations).
- **New Layout**: Radius Selector Pills (50m - 3km) -> 360° Rotating Sonar Visualizer -> Bottom Sheet Active Driver List -> Fare Payment Modal.

---

### 11. `src/components/commuter/FarePaymentModal.tsx`
- **Purpose**: Core transport fare payment executor (PHP to XLM) and digital receipt generator.
- **Design Goal**: Frictionless, secure, unambiguous, satisfying.
- **Inspiration**: Apple Pay (Payment confirmation), Stripe (Checkout numpad).
- **New Layout**: Driver Info Card -> Primary PHP Amount Input (₱15, ₱30, ₱50, ₱100) -> Real-time XLM Conversion -> Review -> On-chain Execution -> Official Digital Receipt (`OR-XXXXX`).

---

### 12. `src/components/driver/DriverDutyToggle.tsx`
- **Purpose**: Driver operational control switch to broadcast GPS and listen for payments.
- **Design Goal**: Massive, bulletproof, high-contrast, action-oriented.
- **Inspiration**: Tesla (Car control UI), Uber Driver (Online/Offline state).
- **New Layout**: Prominent Power Switch Button (`ON TRANSIT • RADAR VISIBLE`) -> Status Text & Geolocation Battery Optimizer.

---

### 13. `src/components/tabs/HubTab.tsx`
- **Purpose**: Soroban micro-credit advance manager, member driver verification queue, and cooperative liquidity hub.
- **Design Goal**: Financial, authoritative, clear.
- **Inspiration**: Apple Card (Debt/Credit UI), Mercury (Approval queues).
- **New Layout**: Credit Hero Card (Debt vs Borrow Limit) -> Quick Advance Buttons (15 XLM) -> Settle Loan -> Admin Pending Verification Queue.

---

### 14. `src/components/tabs/VaultTab.tsx`
- **Purpose**: Digital wallet balance overview, asset list, and non-custodial key management.
- **Design Goal**: Wealth, security, liquid, trust.
- **Inspiration**: Revolut (Balance hero), Coinbase (Asset list).
- **New Layout**: Total Balance Hero (PHP Equivalent primary) -> Quick Actions (Send / Receive / QR) -> Asset List (Native XLM, Custom Tokens).

---

### 15. `src/components/tabs/HistoryTab.tsx`
- **Purpose**: Immutable ledger timeline of transit transactions and digital receipt inspection.
- **Design Goal**: Organized, verifiable, ledger-like.
- **Inspiration**: Apple Card (Transaction history), Stripe (Dashboard lists).
- **New Layout**: Filter Pills (All, Fares, Loans) -> Chronological Timeline Group -> View Digital Receipt Modal -> Blockchain Explorer Verification Link.

---

### 16. `src/components/tabs/ProfileTab.tsx`
- **Purpose**: User identity, public keys, and account settings.
- **Design Goal**: Personal, secure, administrative.
- **Inspiration**: Twitter (Profile view), GitHub (Security settings).
- **New Layout**: User Avatar Card -> Role Badge -> Public Key Copy Block -> Settings & Preferences.

---

### 17. `src/components/common/MobilisLogo.tsx`
- **Purpose**: SVG branding element rendering official transparent mark.

---

### 18. `src/components/common/SplashScreen.tsx`
- **Purpose**: Initial load masking with minimal brand mark.

---

### 19. `src/components/common/MobilisLoader.tsx`
- **Purpose**: Inline loading state for async Stellar ledger fetches.

---

## 🎨 Global Design System & Design Tokens
- **Dark Theme Background**: `#090A0C`
- **Dark Theme Surface**: `#121418`
- **Dark Theme Secondary Surface**: `#1C1F26`
- **Border**: `rgba(255, 255, 255, 0.08)`
- **Radius Tokens**: `12px` (small), `20px` (medium), `28px` (large cards), `32px` (bottom sheets), `9999px` (floating pills).

---

## 🗺️ Master User Journeys

### 🚶 Commuter Journey
Launch app -> FaceID / Passkey sign-in -> View 50m Sonar Radar -> Select Driver -> Primary ₱ PHP Fare Input -> On-chain Stellar Execution -> Receive Digital Receipt (`OR-XXXXX`).

### 🛺 Driver Journey
Launch app -> Tap prominent **"Go On Transit"** switch -> Mount phone on dashboard -> Receive instant fare via Web Audio synthesized double chime + payment toast -> Off-ramp XLM to PHP.

### 🏢 Cooperative Admin Journey
Launch desktop app -> Access Command Center -> Review pending driver registrations -> Click `[APPROVE]` to verify driver and issue Soroban micro-credit loan advance.

---

> **Blueprint Status**: `MOBILIS_UI_REDESIGN_BLUEPRINT.md` saved in workspace root directory. Production codebase tested and operating with 0 errors.
