// Each theme defines a primary brand color and a darker shade for hover/active
// states. Applied globally via CSS custom properties so every button, link,
// and header across the app (including pre-login pages) picks it up without
// per-component theme props.
export const THEMES = [
  { id: "blue", name: "Blue Theme", primary: "#2563eb", primaryDark: "#1d4ed8" },
  { id: "indigo", name: "Indigo Theme", primary: "#4f46e5", primaryDark: "#4338ca" },
  { id: "slate-blue", name: "Slate Blue Theme", primary: "#6366f1", primaryDark: "#4f46e5" },
  { id: "cyan", name: "Cyan Theme", primary: "#0891b2", primaryDark: "#0e7490" },
  { id: "green", name: "Green Theme", primary: "#16a34a", primaryDark: "#15803d" },
  { id: "dark-cyan", name: "Dark Cyan Theme", primary: "#0d9488", primaryDark: "#0f766e" },
  { id: "red", name: "Red Theme", primary: "#dc2626", primaryDark: "#b91c1c" },
  { id: "maroon", name: "Maroon Theme", primary: "#9f1239", primaryDark: "#881337" },
  { id: "pink", name: "Pink Theme", primary: "#db2777", primaryDark: "#be185d" },
  { id: "orange", name: "Orange Theme", primary: "#ea580c", primaryDark: "#c2410c" },
  { id: "slate", name: "Slate Theme", primary: "#475569", primaryDark: "#334155" },
  { id: "black", name: "Black Theme", primary: "#18181b", primaryDark: "#000000" },
];

export const DEFAULT_THEME_ID = "blue";

export function getTheme(id) {
  return THEMES.find((t) => t.id === id) || THEMES.find((t) => t.id === DEFAULT_THEME_ID);
}
