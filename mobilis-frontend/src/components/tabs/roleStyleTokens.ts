// ──────────────────────────────────────────────────────────────────────────────
// Mobilis — Hybrid Role Design Token Engine (with Role-Based Dark Mode)
// ──────────────────────────────────────────────────────────────────────────────
// Design Rules:
//   - Shell Background: Role-Based Dark Mode tinting (Cyber-Teal Dark for Driver,
//     Mint-Emerald Dark for Commuter, Midnight-Indigo Dark for Admin, Crimson-Rose Dark for Superadmin)
//   - Cards, Badges, Avatar Rings & Accents: Vivid TWO-TONE dual color combinations!
//   - CTA Buttons: Single-family shaded role gradient for maximum text contrast & legibility!
// ──────────────────────────────────────────────────────────────────────────────

type Role = string;

/* ── 1.  TWO-TONE DUAL-COLOR CARD  ─────────────────────────────────────────── */

export const cardRoleStyle = (role: Role): string => {
  switch (role) {
    case 'superadmin':
      return [
        'bg-gradient-to-br from-rose-500/10 via-white to-amber-500/5',
        'dark:from-[#1f0a12] dark:via-[#14080e] dark:to-[#180910]',
        'border border-rose-500/30 dark:border-rose-500/30',
        'shadow-[0_8px_30px_-4px_rgba(244,63,94,0.15)]',
        'transition-all duration-200',
      ].join(' ');

    case 'admin':
    case 'cooperative':
      return [
        'bg-gradient-to-br from-indigo-500/10 via-white to-purple-500/5',
        'dark:from-[#0d1024] dark:via-[#090b1a] dark:to-[#0a0d1d]',
        'border border-indigo-500/30 dark:border-indigo-500/30',
        'shadow-[0_8px_30px_-4px_rgba(99,102,241,0.15)]',
        'transition-all duration-200',
      ].join(' ');

    case 'driver':
      return [
        'bg-gradient-to-br from-cyan-500/10 via-white to-amber-500/5',
        'dark:from-[#061824] dark:via-[#080d16] dark:to-[#181206]',
        'border border-cyan-500/30 dark:border-cyan-500/30',
        'shadow-[0_8px_30px_-4px_rgba(6,182,212,0.15)]',
        'transition-all duration-200',
      ].join(' ');

    default: // commuter
      return [
        'bg-gradient-to-br from-emerald-500/10 via-white to-cyan-500/5',
        'dark:from-[#051c14] dark:via-[#071312] dark:to-[#061820]',
        'border border-emerald-500/30 dark:border-emerald-500/30',
        'shadow-[0_8px_30px_-4px_rgba(16,185,129,0.15)]',
        'transition-all duration-200',
      ].join(' ');
  }
};

/* ── 2.  TWO-TONE PILL BADGE  ────────────────────────────────────────────── */

export const rolePill = (role: Role): string => {
  switch (role) {
    case 'superadmin':
      return 'bg-gradient-to-r from-rose-500/15 to-amber-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30';
    case 'admin':
    case 'cooperative':
      return 'bg-gradient-to-r from-indigo-500/15 to-purple-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30';
    case 'driver':
      return 'bg-gradient-to-r from-cyan-500/15 to-amber-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30';
    default:
      return 'bg-gradient-to-r from-emerald-500/15 to-cyan-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30';
  }
};

/* ── 3.  CRISP ACCENT TEXT  ───────────────────────────────────────────────── */

export const roleAccentText = (role: Role): string => {
  switch (role) {
    case 'superadmin':
      return 'text-rose-600 dark:text-rose-400 font-bold';
    case 'admin':
    case 'cooperative':
      return 'text-indigo-600 dark:text-indigo-400 font-bold';
    case 'driver':
      return 'text-cyan-600 dark:text-cyan-400 font-bold';
    default:
      return 'text-emerald-600 dark:text-emerald-400 font-bold';
  }
};

/* ── 4.  SINGLE-FAMILY SHADED CTA BUTTON  ─────────────────────────────────── */

export const roleCtaBg = (role: Role): string => {
  switch (role) {
    case 'superadmin':
      return [
        'bg-gradient-to-r from-rose-600 to-rose-700',
        'hover:from-rose-500 hover:to-rose-600',
        'text-white font-extrabold',
        'shadow-[0_4px_16px_-2px_rgba(244,63,94,0.4)]',
        'active:scale-[0.98] transition-all duration-200',
      ].join(' ');

    case 'admin':
    case 'cooperative':
      return [
        'bg-gradient-to-r from-indigo-600 to-indigo-700',
        'hover:from-indigo-500 hover:to-indigo-600',
        'text-white font-extrabold',
        'shadow-[0_4px_16px_-2px_rgba(99,102,241,0.4)]',
        'active:scale-[0.98] transition-all duration-200',
      ].join(' ');

    case 'driver':
      return [
        'bg-gradient-to-r from-cyan-500 to-teal-600',
        'hover:from-cyan-400 hover:to-teal-500',
        'text-black font-extrabold',
        'shadow-[0_4px_16px_-2px_rgba(6,182,212,0.4)]',
        'active:scale-[0.98] transition-all duration-200',
      ].join(' ');

    default:
      return [
        'bg-gradient-to-r from-emerald-500 to-teal-600',
        'hover:from-emerald-400 hover:to-teal-500',
        'text-black font-extrabold',
        'shadow-[0_4px_16px_-2px_rgba(16,185,129,0.4)]',
        'active:scale-[0.98] transition-all duration-200',
      ].join(' ');
  }
};

/* ── 5.  TWO-TONE AVATAR GRADIENT  ────────────────────────────────────────── */

export const roleAvatarGradient = (role: Role): string => {
  switch (role) {
    case 'superadmin':
      return 'from-rose-500 via-orange-400 to-amber-400';
    case 'admin':
    case 'cooperative':
      return 'from-indigo-500 via-purple-500 to-violet-400';
    case 'driver':
      return 'from-cyan-400 via-amber-400 to-orange-400';
    default:
      return 'from-emerald-400 via-teal-400 to-cyan-400';
  }
};

/* ── 6.  TWO-TONE CARD BORDER ACCENT  ─────────────────────────────────────── */

export const roleCardBorder = (role: Role): string => {
  switch (role) {
    case 'superadmin':
      return 'border border-rose-500/30 dark:border-rose-500/30 shadow-sm';
    case 'admin':
    case 'cooperative':
      return 'border border-indigo-500/30 dark:border-indigo-500/30 shadow-sm';
    case 'driver':
      return 'border border-cyan-500/30 dark:border-cyan-500/30 shadow-sm';
    default:
      return 'border border-emerald-500/30 dark:border-emerald-500/30 shadow-sm';
  }
};

/* ── 7.  FOCUS / SELECTION RING  ──────────────────────────────────────────── */

export const roleGlowRing = (role: Role): string => {
  switch (role) {
    case 'superadmin':
      return 'ring-2 ring-rose-500/30';
    case 'admin':
    case 'cooperative':
      return 'ring-2 ring-indigo-500/30';
    case 'driver':
      return 'ring-2 ring-cyan-500/30';
    default:
      return 'ring-2 ring-emerald-500/30';
  }
};

/* ── 8.  ROLE DISPLAY NAME  ────────────────────────────────────────────────── */

export const roleDisplayName = (role: Role): string => {
  switch (role) {
    case 'superadmin': return 'Super Admin';
    case 'admin': return 'Cooperative Admin';
    case 'cooperative': return 'Cooperative';
    case 'driver': return 'Driver';
    default: return 'Commuter';
  }
};

/* ── 9.  ROLE-BASED APPLICATION SHELL BACKGROUND  ───────────────────────── */

export const roleShellBg = (role: Role): string => {
  switch (role) {
    case 'superadmin':
      return 'bg-slate-50 dark:bg-[#14050c] text-slate-900 dark:text-slate-100 transition-colors duration-300';
    case 'admin':
    case 'cooperative':
      return 'bg-slate-50 dark:bg-[#070a1a] text-slate-900 dark:text-slate-100 transition-colors duration-300';
    case 'driver':
      return 'bg-slate-50 dark:bg-[#041219] text-slate-900 dark:text-slate-100 transition-colors duration-300';
    default: // commuter
      return 'bg-slate-50 dark:bg-[#03140e] text-slate-900 dark:text-slate-100 transition-colors duration-300';
  }
};
