import React, { useEffect, useState } from 'react';

export const LanguageView: React.FC = () => {
  const [lang, setLang] = useState('it');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const pref = localStorage.getItem('settings.pref');
    if (pref) {
      try { setLang(JSON.parse(pref).language || 'it'); } catch {}
    }
  }, []);

  const save = () => {
    const prev = localStorage.getItem('settings.pref');
    let obj: any = {};
    try { obj = prev ? JSON.parse(prev) : {}; } catch {}
    obj.language = lang;
    localStorage.setItem('settings.pref', JSON.stringify(obj));
    setMessage('Lingua salvata');
  };

  return (
    <div className="bg-white rounded-md shadow p-6">
      {message && <div className="mb-3 bg-green-50 text-green-800 border border-green-200 px-3 py-2 rounded">{message}</div>}
      <label className="block text-sm text-gray-700 mb-1">Seleziona lingua</label>
      <select className="border rounded px-3 py-2" value={lang} onChange={(e)=>setLang(e.target.value)}>
        <option value="it">Italiano</option>
        <option value="en">English</option>
      </select>
      <div className="mt-4">
        <button onClick={save} className="px-4 py-2 border rounded hover:bg-gray-50">Salva</button>
      </div>
    </div>
  );
};

