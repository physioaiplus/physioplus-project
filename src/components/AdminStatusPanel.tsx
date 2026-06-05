import React, { useEffect, useState } from 'react';
import { ShieldAlert, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { apiService } from '../services/api';

export const AdminStatusPanel: React.FC = () => {
    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const response = await apiService.getBackendStatus();
                if (response.success) {
                    setStatus(response.data);
                } else {
                    setError(response.message || 'Failed to fetch status');
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchStatus();
    }, []);

    if (loading) return <div className="text-xs text-gray-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Checking System...</div>;
    if (error) return <div className="text-xs text-red-500 flex items-center gap-1"><XCircle className="w-3 h-3" /> System Status Error</div>;
    if (!status) return null;

    return (
        <div className="fixed bottom-4 right-4 bg-gray-900 border border-gray-700 p-4 rounded-xl shadow-2xl z-50 text-white w-80 font-mono text-xs opacity-90 transition-all hover:opacity-100">
            <div className="flex items-center gap-2 mb-3 border-b border-gray-700 pb-2">
                <ShieldAlert className="w-4 h-4 text-yellow-400" />
                <span className="font-bold uppercase tracking-wider text-gray-300">Admin Diagnostics</span>
            </div>

            <div className="space-y-3">
                <div className="flex items-start justify-between">
                    <span className="text-gray-400">Pose Engine</span>
                    <div className="text-right">
                        {status.pose?.available ? (
                            <span className="text-green-400 flex items-center gap-1 justify-end"><CheckCircle className="w-3 h-3" /> Active</span>
                        ) : (
                            <div className="text-red-400 flex flex-col items-end">
                                <span className="flex items-center gap-1"><XCircle className="w-3 h-3" /> Failed</span>
                                <span className="text-[10px] opacity-75 max-w-[150px] leading-tight mt-1">{status.pose?.error || 'Unknown Error'}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-start justify-between border-t border-gray-800 pt-2">
                    <span className="text-gray-400">SMPL Model</span>
                    <div className="text-right">
                        {status.smpl?.available ? (
                            <span className="text-green-400 flex items-center gap-1 justify-end"><CheckCircle className="w-3 h-3" /> Loaded</span>
                        ) : (
                            <div className="text-red-400 flex flex-col items-end">
                                <span className="flex items-center gap-1"><XCircle className="w-3 h-3" /> Missing</span>
                                <span className="text-[10px] opacity-75 max-w-[150px] leading-tight mt-1">Dir: {status.smpl?.model_dir || 'Unset'}</span>
                                {status.smpl?.error && <span className="text-[10px] text-red-300 mt-1 max-w-[150px]">{status.smpl.error}</span>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
