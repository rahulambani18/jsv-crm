// src/components/Icons.jsx
// Lightweight inline SVG icons — no external icon dependency needed.

const base = { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }

export const IconGrid = (p) => (
  <svg {...base} {...p}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
)
export const IconUsers = (p) => (
  <svg {...base} {...p}><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17.5" cy="9" r="2.4"/><path d="M16 14.2c2.6.3 4.5 2.6 4.5 5.3"/></svg>
)
export const IconClock = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>
)
export const IconUserCheck = (p) => (
  <svg {...base} {...p}><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 11l2 2 3.5-3.5"/></svg>
)
export const IconFlask = (p) => (
  <svg {...base} {...p}><path d="M9 3h6"/><path d="M10 3v6.5L5 18a2 2 0 001.7 3h10.6a2 2 0 001.7-3l-5-8.5V3"/><path d="M8 16h8"/></svg>
)
export const IconFile = (p) => (
  <svg {...base} {...p}><path d="M7 3h7l4 4v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z"/><path d="M14 3v4h4"/><path d="M9 13h6M9 17h6"/></svg>
)
export const IconCart = (p) => (
  <svg {...base} {...p}><circle cx="9" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/><path d="M3 4h2l2.4 11.2a1.6 1.6 0 001.6 1.3h7.8a1.6 1.6 0 001.6-1.3L20.5 8H6.2"/></svg>
)
export const IconBox = (p) => (
  <svg {...base} {...p}><path d="M21 8.5L12 3 3 8.5 12 14l9-5.5z"/><path d="M3 8.5V16l9 5 9-5V8.5"/><path d="M12 14v7"/></svg>
)
export const IconLayers = (p) => (
  <svg {...base} {...p}><path d="M12 3l8.5 4.5L12 12 3.5 7.5 12 3z"/><path d="M3.5 12l8.5 4.5 8.5-4.5"/><path d="M3.5 16.5L12 21l8.5-4.5"/></svg>
)
export const IconChart = (p) => (
  <svg {...base} {...p}><path d="M4 20V10M11 20V4M18 20v-7"/><path d="M3 20h18"/></svg>
)
export const IconPlus = (p) => (
  <svg {...base} {...p}><path d="M12 5v14M5 12h14"/></svg>
)
export const IconSearch = (p) => (
  <svg {...base} {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
)
export const IconLogout = (p) => (
  <svg {...base} {...p}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
)
export const IconPanel = (p) => (
  <svg {...base} {...p}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></svg>
)
export const IconFlame = (p) => (
  <svg {...base} {...p}><path d="M12 22c4.4 0 7-2.9 7-6.8 0-3-1.7-4.7-3-6.5-1 1.5-1.5 2.6-1.5 2.6S15 8 12 4c0 3-1.2 4.3-3 6.4-1.6 1.9-3 3.6-3 6 0 3.7 2.6 5.6 6 5.6z"/></svg>
)
export const IconRupee = (p) => (
  <svg {...base} {...p}><path d="M6 4h12M6 9h12M6 4c4 0 6.5 1.5 6.5 4S10 12 6 12l8 8"/></svg>
)
export const IconTrend = (p) => (
  <svg {...base} {...p}><path d="M3 17l6-6 4 4 7-8"/><path d="M16 6h4v4"/></svg>
)
export const IconCamera = (p) => (
  <svg {...base} {...p}><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/><circle cx="12" cy="13" r="3.2"/></svg>
)
export const IconChevronDown = (p) => (
  <svg {...base} {...p}><path d="M6 9l6 6 6-6"/></svg>
)
export const IconX = (p) => (
  <svg {...base} {...p}><path d="M18 6L6 18M6 6l12 12"/></svg>
)
export const IconTruck = (p) => (
  <svg {...base} {...p}><path d="M2 7h11v9H2z"/><path d="M13 10h4l3 3v3h-7"/><circle cx="6" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></svg>
)
export const IconEdit = (p) => (
  <svg {...base} {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
)
export const IconTrash = (p) => (
  <svg {...base} {...p}><path d="M3 6h18"/><path d="M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2"/><path d="M19 6l-1 14a1 1 0 01-1 1H7a1 1 0 01-1-1L5 6"/></svg>
)
export const IconCheckSquare = (p) => (
  <svg {...base} {...p}><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
)
export const IconCalendar = (p) => (
  <svg {...base} {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
)
export const IconFolder = (p) => (
  <svg {...base} {...p}><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
)
export const IconReceipt = (p) => (
  <svg {...base} {...p}><path d="M4 2v20l3-2 3 2 3-2 3 2 3-2V2l-3 2-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>
)
export const IconCreditCard = (p) => (
  <svg {...base} {...p}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
)
export const IconDollarSign = (p) => (
  <svg {...base} {...p}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
)
export const IconShield = (p) => (
  <svg {...base} {...p}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/></svg>
)
export const IconChevronRight = (p) => (
  <svg {...base} {...p}><path d="M9 6l6 6-6 6"/></svg>
)
export const IconUpload = (p) => (
  <svg {...base} {...p}><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3"/></svg>
)
export const IconKey = (p) => (
  <svg {...base} {...p}><circle cx="8" cy="14" r="4"/><path d="M11 11l9-9"/><path d="M16 6l2.5 2.5"/><path d="M13 9l2 2"/></svg>
)
