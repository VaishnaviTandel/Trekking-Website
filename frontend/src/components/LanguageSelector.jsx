import { useState } from "react";
import { useTranslation } from "react-i18next";

const languages = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "hi", label: "Hindi", flag: "🇮🇳" },
  { code: "kn", label: "Kannada", flag: "🇮🇳" }
];

export default function LanguageSelector() {

  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const currentLang =
    languages.find((l) => l.code === i18n.language) || languages[0];

  return (
    <div className="relative">

      {/* Button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-white border rounded-lg px-3 py-1 shadow hover:bg-gray-100 transition"
      >
        <span>{currentLang.flag}</span>
        <span>{currentLang.label}</span>
        <span className="text-xs">▼</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-white border rounded-lg shadow-lg overflow-hidden animate-fadeIn">

          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                i18n.changeLanguage(lang.code);
                setOpen(false);
              }}
              className="flex items-center gap-3 w-full px-3 py-2 hover:bg-gray-100 transition"
            >
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          ))}

        </div>
      )}
    </div>
  );
}