import React, { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  // Toggle search with / key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "/" && !isOpen) {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition w-64"
      >
        <Search size={16} />
        <span className="text-sm">Search...</span>
        <kbd className="ml-auto text-xs bg-slate-200 px-1.5 py-0.5 rounded text-slate-500">/</kbd>
      </button>
    );
  }

  return (
    <div className="relative w-96">
      <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-lg">
        <Search size={16} className="text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search certificates, students, templates..."
          className="flex-1 text-sm outline-none text-slate-700 placeholder:text-slate-400"
        />
        <button
          onClick={() => {
            setIsOpen(false);
            setQuery("");
          }}
          className="text-slate-400 hover:text-slate-600 transition"
        >
          <X size={16} />
        </button>
      </div>
      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg p-4 z-50">
        <p className="text-xs text-slate-400">Press <kbd className="bg-slate-100 px-1 rounded">Enter</kbd> to search, <kbd className="bg-slate-100 px-1 rounded">Esc</kbd> to close</p>
      </div>
    </div>
  );
}
