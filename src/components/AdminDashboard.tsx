import React, { useEffect, useState } from 'react';
import { ShieldAlert, CheckCircle, XCircle, Loader2, Users, UserPlus, LogOut, RefreshCw, Server } from 'lucide-react';
import { AdminUserList } from './AdminUserList';
import { apiService } from '../services/api';

interface ModelStatus {
    pose: { available: boolean; error: string | null };
    smpl: { available: boolean; error: string | null; model_dir: string | null };
}

interface AdminDashboardProps {
    onLogout: () => void;
    userEmail: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, userEmail }) => {
    const [status, setStatus] = useState<ModelStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // User management state
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [userActionLoading, setUserActionLoading] = useState(false);
    const [userActionMessage, setUserActionMessage] = useState<string | null>(null);


    const fetchStatus = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiService.getBackendStatus();
            if (response.success) {
                setStatus(response.data);
            } else {
                setError(response.message || "Failed to fetch status");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const handleCreateUser = async () => {
        if (!newUserEmail || !newUserPassword) {
            setUserActionMessage("Email e password sono richiesti");
            return;
        }

        setUserActionLoading(true);
        setUserActionMessage(null);

        // Note: Creating users requires Firebase Admin SDK on backend
        // For now, we'll show a message that this needs to be done via Firebase Console
        // or we can add a backend endpoint for this

        setUserActionMessage("Per creare utenti, usa Firebase Console > Authentication > Users");
        setUserActionLoading(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
            {/* Header */}
            <header className="bg-gray-800/50 border-b border-gray-700 px-6 py-4">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <ShieldAlert className="w-8 h-8 text-yellow-400" />
                        <div>
                            <h1 className="text-xl font-bold">Admin Dashboard</h1>
                            <p className="text-sm text-gray-400">{userEmail}</p>
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Logout
                    </button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Model Status Section */}
                    <section className="bg-gray-800/50 rounded-2xl border border-gray-700 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <Server className="w-6 h-6 text-blue-400" />
                                <h2 className="text-lg font-semibold">Stato Modelli Backend</h2>
                            </div>
                            <button
                                onClick={fetchStatus}
                                disabled={loading}
                                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {loading && !status && (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-4">
                                <p className="text-red-400">{error}</p>
                            </div>
                        )}

                        {status && (
                            <div className="space-y-4">
                                {/* MediaPipe Status */}
                                <div className="bg-gray-900/50 rounded-xl p-4">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium">MediaPipe Pose</span>
                                        {status.pose?.available ? (
                                            <span className="flex items-center gap-2 text-green-400">
                                                <CheckCircle className="w-5 h-5" />
                                                Attivo
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-2 text-red-400">
                                                <XCircle className="w-5 h-5" />
                                                Errore
                                            </span>
                                        )}
                                    </div>
                                    {!status.pose?.available && status.pose?.error && (
                                        <p className="mt-2 text-sm text-red-300 bg-red-900/20 rounded p-2">
                                            {status.pose.error}
                                        </p>
                                    )}
                                </div>

                                {/* SMPL Status */}
                                <div className="bg-gray-900/50 rounded-xl p-4">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium">SMPL Model</span>
                                        {status.smpl?.available ? (
                                            <span className="flex items-center gap-2 text-green-400">
                                                <CheckCircle className="w-5 h-5" />
                                                Caricato
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-2 text-red-400">
                                                <XCircle className="w-5 h-5" />
                                                Non disponibile
                                            </span>
                                        )}
                                    </div>
                                    {status.smpl?.model_dir && (
                                        <p className="mt-2 text-xs text-gray-400">
                                            Directory: {status.smpl.model_dir}
                                        </p>
                                    )}
                                    {!status.smpl?.available && status.smpl?.error && (
                                        <p className="mt-2 text-sm text-red-300 bg-red-900/20 rounded p-2">
                                            {status.smpl.error}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </section>


                    {/* User List Section */}
                    <div className="lg:col-span-2">
                        <AdminUserList />
                    </div>

                    {/* User Management Section */}
                    <section className="bg-gray-800/50 rounded-2xl border border-gray-700 p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <Users className="w-6 h-6 text-purple-400" />
                            <h2 className="text-lg font-semibold">Gestione Utenti</h2>
                        </div>

                        <div className="space-y-4">
                            {/* Create User Form */}
                            <div className="bg-gray-900/50 rounded-xl p-4">
                                <h3 className="font-medium mb-4 flex items-center gap-2">
                                    <UserPlus className="w-4 h-4" />
                                    Crea Nuovo Utente
                                </h3>
                                <div className="space-y-3">
                                    <input
                                        type="email"
                                        placeholder="Email"
                                        value={newUserEmail}
                                        onChange={(e) => setNewUserEmail(e.target.value)}
                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                                    />
                                    <input
                                        type="password"
                                        placeholder="Password"
                                        value={newUserPassword}
                                        onChange={(e) => setNewUserPassword(e.target.value)}
                                        className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:border-blue-500 focus:outline-none"
                                    />
                                    <button
                                        onClick={handleCreateUser}
                                        disabled={userActionLoading}
                                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        {userActionLoading ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <UserPlus className="w-4 h-4" />
                                        )}
                                        Crea Utente
                                    </button>
                                </div>
                            </div>

                            {userActionMessage && (
                                <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
                                    <p className="text-blue-300 text-sm">{userActionMessage}</p>
                                </div>
                            )}

                            {/* Quick Links */}
                            <div className="bg-gray-900/50 rounded-xl p-4">
                                <h3 className="font-medium mb-3">Link Rapidi</h3>
                                <div className="space-y-2">
                                    <a
                                        href="https://console.firebase.google.com/project/physioai-b5805/authentication/users"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm"
                                    >
                                        Ã°Å¸â€â€” Firebase Console - Utenti
                                    </a>
                                    <a
                                        href="https://console.cloud.google.com/run?project=physioai-b5805"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm"
                                    >
                                        Ã°Å¸â€â€” Cloud Run Console
                                    </a>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
};
