import React, { useState } from 'react';
import { Header } from '../header/Header';
import { SettingsIndex } from './SettingsIndex';
import { AccountDetails } from './account/AccountDetails';
import { ChangePassword } from './account/ChangePassword';
import { NotificationsView } from './preferences/NotificationsView';
import { LanguageView } from './preferences/LanguageView';

type SettingsView = 'index' | 'account' | 'password' | 'notifications' | 'language' | 'privacy' | 'policy' | 'help' | 'contact' | 'about' | 'updates';

export const Settings: React.FC<{ onBack?: () => void }>= ({ onBack }) => {
  const [view, setView] = useState<SettingsView>('index');

  const title = (() => {
    switch (view) {
      case 'account': return 'Account Details';
      case 'password': return 'Change Password';
      case 'notifications': return 'Notifications';
      case 'language': return 'Language';
      default: return 'Impostazioni';
    }
  })();

  const goBack = () => {
    if (view === 'index') return onBack?.();
    setView('index');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title={title} onBack={goBack} />
      <main className="max-w-3xl mx-auto px-6 py-8">
        {view === 'index' && (
          <SettingsIndex onOpen={setView} />
        )}
        {view === 'account' && (
          <AccountDetails />
        )}
        {view === 'password' && (
          <ChangePassword />
        )}
        {view === 'notifications' && (
          <NotificationsView />
        )}
        {view === 'language' && (
          <LanguageView />
        )}
        {['privacy','policy','help','contact','about','updates'].includes(view) && (
          <div className="bg-white rounded-md shadow p-8 text-gray-700">
            Sezione in arrivo.
          </div>
        )}
      </main>
    </div>
  );
};
