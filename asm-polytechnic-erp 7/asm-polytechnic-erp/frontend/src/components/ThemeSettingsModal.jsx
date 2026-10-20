import { useState } from "react";
import { useTheme } from "../context/ThemeContext";

export default function ThemeSettingsModal({ onClose }) {
  const { themeId, setThemeId, themes } = useTheme();
  const [selected, setSelected] = useState(themeId);

  function handleApply() {
    setThemeId(selected);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full">
        <h2 className="text-lg font-semibold text-slate-800">Settings & Preferences</h2>
        <p className="text-sm text-slate-500 mb-4">Choose the color theme for your ERP portal.</p>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {themes.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelected(t.id)}
              className={`rounded-md border p-2 text-left ${
                selected === t.id ? "border-2" : "border-slate-200"
              }`}
              style={selected === t.id ? { borderColor: t.primary } : undefined}
            >
              <div className="h-2 rounded-full mb-1" style={{ backgroundColor: t.primary }} />
              <div className="h-1 rounded-full mb-2 w-2/3" style={{ backgroundColor: t.primaryDark }} />
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span
                  className="inline-block w-3 h-3 rounded-full border"
                  style={{
                    borderColor: selected === t.id ? t.primary : "#cbd5e1",
                    backgroundColor: selected === t.id ? t.primary : "transparent",
                  }}
                />
                {t.name}
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="border border-slate-300 rounded-md px-4 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="text-white rounded-md px-4 py-1.5 text-sm font-medium"
            style={{ backgroundColor: "var(--brand-primary)" }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
