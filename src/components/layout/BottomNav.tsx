import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/dashboard', label: 'Översikt', icon: '📊' },
  { to: '/map', label: 'Karta', icon: '🗺' },
  { to: '/inventory', label: 'Inventera', icon: '📋' },
  { to: '/work-session', label: 'Logga', icon: '⏱' },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around max-w-lg mx-auto">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              `flex flex-col items-center py-2 px-4 min-w-[64px] text-xs font-medium transition-colors ${
                isActive ? 'text-stone-900' : 'text-stone-400'
              }`
            }
          >
            <span className="text-xl mb-0.5">{t.icon}</span>
            {t.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
