import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

const Table = ({ 
  children, 
  className = '', 
  showZebra = true,
  ...props 
}) => {
  return (
    <div className="overflow-x-auto border" style={{ borderColor: 'var(--color-table-border)' }}>
      <table 
        className={`min-w-full text-sm ${className}`}
        {...props}
      >
        {children}
      </table>
    </div>
  );
};

const TableHead = ({ children, className = '', ...props }) => {
  return (
    <thead 
      className={`text-xs font-semibold uppercase tracking-wider sticky top-0 z-[1] ${className}`}
      style={{ backgroundColor: 'var(--color-table-head-bg)', color: 'var(--color-table-head-text)' }}
      {...props}
    >
      {children}
    </thead>
  );
};

const TableBody = ({ children, className = '', showZebra = true, ...props }) => {
  return (
    <tbody 
      className={`divide-y ${className}`}
      style={{ borderColor: 'var(--color-table-border)' }}
      {...props}
    >
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child) && child.type === TableRow) {
          return React.cloneElement(child, {
            isAlt: showZebra ? index % 2 === 1 : false,
          });
        }
        return child;
      })}
    </tbody>
  );
};

const TableRow = ({ children, className = '', isAlt = false, ...props }) => {
  return (
    <tr
      className={`transition-colors hover:bg-slate-100 ${className}`}
      style={{ 
        backgroundColor: isAlt ? 'var(--color-table-row-alt)' : 'var(--color-table-row-default)'
      }}
      {...props}
    >
      {children}
    </tr>
  );
};

const TableHeaderCell = ({ children, className = '', onSort, sortDirection, ...props }) => {
  const isSortable = !!onSort;
  const SortIcon =
    sortDirection === "asc" ? ArrowUp :
    sortDirection === "desc" ? ArrowDown :
    ArrowUpDown;

  return (
    <th
      scope="col"
      aria-sort={sortDirection || "none"}
      className={`px-4 py-3 text-left font-semibold ${
        isSortable ? "cursor-pointer select-none hover:bg-slate-100/50" : ""
      } ${className}`}
      onClick={isSortable ? onSort : undefined}
      {...props}
    >
      <div className="flex items-center gap-1">
        {children}
        {isSortable && (
          <SortIcon size={14} className={sortDirection ? "text-blue-600" : "text-slate-300"} />
        )}
      </div>
    </th>
  );
};

const TableCell = ({ children, className = '', dataLabel, ...props }) => {
  return (
    <td
      className={`px-4 py-3 ${className}`}
      data-label={dataLabel}
      {...props}
    >
      {children}
    </td>
  );
};

Table.Head = TableHead;
Table.Body = TableBody;
Table.Row = TableRow;
Table.HeaderCell = TableHeaderCell;
Table.Cell = TableCell;

export default Table;
