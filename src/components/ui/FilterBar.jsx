import { Search, RefreshCw } from "lucide-react";

/**
 * FilterBar — shared filter toolbar used across list pages.
 *
 * Props:
 *   searchValue      – current search string
 *   onSearchChange   – (value) => void
 *   searchPlaceholder – placeholder text for the search input
 *   searchAriaLabel  – aria-label for the search input
 *   filters          – array of { value, onChange, ariaLabel, options: [{ value, label }] }
 *   onRefresh        – optional () => void, shows refresh button
 *   refreshing       – boolean, spins the refresh icon
 *   actions          – optional ReactNode rendered at the end (e.g. export/add buttons)
 *   className        – optional wrapper class
 */
export default function FilterBar({
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search...",
  searchAriaLabel = "Search",
  filters = [],
  onRefresh,
  refreshing = false,
  actions,
  className = "",
}) {
  return (
    <div className={`flex flex-col lg:flex-row gap-4 items-center ${className}`}>
      {/* Search */}
      {onSearchChange && (
        <div className="relative flex-1 w-full">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label={searchAriaLabel}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 transition-all duration-200"
          />
        </div>
      )}

      {/* Filter selects */}
      {filters.map((filter, i) => (
        <select
          key={i}
          value={filter.value}
          onChange={(e) => filter.onChange(e.target.value)}
          aria-label={filter.ariaLabel}
          className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all duration-200"
        >
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}

      {/* Refresh + custom actions */}
      <div className="flex items-center gap-2">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh data"
            className="rounded-lg border border-slate-200 p-2.5 text-slate-500 shadow-sm transition-colors duration-200 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={18}
              className={refreshing ? "animate-spin" : ""}
            />
          </button>
        )}
        {actions}
      </div>
    </div>
  );
}
