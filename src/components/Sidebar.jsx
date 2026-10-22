const NAV = [
  { id: 'workspaces', label: 'My timetables', icon: '☰' },
  { id: 'dashboard', label: 'Dashboard', icon: '▦' },
  { id: 'setup', label: 'Setup', icon: '✎' },
  { id: 'timetable', label: 'Timetable', icon: '▤' },
  { id: 'report', label: 'Report', icon: '◔' },
]

export default function Sidebar({ page, onNavigate, workspaceName, collegeName, setupErrorCount = 0 }) {
  return (
    <aside className="bg-slate-900 text-slate-100 md:w-60 md:min-h-screen md:flex-shrink-0 print:hidden">
      <div className="px-4 py-4 md:px-5 md:py-6">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-500 text-sm font-bold">S</span>
          <div>
            <p className="font-semibold leading-tight">Scheduling Optimizer</p>
            <p className="text-xs text-slate-400 leading-tight">Clash-free timetables</p>
          </div>
        </div>
        <button
          onClick={() => onNavigate('workspaces')}
          className="mt-4 hidden w-full rounded-lg border border-slate-700 px-3 py-2 text-left hover:border-slate-500 hover:bg-slate-800 md:block"
          title="Switch timetable"
        >
          <span className="block text-[11px] uppercase tracking-wide text-slate-400">Open timetable</span>
          <span className="block truncate text-sm font-medium text-white">{workspaceName}</span>
          {collegeName && <span className="block truncate text-xs text-slate-400">{collegeName}</span>}
          <span className="mt-1 block text-xs text-indigo-300">Switch ⇄</span>
        </button>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:px-3">
        {NAV.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              page === item.id ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
            {item.id === 'setup' && setupErrorCount > 0 && (
              <span className="ml-auto rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white" title="Fields to fix">
                {setupErrorCount}
              </span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  )
}
