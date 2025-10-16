import React from 'react';
import { Users, Settings, History, Camera, LogOut } from 'lucide-react';
import { ViewType } from '../../types';

interface NavHeaderProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onLogout: () => void;
  userEmail?: string;
}

const NAV_ITEMS = [
  { id: ViewType.DASHBOARD, label: 'Pazienti', icon: Users },
  { id: ViewType.HISTORY, label: 'Storico', icon: History },
  { id: ViewType.SETTINGS, label: 'Impostazioni', icon: Settings }
] as const;

export const NavHeader: React.FC<NavHeaderProps> = ({
  currentView,
  onViewChange,
  onLogout,
  userEmail
}) => {
  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Camera className="w-8 h-8 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">Human+™</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{userEmail || 'Operatore'}</span>
            <button
              onClick={onLogout}
              className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Esci</span>
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-8">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => onViewChange(id)}
                className={`flex items-center space-x-2 py-4 border-b-2 ${
                  currentView === id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>
    </>
  );
};





