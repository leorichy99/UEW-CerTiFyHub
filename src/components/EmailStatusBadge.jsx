export default function EmailStatusBadge({ status }) {
  const styles = {
    QUEUED: "bg-slate-100 text-slate-700",
    SENT: "bg-emerald-50 text-emerald-700",
    DELIVERED: "bg-blue-50 text-blue-700",
    FAILED: "bg-red-50 text-red-700",
    BOUNCED: "bg-amber-50 text-amber-800",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${styles[status] || "bg-slate-100"}`}>
      {status || "—"}
    </span>
  );
}
