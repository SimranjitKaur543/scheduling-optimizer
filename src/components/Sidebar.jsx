const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '▦' },
  { id: 'timetable', label: 'Timetable', icon: '▤' },
]

export default function Sidebar({ page, onNavigate, collegeName }) {
  return (
    <aside className="bg-slate-900 text-slate-100 md:w-60 md:min-h-screen md:flex-shrink-0">
      <div className="px-4 py-4 md:px-5 md:py-6">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-500 text-sm font-bold">S</span>
          <div>
            <p className="font-semibold leading-tight">Scheduling Optimizer</p>
            <p className="text-xs text-slate-400 leading-tight">Clash-free timetables</p>
          </div>
        </div>
        {collegeName && <p className="mt-4 hidden text-xs text-slate-400 md:block">{collegeName}</p>}
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
          </button>
        ))}
      </nav>
    </aside>
  )
}
