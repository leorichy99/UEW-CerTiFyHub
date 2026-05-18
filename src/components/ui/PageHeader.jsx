import React from "react";
import { useAuth } from "../../context/AuthContext";
import NotificationBell from "../NotificationBell";
import GlobalSearch from "./GlobalSearch";

export default function PageHeader({ title, description, showSearch = false }) {
  const { user } = useAuth();
  const firstName = user?.profile?.first_name || user?.username || "Admin";

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-slate-500">
            {description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {showSearch && <GlobalSearch />}
        <NotificationBell />
      </div>
    </div>
  );
}
