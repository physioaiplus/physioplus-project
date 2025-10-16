import React from 'react';

interface HeaderProps {
  title: string;
  onBack?: () => void;
  children?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, onBack, children }) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-4">
        {onBack && (
          <button
            onClick={onBack}
            className="text-indigo-600 hover:text-indigo-700 mb-2"
          >
            ← Indietro
          </button>
        )}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {children}
        </div>
      </div>
    </header>
  );
};





