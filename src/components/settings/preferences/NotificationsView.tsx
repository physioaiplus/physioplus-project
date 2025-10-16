import React, { useEffect, useState } from 'react';

export const NotificationsView: React.FC = () => {
  const [enabled, setEnabled] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const pref = localStorage.getItem('settings.pref');
    if (pref) {
      try { setEnabled(!!JSON.parse(pref).notifications); } catch {}
    }
  }, []);

  const save = () => {
    const prev = localStorage.getItem('settings.pref');
    let obj: any = {};
    try { obj = prev ? JSON.parse(prev) : {}; } catch {}
    obj.notifications = enabled;
    localStorage.setItem('settings.pref', JSON.stringify(obj));
    setMessage('Impostazioni notifica salvate');
  };

  return (
    <div className="bg-white rounded-md shadow p-6">
      {message && <div className="mb-3 bg-green-50 text-green-800 border border-green-200 px-3 py-2 rounded">{message}</div>}
      <label className="inline-flex items-center space-x-2">
        <input type="checkbox" checked={enabled} onChange={(e)=>setEnabled(e.target.checked)} />
        <span>Abilita notifiche</span>
      </label>
      <div className="mt-4">
        <button onClick={save} className="px-4 py-2 border rounded hover:bg-gray-50">Salva</button>
      </div>
    </div>
  );
};

