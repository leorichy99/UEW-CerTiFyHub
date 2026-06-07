import { useState, useMemo } from "react";

export default function useSort(items, { defaultKey = null, defaultDirection = "asc" } = {}) {
  const [sortConfig, setSortConfig] = useState(
    defaultKey ? { key: defaultKey, direction: defaultDirection } : null
  );

  const sortedItems = useMemo(() => {
    if (!sortConfig) return items;
    const { key, direction } = sortConfig;
    const dir = direction === "asc" ? 1 : -1;

    return [...items].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1 * dir;
      if (bVal == null) return -1 * dir;

      if (typeof aVal === "string" && typeof bVal === "string") {
        return aVal.localeCompare(bVal) * dir;
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return (aVal - bVal) * dir;
      }

      return String(aVal).localeCompare(String(bVal)) * dir;
    });
  }, [items, sortConfig]);

  function toggleSort(key) {
    setSortConfig((current) => {
      if (!current || current.key !== key) {
        return { key, direction: "asc" };
      }
      if (current.direction === "asc") {
        return { key, direction: "desc" };
      }
      return null;
    });
  }

  function getSortDirection(key) {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction;
  }

  return { sortedItems, toggleSort, getSortDirection, sortConfig };
}
