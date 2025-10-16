import React from 'react';
import { User, Lock, Bell, Globe, Shield, FileText, HelpCircle, Mail, Info, RefreshCcw } from 'lucide-react';

type SettingsView = 'index' | 'account' | 'password' | 'notifications' | 'language' | 'privacy' | 'policy' | 'help' | 'contact' | 'about' | 'updates';

interface SettingsIndexProps {
  onOpen: (view: SettingsView) => void;
}

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

export const SettingsIndex: React.FC<SettingsIndexProps> = ({ onOpen }) => {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Settings</h1>

      <Group title="Account">
        <Item icon={User} title="Account Details" subtitle="Manage your account details" onClick={() => onOpen('account')} />
        <Item icon={Lock} title="Change Password" subtitle="Manage your password" onClick={() => onOpen('password')} />
      </Group>

      <Group title="Preferences">
        <Item icon={Bell} title="Notifications" subtitle="Manage your notification settings" onClick={() => onOpen('notifications')} />
        <Item icon={Globe} title="Language" subtitle="Choose your preferred language" onClick={() => onOpen('language')} />
      </Group>

      <Group title="Privacy">
        <Item icon={Shield} title="Privacy Settings" subtitle="Manage your privacy settings" onClick={() => onOpen('privacy')} />
        <Item icon={FileText} title="Privacy Policy" subtitle="Read our privacy policy" onClick={() => onOpen('policy')} />
      </Group>

      <Group title="Support">
        <Item icon={HelpCircle} title="Help & Support" subtitle="Get help and support" onClick={() => onOpen('help')} />
        <Item icon={Mail} title="Contact Us" subtitle="Contact us for assistance" onClick={() => onOpen('contact')} />
      </Group>

      <Group title="About">
        <Item icon={Info} title="About PhysioAI" subtitle="Learn more about PhysioAI" onClick={() => onOpen('about')} />
        <Item icon={RefreshCcw} title="Check for Updates" subtitle="Check for app updates" onClick={() => onOpen('updates')} />
      </Group>
    </div>
  );
};

