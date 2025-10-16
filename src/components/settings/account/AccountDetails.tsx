import React, { useEffect, useMemo, useState } from 'react';
import { auth } from '../../../config/firebase';
import { updateEmail, updateProfile, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';

export const AccountDetails: React.FC = () => {
  const user = auth.currentUser;
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [email, setEmail] = useState('');
  const [emailPwd, setEmailPwd] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setPhotoURL(user.photoURL || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const canUpdateEmail = useMemo(() => email && user && email !== (user.email || ''), [email, user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true); setMessage(null); setError(null);
    try {
      await updateProfile(user, { displayName, photoURL: photoURL || null });
      if (canUpdateEmail) {
        if (!emailPwd) throw new Error('Per cambiare email inserisci la password attuale');
        const cred = EmailAuthProvider.credential(user.email || '', emailPwd);
        await reauthenticateWithCredential(user, cred);
        await updateEmail(user, email);
      }
      setMessage('Profilo aggiornato');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore aggiornamento profilo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-md shadow p-6">
      {message && <div className="mb-3 bg-green-50 text-green-800 border border-green-200 px-3 py-2 rounded">{message}</div>}
      {error && <div className="mb-3 bg-red-50 text-red-800 border border-red-200 px-3 py-2 rounded">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Nome visualizzato</label>
          <input className="w-full border rounded px-3 py-2" value={displayName} onChange={(e)=>setDisplayName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Foto URL</label>
          <input className="w-full border rounded px-3 py-2" value={photoURL} onChange={(e)=>setPhotoURL(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm text-gray-700 mb-1">Email</label>
          <input className="w-full border rounded px-3 py-2" value={email} onChange={(e)=>setEmail(e.target.value)} />
          {canUpdateEmail && (
            <div className="mt-2">
              <label className="block text-xs text-gray-600 mb-1">Password attuale (necessaria per cambiare email)</label>
              <input type="password" className="w-full border rounded px-3 py-2" value={emailPwd} onChange={(e)=>setEmailPwd(e.target.value)} />
            </div>
          )}
        </div>
      </div>
      <div className="mt-4">
        <button disabled={saving} onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">
          {saving ? 'Salvataggio...' : 'Salva modifiche'}
        </button>
      </div>
    </div>
  );
};

