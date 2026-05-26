import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Camera, Leaf, Bell, User } from 'lucide-react';

const ITEMS = [
  { path: '/', icon: Home, label: 'Home', testid: 'mob-nav-home' },
  { path: '/dashboard', icon: Leaf, label: 'Piante', testid: 'mob-nav-plants' },
  { path: '/scanner', icon: Camera, label: 'Scan', testid: 'mob-nav-scan', primary: true },
  { path: '/reminders', icon: Bell, label: 'Note', testid: 'mob-nav-reminders' },
  { path: '/profile', icon: User, label: 'Profilo', testid: 'mob-nav-profile' },
];

export default function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-[#E2E8E4] safe-area-bottom"
      data-testid="mobile-bottom-nav"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          if (item.primary) {
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center justify-center -mt-6"
                data-testid={item.testid}
              >
                <div className="w-14 h-14 rounded-full bg-[#3E6A4B] text-white flex items-center justify-center shadow-lg shadow-[#3E6A4B]/30">
                  <Icon size={26} strokeWidth={1.75} />
                </div>
                <span className="text-[10px] text-[#5C7061] mt-1 font-medium">{item.label}</span>
              </button>
            );
          }
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center justify-center gap-1 px-3 py-1 transition-colors"
              data-testid={item.testid}
            >
              <Icon size={22} strokeWidth={1.5} className={active ? 'text-[#3E6A4B]' : 'text-[#8A9F8E]'} />
              <span className={`text-[10px] ${active ? 'text-[#1A2E20] font-semibold' : 'text-[#8A9F8E]'}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
