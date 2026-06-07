export const CANVAS_PRESETS = [
  { id: "a4_portrait", label: "Canvas: A4 Portrait", width: 595, height: 842 },
  { id: "a4_landscape", label: "Canvas: A4 Landscape", width: 842, height: 595 },
];

// Uniform margin in points (72 DPI). 72pt = 25.4mm = 1 inch.
export const PAGE_MARGIN = 72;

export const DYNAMIC_FIELDS = [
  { name: "student_name", label: "Student Name" },
  { name: "program", label: "Program" },
  { name: "date", label: "Date" },
  { name: "degree", label: "Degree" },
  { name: "honors", label: "Honors" },
  { name: "cert_no", label: "Certificate No." },
];

// Bundled certificate fonts — these are served from public/fonts/ via @font-face
// rules in index.css and registered with ReportLab on the backend.
export const BUNDLED_FONTS = [
  { family: "Baskervville", category: "Serif" },
  { family: "EB Garamond", category: "Serif" },
  { family: "Times New Roman", category: "Serif" },
  { family: "Dancing Script", category: "Script" },
  { family: "William Duke", category: "Script" },
  { family: "Blackadder ITC", category: "Script" },
  { family: "ITC Zapf Chancery", category: "Script" },
  { family: "Helvetica", category: "Sans-serif" },
  { family: "Roboto", category: "Sans-serif" },
];

export const TOOLS = [
  { id: "select", label: "Move", shortcut: "V" },
  { id: "text", label: "Text", shortcut: "T" },
  { id: "rect", label: "Rectangle", shortcut: "R" },
  { id: "ellipse", label: "Ellipse", shortcut: "E" },
  { id: "line", label: "Line", shortcut: "L" },
  { id: "eyedropper", label: "Eyedropper", shortcut: "I" },
  { id: "pan", label: "Hand", shortcut: "Space" },
  { id: "zoom", label: "Zoom", shortcut: "Z" },
];

export const DEFAULT_BACKGROUND = {
  kind: "solid",
  color: "#ffffff",
  gradient: {
    type: "linear",
    angle: 90,
    stops: [
      { color: "#ffffff", pos: 0 },
      { color: "#ffffff", pos: 1 },
    ],
  },
  pattern: { enabled: false, src: "", opacity: 0.18, scale: 1 },
};

// Dark theme color tokens (Photoshop-inspired)
export const THEME = {
  bg: "#2b2b2b",
  bgPanel: "#3c3c3c",
  bgCanvas: "#535353",
  bgInput: "#4a4a4a",
  bgHover: "#505050",
  bgActive: "#4a90d9",
  border: "#1a1a1a",
  borderLight: "#555555",
  text: "#cccccc",
  textMuted: "#999999",
  textBright: "#ffffff",
  accent: "#4a90d9",
  accentHover: "#5a9fe6",
  danger: "#e06060",
};
