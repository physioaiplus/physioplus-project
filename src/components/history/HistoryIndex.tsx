import React from 'react';
import { CalendarClock, Users, ActivitySquare } from 'lucide-react';

type HistoryView = 'index' | 'visits' | 'patients';

export const HistoryIndex: React.FC<{ onOpen: (v: HistoryView) => void }>= ({ onOpen }) => {
  const Item: React.FC<{ icon: React.ComponentType<{ className?: string }>; title: string; subtitle: string; onClick: () => void }>
    = ({ icon: Icon, title, subtitle, onClick }) => (
    <button onClick={onClick} className="w-full flex items-center space-x-4 p-4 rounded hover:bg-gray-50">
      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
        <Icon className="w-5 h-5 text-gray-700" />
      </div>
      <div className="text-left">
        <div className="text-gray-900 font-medium">{title}</div>
        <div className="text-sm text-gray-600">{subtitle}</div>
      </div>
    </button>
  );

  const Group: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-2">{title}</h2>
      <div className="bg-white rounded-md border divide-y">
        {children}
      </div>
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">History</h1>
      <Group title="Attività">
        <Item icon={CalendarClock} title="Visite" subtitle="Storico visite effettuate" onClick={() => onOpen('visits')} />
        <Item icon={Users} title="Pazienti" subtitle="Pazienti creati/modificati" onClick={() => onOpen('patients')} />
      </Group>
      <Group title="Sistema">
        <Item icon={ActivitySquare} title="Log applicazione" subtitle="Eventi principali dell'app" onClick={() => {}} />
      </Group>
    </div>
  );
};

