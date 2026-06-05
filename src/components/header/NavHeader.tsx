import React from 'react';
import { Users, Settings, History, LogOut, Calendar } from 'lucide-react';
import { ViewType } from '../../types';

interface NavHeaderProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onLogout: () => void;
  userEmail?: string;
}

const NAV_ITEMS = [
  { id: ViewType.DASHBOARD, label: 'Pazienti', icon: Users },
  { id: ViewType.HISTORY, label: 'Visite', icon: History },
  { id: ViewType.CALENDAR, label: 'Calendario', icon: Calendar }
] as const;

export const NavHeader: React.FC<NavHeaderProps> = ({
  currentView,
  onViewChange,
  onLogout,
  userEmail
}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  return (
    <header className="sticky top-0 z-50 bg-gray-50">
      <div className="mx-4 mt-[5px] mb-2 bg-gray-50">
        <div className="backdrop-blur-sm bg-gray-50 border border-[#007BFF] rounded-3xl shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-3 bg-gray-50">
            <div className="flex items-center justify-between gap-4 bg-gray-50">
              {/* Brand */}
              <div className="flex items-center gap-3 bg-gray-50">
                <img src="/assets/humotion-logo-full.svg" alt="Humotion" className="h-7 sm:h-8" />
              </div>

              {/* Center nav */}
              <nav className="hidden md:flex items-center gap-8 text-gray-700 bg-gray-50" >
                {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => onViewChange(id)}
                    className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${currentView === id
                      ? 'text-brand-blue'
                      : 'hover:text-gray-900'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </nav>

              {/* Right actions */}
              <div className="flex items-center gap-3 relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  onBlur={() => setTimeout(() => setMenuOpen(false), 100)}
                  className="inline-flex items-center gap-2 h-9 rounded-full px-3 bg-white text-gray-900 text-sm border border-black hover:bg-gray-50"
                >
                  <span className="hidden sm:block leading-none font-medium">{userEmail || 'Account'}</span>
                  <span className="w-7 h-7 rounded-full bg-brand-blue text-white flex items-center justify-center font-semibold">
                    {(userEmail || 'A').charAt(0).toUpperCase()}
                  </span>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-12 w-48 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-20">
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onViewChange(ViewType.SETTINGS);
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Settings className="w-4 h-4" />
                      Impostazioni
                    </button>
                    <div className="h-px bg-gray-100 my-1" />
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={onLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <LogOut className="w-4 h-4" />
                      Esci
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
