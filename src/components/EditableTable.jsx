import { Fragment } from 'react'

/**
 * One table component reused for rooms, teachers, sections and assignments.
 *
 * columns: [{ key, label, type: 'text' | 'number' | 'select' | 'custom', options: [{value, label}],
 *             placeholder, min, max, width, disabled(row), render(row, onRowChange) }]
 * errors:  { rowId: { key: message } } shown under the matching cell
 * renderExpanded(row): optional extra full-width content under a row (e.g. availability grid)
 */
export default function EditableTable({ columns, rows, errors = {}, onRowChange, onDelete, onAdd, addLabel = 'Add row', emptyText, renderExpanded }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="px-3 py-2 font-medium" style={{ width: c.width }}>
                  {c.label}
                </th>
              ))}
              <th className="w-12 px-3 py-2">
                <span className="sr-only">Delete</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-6 text-center text-slate-500">
                  {emptyText || 'Nothing here yet.'}
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const rowErrors = errors[row.id] || {}
              const expanded = renderExpanded?.(row)
              return (
                <Fragment key={row.id}>
                  <tr className="align-top">
                    {columns.map((c) => (
                      <td key={c.key} className="px-3 py-2">
                        <Cell column={c} row={row} error={rowErrors[c.key]} onRowChange={onRowChange} />
                        {rowErrors[c.key] && <p className="mt-1 text-xs text-red-600">{rowErrors[c.key]}</p>}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => onDelete(row)}
                        className="rounded-md px-2 py-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        aria-label="Delete row"
                        title="Delete row"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                  {expanded && (
                    <tr>
                      <td colSpan={columns.length + 1} className="bg-slate-50 px-3 py-3">
                        {expanded}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-slate-100 px-3 py-2">
        <button onClick={onAdd} className="rounded-md px-2 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50">
          + {addLabel}
        </button>
      </div>
    </div>
  )
}

function Cell({ column: c, row, error, onRowChange }) {
  const base = `w-full rounded-md border bg-white px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-100 disabled:text-slate-400 ${
    error ? 'border-red-400' : 'border-slate-300 focus:border-indigo-400'
  }`
  const disabled = c.disabled?.(row) ?? false
  const set = (value) => onRowChange({ ...row, [c.key]: value })

  if (c.type === 'custom') return c.render(row, onRowChange)
  if (c.type === 'select') {
    return (
      <select className={base} value={row[c.key] ?? ''} disabled={disabled} onChange={(e) => set(e.target.value)} aria-label={c.label}>
        {!c.options.some((o) => o.value === row[c.key]) && <option value="">Choose…</option>}
        {c.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    )
  }
  if (c.type === 'number') {
    return (
      <input
        type="number"
        className={base}
        value={row[c.key] ?? ''}
        min={c.min}
        max={c.max}
        placeholder={c.placeholder}
        disabled={disabled}
        aria-label={c.label}
        onChange={(e) => set(e.target.value === '' ? '' : Number(e.target.value))}
      />
    )
  }
  return <input type="text" className={base} value={row[c.key] ?? ''} placeholder={c.placeholder} aria-label={c.label} onChange={(e) => set(e.target.value)} />
}
