import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { apiService } from '../services/api';


export const useHeartbeat = () => {
    const { user } = useAuth();
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!user) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        const sendHeartbeat = async () => {
            try {
                await apiService.sendHeartbeat(new Date().toISOString());
            } catch (err) {
                console.error("Heartbeat failed", err);
            }
        };

        // Send immediately on mount/login
        sendHeartbeat();

        // Then every minute
        intervalRef.current = setInterval(sendHeartbeat, 60000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [user?.uid]); // Depend on UID to restart if user changes
};
