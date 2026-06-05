import React, { useEffect, useState } from 'react';
import { User, Activity, Calendar, Clock, BarChart3, X, ChevronRight } from 'lucide-react';
import { apiService } from '../services/api';


interface AdminUser {
    uid: string;
    email: string;
    photo_url: string | null;
    created_at: string; // timestamp or string date
    last_sign_in: string;
    last_active_at: string | null;
    is_online: boolean;
}

interface UserStats {
    daily_access: Record<string, number>;
}

export const AdminUserList: React.FC = () => {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [userStats, setUserStats] = useState<UserStats | null>(null);
    const [loadingStats, setLoadingStats] = useState(false);

    // View state for graph
    const [viewDate, setViewDate] = useState(new Date());

    const fetchUsers = async () => {
        try {
            const response = await apiService.getAdminUsers();
            if (response.success) {
                setUsers(response.data?.users || []);
            }
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserStats = async (uid: string, date: Date) => {
        setLoadingStats(true);
        setUserStats(null);
        try {
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const response = await apiService.getAdminUserStats(uid, year, month);
            if (response.success && response.data) {
                setUserStats({ daily_access: response.data.daily_access });
            }
        } catch (error) {
            console.error("Failed to fetch user stats", error);
        } finally {
            setLoadingStats(false);
        }
    };

    useEffect(() => {
        fetchUsers();
        // Refresh every minute to keep online status current
        const interval = setInterval(fetchUsers, 60000);
        return () => clearInterval(interval);
    }, []);

    // Debounced stats fetch logic
    const [debouncedDate, setDebouncedDate] = useState(viewDate);

    // Effect 1: Debounce viewDate changes by 5s (month navigation)
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedDate(viewDate);
        }, 5000);
        return () => clearTimeout(handler);
    }, [viewDate]);

    // Effect 2: Fetch data when selectedUser or debouncedDate changes
    useEffect(() => {
        if (selectedUser) {
            fetchUserStats(selectedUser.uid, debouncedDate);
        }
    }, [selectedUser, debouncedDate]);


    const handleUserClick = (user: AdminUser) => {
        setSelectedUser(user);
        setViewDate(new Date()); // Reset to current date on new user
        // The effect [selectedUser, debouncedDate] will run. 
        // Warning: setViewDate will trigger the 5s debounce effect for `debouncedDate`. 
        // But we want immediate load. 
        // We can force `setDebouncedDate` immediately here too.
        setDebouncedDate(new Date());
    };

    const formatDate = (ts: string | number) => {
        if (!ts) return 'N/A';
        const date = new Date(typeof ts === 'string' ? ts : Number(ts));
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const changeMonth = (delta: number) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setViewDate(newDate);
    };

    // Prepare graph data
    const getGraphData = () => {
        if (!userStats) return [];

        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const data = [];
        for (let d = 1; d <= daysInMonth; d++) {
            // Format date key YYYY-MM-DD
            const dateObj = new Date(Date.UTC(year, month, d));
            const key = dateObj.toISOString().split('T')[0];
            data.push({
                day: d,
                count: userStats.daily_access[key] || 0
            });
        }
        return data;
    };

    const graphData = getGraphData();
    // Max count for scaling, default to 10 as requested if max is low
    const maxDataVal = graphData.reduce((max, item) => Math.max(max, item.count), 0);
    const maxCount = Math.max(maxDataVal, 10); // "se ne prospettano al massimo una 10ina... non deve essere troppo grande"

    return (
        <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-6">
                <Activity className="w-6 h-6 text-green-400" />
                <h2 className="text-lg font-semibold">Utenti Registrati</h2>
                <span className="bg-gray-700 text-xs px-2 py-1 rounded-full text-gray-300 ml-auto">
                    {users.length} Totali
                </span>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {users.map(user => (
                    <div
                        key={user.uid}
                        onClick={() => handleUserClick(user)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group
                            ${selectedUser?.uid === user.uid
                                ? 'bg-blue-900/30 border-blue-500/50'
                                : 'bg-gray-900/50 border-gray-700 hover:border-gray-600 hover:bg-gray-800'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                                    {user.photo_url ? (
                                        <img src={user.photo_url} alt="av" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-5 h-5 text-gray-400" />
                                    )}
                                </div>
                                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900 
                                    ${user.is_online ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-500'}`}
                                />
                            </div>
                            <div>
                                <p className="font-medium text-sm text-gray-200">{user.email}</p>
                                <p className="text-xs text-gray-500">
                                    {user.is_online ? 'Attualmente Online' : `Ultimo accesso: ${formatDate(user.last_active_at || 0)}`}
                                </p>
                            </div>
                        </div>
                        <ChevronRight className={`w-4 h-4 text-gray-600 transition-transform ${selectedUser?.uid === user.uid ? 'rotate-90 text-blue-400' : 'group-hover:text-gray-400'}`} />
                    </div>
                ))}

                {users.length === 0 && !loading && (
                    <p className="text-center text-gray-500 py-4 text-sm">Nessun utente trovato</p>
                )}
            </div>

            {/* User Detail Panel */}
            {selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelectedUser(null)}>
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center border-2 border-gray-700 overflow-hidden">
                                    {selectedUser.photo_url ? (
                                        <img src={selectedUser.photo_url} alt="av" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-7 h-7 text-gray-400" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">{selectedUser.email}</h3>
                                    <span className={`text-xs px-2 py-0.5 rounded-full border ${selectedUser.is_online ? 'bg-green-900/30 border-green-700 text-green-400' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
                                        {selectedUser.is_online ? 'Online Ora' : 'Offline'}
                                    </span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                                        <Calendar className="w-4 h-4" />
                                        <span className="text-xs uppercase tracking-wider">Registrato il</span>
                                    </div>
                                    <p className="font-mono text-sm">{formatDate(selectedUser.created_at)}</p>
                                </div>
                                <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                                        <Clock className="w-4 h-4" />
                                        <span className="text-xs uppercase tracking-wider">Ultimo Login</span>
                                    </div>
                                    <p className="font-mono text-sm">{formatDate(selectedUser.last_sign_in)}</p>
                                </div>
                            </div>

                            {/* Daily Access Graph */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="flex items-center gap-2 font-medium text-gray-300">
                                        <BarChart3 className="w-4 h-4 text-blue-400" />
                                        AttivitÃƒÂ : {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                    </h4>
                                    <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1 border border-gray-700">
                                        <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-white">
                                            <ChevronRight className="w-4 h-4 rotate-180" />
                                        </button>
                                        <button onClick={() => changeMonth(1)} className="p-1 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-white">
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {loadingStats ? (
                                    <div className="h-40 bg-gray-800/30 rounded-lg flex items-center justify-center animate-pulse">
                                        <span className="text-sm text-gray-500">Caricamento statistiche...</span>
                                    </div>
                                ) : (
                                    <div className="h-48 flex items-end gap-1 bg-gray-800/30 rounded-lg p-4 border border-gray-700/30 relative">
                                        {graphData.length > 0 ? (
                                            graphData.map((item) => {
                                                // Scaling
                                                const heightPerc = (item.count / maxCount) * 100;
                                                return (
                                                    <div key={item.day} className="flex-1 flex flex-col items-center gap-1 group">
                                                        <div className="w-full relative flex items-end h-32 bg-gray-800/50 rounded-sm overflow-hidden">
                                                            <div
                                                                style={{ height: `${heightPerc}%` }}
                                                                className={`w-full transition-all rounded-t-sm relative 
                                                                    ${item.count > 0 ? 'bg-blue-500/80 hover:bg-blue-400 group-hover:shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-transparent'}
                                                                `}
                                                            >
                                                            </div>
                                                            {/* Tooltip */}
                                                            {item.count > 0 && (
                                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-700 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                                                    {item.count} accessi
                                                                </div>
                                                            )}
                                                        </div>
                                                        {/* Show day number every 5 days or if it's 1st/Last to avoid clutter? Or simple flex-1 logic works for 31 items */}
                                                        <span className="text-[9px] text-gray-600 rotate-0 w-full text-center">
                                                            {item.day % 5 === 0 || item.day === 1 ? item.day : ''}
                                                        </span>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">
                                                Nessun dato
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
