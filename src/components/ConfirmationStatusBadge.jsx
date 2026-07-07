export default function ConfirmationStatusBadge({ status }) {
  const styles = {
    PENDING: "bg-slate-100 text-slate-700",
    CONFIRMED: "bg-emerald-50 text-emerald-700",
    DISPUTED: "bg-amber-50 text-amber-800",
    FLAGGED: "bg-red-50 text-red-700",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${styles[status] || "bg-slate-100"}`}>
      {status || "—"}
    </span>
  );
}
