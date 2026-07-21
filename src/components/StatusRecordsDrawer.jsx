import { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useBatchRecords } from "../hooks/registry/useBatches.js";
import Table from "./ui/Table";
import ConfirmationStatusBadge from "./ConfirmationStatusBadge.jsx";
import EmailStatusBadge from "./EmailStatusBadge.jsx";

const PAGE_SIZE = 50;

function readArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  return [];
}

export default function StatusRecordsDrawer({
  open,
  onClose,
  title,
  batchId,
  filter = {},
  columns = [],
  renderAction = null,
  headerMessage = null,
}) {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [visible, setVisible] = useState(false);
  const [animate, setAnimate] = useState(false);
  const loadedRef = useRef(new Set());
  const sentinelRef = useRef(null);

  const recordsQuery = useBatchRecords(batchId, {
    page,
    page_size: PAGE_SIZE,
    ...filter,
  });

  const data = recordsQuery.data;
  const totalCount = data?.count ?? items.length;
  const hasNext = !!data?.next;
  const isFetching = recordsQuery._query.isFetching;

  // Reset accumulation when filter changes
  useEffect(() => {
    setItems([]);
    setPage(1);
    loadedRef.current = new Set();
  }, [JSON.stringify(filter)]);

  // Accumulate each page's results
  useEffect(() => {
    if (!data) return;
    const key = `${JSON.stringify(filter)}|${page}`;
    if (loadedRef.current.has(key)) return;
    loadedRef.current.add(key);
    const results = readArray(data);
    setItems((prev) => (page === 1 ? results : [...prev, ...results]));
  }, [data, page, JSON.stringify(filter)]);

  // Infinite scroll sentinel
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return undefined;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNext && !isFetching) {
          setPage((p) => p + 1);
        }
      },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNext, isFetching]);

  const initialLoading = isFetching && items.length === 0;

  // Animation state management
  useEffect(() => {
    if (open) {
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimate(true));
      });
    } else {
      setAnimate(false);
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Column renderers
  const renderCell = (record, columnKey) => {
    switch (columnKey) {
      case "index_number":
        return <span className="text-sm font-mono">{record.index_number}</span>;
      case "full_name":
        return <span className="text-sm">{record.full_name}</span>;
      case "institutional_email":
        return <span className="text-sm text-slate-600">{record.institutional_email}</span>;
      case "programme":
        return <span className="text-sm">{record.programme || "—"}</span>;
      case "class_of_degree":
        return <span className="text-sm">{record.class_of_degree || "—"}</span>;
      case "confirmation_status":
        return <ConfirmationStatusBadge status={record.confirmation_status} />;
      case "confirmation_email_status":
        return <EmailStatusBadge status={record.confirmation_email_status} />;
      case "issuance_status":
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
            record.issuance_status === "ISSUED" ? "bg-emerald-50 text-emerald-700" :
            record.issuance_status === "FAILED" ? "bg-red-50 text-red-700" :
            record.issuance_status === "QUEUED" ? "bg-amber-50 text-amber-700" :
            "bg-slate-50 text-slate-600"
          }`}>
            {record.issuance_status || "—"}
          </span>
        );
      case "issuance_error":
        return record.issuance_error ? (
          <span className="text-xs text-red-500 max-w-[200px] truncate" title={record.issuance_error}>
            {record.issuance_error}
          </span>
        ) : "—";
      case "dispute_type":
        return record.dispute_type ? (
          <span className="text-sm text-slate-700 capitalize">
            {record.dispute_type.replace(/_/g, ' ')}
          </span>
        ) : "—";
      default:
        return "—";
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 h-screen">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
          animate ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className={`absolute top-0 right-0 bottom-0 w-full max-w-3xl bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          animate ? "translate-x-0" : "translate-x-full"
        }`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Header message */}
        {headerMessage && (
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-sm text-slate-600">
            {headerMessage}
          </div>
        )}

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <Table>
            <Table.Head>
              <tr>
                {columns.map((col) => (
                  <Table.HeaderCell key={col.key}>{col.label}</Table.HeaderCell>
                ))}
                {renderAction && <Table.HeaderCell className="text-right">Action</Table.HeaderCell>}
              </tr>
            </Table.Head>
            <Table.Body>
              {initialLoading && (
                <tr><td colSpan={columns.length + (renderAction ? 1 : 0)} className="text-center py-8">
                  <Loader2 className="animate-spin inline text-slate-400" size={24} />
                </td></tr>
              )}
              {!initialLoading && items.length === 0 && (
                <tr><td colSpan={columns.length + (renderAction ? 1 : 0)} className="text-center py-8 text-slate-500">
                  No records match the filter.
                </td></tr>
              )}
              {items.map((r) => (
                <Table.Row key={r.id}>
                  {columns.map((col) => (
                    <Table.Cell key={col.key}>{renderCell(r, col.key)}</Table.Cell>
                  ))}
                  {renderAction && (
                    <Table.Cell className="text-right">
                      {renderAction(r)}
                    </Table.Cell>
                  )}
                </Table.Row>
              ))}
            </Table.Body>
          </Table>

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-px" />
          {hasNext && isFetching && items.length > 0 && (
            <div className="text-center py-3">
              <Loader2 className="animate-spin inline text-slate-400" size={18} />
            </div>
          )}
          {!hasNext && items.length > 0 && (
            <div className="text-center py-3 text-xs text-slate-400">
              All {totalCount} record{totalCount !== 1 ? "s" : ""} loaded
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
