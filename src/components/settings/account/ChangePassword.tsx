import React, { useState } from 'react';
import { auth } from '../../../config/firebase';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';

export const ChangePassword: React.FC = () => {
  const user = auth.currentUser;
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async () => {
    if (!user) return;
    setSaving(true); setMessage(null); setError(null);
    try {
      if (!currentPwd || !newPwd) throw new Error('Inserisci le password');
      if (newPwd.length < 6) throw new Error('La nuova password deve avere almeno 6 caratteri');
      if (newPwd !== confirmPwd) throw new Error('Le password non coincidono');
      const cred = EmailAuthProvider.credential(user.email || '', currentPwd);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPwd);
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
      setMessage('Password aggiornata');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore aggiornamento password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-md shadow p-6">
      {message && <div className="mb-3 bg-green-50 text-green-800 border border-green-200 px-3 py-2 rounded">{message}</div>}
      {error && <div className="mb-3 bg-red-50 text-red-800 border border-red-200 px-3 py-2 rounded">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Password attuale</label>
          <input type="password" className="w-full border rounded px-3 py-2" value={currentPwd} onChange={(e)=>setCurrentPwd(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Nuova password</label>
          <input type="password" className="w-full border rounded px-3 py-2" value={newPwd} onChange={(e)=>setNewPwd(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Conferma nuova password</label>
          <input type="password" className="w-full border rounded px-3 py-2" value={confirmPwd} onChange={(e)=>setConfirmPwd(e.target.value)} />
        </div>
      </div>
      <div className="mt-4">
        <button disabled={saving} onClick={handleChange} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">
          {saving ? 'Aggiornamento...' : 'Aggiorna password'}
        </button>
      </div>
    </div>
  );
};

