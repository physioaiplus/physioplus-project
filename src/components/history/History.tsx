import React, { useState } from 'react';
import { Header } from '../header/Header';
import { HistoryIndex } from './HistoryIndex';
import { VisitsTable } from './VisitsTable';

type HistoryView = 'index' | 'visits' | 'patients';

export const History: React.FC<{ onBack?: () => void }>= ({ onBack }) => {
  const [view, setView] = useState<HistoryView>('index');

  const title = view === 'index' ? 'Storico' : (view === 'visits' ? 'Visite' : 'Pazienti');
  const goBack = () => {
    if (view === 'index') return onBack?.();
    setView('index');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title={title} onBack={goBack} />
      <main className="max-w-5xl mx-auto px-6 py-8">
        {view === 'index' && (
          <HistoryIndex onOpen={setView} />
        )}
        {view === 'visits' && (
          <VisitsTable />
        )}
        {view === 'patients' && (
          <div className="bg-white rounded-md shadow p-8 text-gray-700">Sezione in arrivo.</div>
        )}
      </main>
    </div>
  );
};

