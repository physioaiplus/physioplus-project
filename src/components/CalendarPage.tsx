import React, { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Plus, Trash2, Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiService } from '../services/api';

interface CalendarEvent {
    id: string;
    summary: string;
    description?: string;
    location?: string;
    start: { dateTime?: string; date?: string; timeZone?: string };
    end: { dateTime?: string; date?: string; timeZone?: string };
    htmlLink: string;
}

export const CalendarPage: React.FC = () => {
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Calendar State
    const [currentDate, setCurrentDate] = useState(new Date());

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newEvent, setNewEvent] = useState({ summary: '', start: '', end: '', description: '' });
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

    // --- Status Check ---
    const checkStatus = async () => {
        try {
            const params = new URLSearchParams(window.location.search);
            const statusParam = params.get('status');
            const errorParam = params.get('error');

            if (statusParam === 'success') {
                window.history.replaceState({}, '', '/calendar');
            } else if (errorParam) {
                setError("Errore durante il collegamento a Google.");
            }

            const response = await apiService.getGoogleCalendarStatus();
            const connected = Boolean(response.success && response.data?.connected);
            setIsConnected(connected);
            if (connected) {
                fetchEvents();
            }
        } catch (err) {
            console.error("Status check failed", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkStatus();
    }, []);

    // --- Actions ---
    const handleConnect = async () => {
        try {
            const response = await apiService.connectGoogleCalendar();
            if (!response.success || !response.data?.url) {
                throw new Error(response.message || 'Link non disponibile');
            }
            window.location.href = response.data.url;
        } catch (err) {
            setError("Impossibile avviare la connessione.");
        }
    };

    const handleDisconnect = async () => {
        if (!confirm("Vuoi davvero scollegare il calendario?")) return;
        try {
            const response = await apiService.disconnectGoogleCalendar();
            if (!response.success) {
                throw new Error(response.message || 'Errore durante la disconnessione.');
            }
            setIsConnected(false);
            setEvents([]);
        } catch (err) {
            setError("Errore durante la disconnessione.");
        }
    };

    const fetchEvents = async () => {
        try {
            const response = await apiService.getCalendarEvents();
            if (!response.success) {
                throw new Error(response.message || 'Errore caricamento eventi');
            }
            setEvents(response.data?.events || []);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSaveEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const isoStart = new Date(newEvent.start).toISOString();
            const isoEnd = new Date(newEvent.end).toISOString();

            const payload = {
                summary: newEvent.summary,
                description: newEvent.description,
                start: isoStart,
                end: isoEnd,
                timeZone: 'Europe/Rome'
            };

            const response = editingEvent
                ? await apiService.updateCalendarEvent(editingEvent.id, payload)
                : await apiService.createCalendarEvent(payload);

            if (!response.success) {
                throw new Error(response.message || 'Errore salvataggio evento');
            }

            setShowCreateModal(false);
            setEditingEvent(null);
            setNewEvent({ summary: '', start: '', end: '', description: '' });
            fetchEvents();
        } catch (err) {
            alert("Errore salvataggio evento");
        }
    };

    const handleDeleteEvent = async (id: string) => {
        if (!confirm("Eliminare evento?")) return;
        try {
            const response = await apiService.deleteCalendarEvent(id);
            if (!response.success) {
                throw new Error(response.message || 'Errore eliminazione evento');
            }
            fetchEvents();
        } catch (err) {
            alert("Errore eliminazione");
        }
    };

    const openEditModal = (evt: CalendarEvent, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setEditingEvent(evt);

        const getIsoString = (dateProps: { dateTime?: string; date?: string }) => {
            if (dateProps.dateTime) return dateProps.dateTime;
            if (dateProps.date) return new Date(dateProps.date).toISOString();
            return new Date().toISOString();
        };

        const toLocal = (iso: string) => {
            const date = new Date(iso);
            date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
            return date.toISOString().slice(0, 16);
        }

        setNewEvent({
            summary: evt.summary,
            description: evt.description || '',
            start: toLocal(getIsoString(evt.start)),
            end: toLocal(getIsoString(evt.end))
        });
        setShowCreateModal(true);
    };

    const handleCreateClick = (selectedDate?: Date) => {
        setEditingEvent(null);

        const now = new Date();

        // Use selected date if valid, otherwise use now
        // If selectedDate is from the calendar grid, it's usually 00:00 of that day.
        // We might want to set a default time like 09:00 for new events on a specific day
        let startDate = selectedDate ? new Date(selectedDate) : now;
        let endDate = new Date(startDate);

        if (selectedDate) {
            // Set default time to 09:00 - 10:00 for day clicks
            startDate.setHours(9, 0, 0, 0);
            endDate.setHours(10, 0, 0, 0);
        } else {
            // For "New Event" button, use next hour
            startDate.setMinutes(0, 0, 0);
            startDate.setHours(startDate.getHours() + 1);
            endDate = new Date(startDate);
            endDate.setHours(endDate.getHours() + 1);
        }

        // Adjust for local input requirement (YYYY-MM-DDThh:mm)
        const toLocalISO = (date: Date) => {
            const d = new Date(date);
            d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
            return d.toISOString().slice(0, 16);
        };

        setNewEvent({
            summary: '',
            start: toLocalISO(startDate),
            end: toLocalISO(endDate),
            description: ''
        });
        setShowCreateModal(true);
    };

    // --- Calendar Logic ---
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
        // Convert to Mon-Sun (0=Mon, 6=Sun)
        const firstDayMon = firstDay === 0 ? 6 : firstDay - 1;
        return { days, firstDayMon };
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const isSameDay = (date1: Date, date2: Date) => {
        return date1.getDate() === date2.getDate() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getFullYear() === date2.getFullYear();
    };

    const getEventsForDay = (day: number) => {
        const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        return events.filter(evt => {
            const startStr = evt.start.dateTime || evt.start.date;
            if (!startStr) return false;

            // Fix for all-day events which might be parsed as UTC 00:00 and shift day if checked against local time
            // If it's pure date string (YYYY-MM-DD)
            if (evt.start.date) {
                // Parse date parts manually to avoid timezone shift issues
                const [y, m, d] = evt.start.date.split('-').map(Number);
                return y === targetDate.getFullYear() && (m - 1) === targetDate.getMonth() && d === day;
            }

            const evtDate = new Date(startStr);
            return isSameDay(evtDate, targetDate);
        });
    };

    const renderCalendar = () => {
        const { days, firstDayMon } = getDaysInMonth(currentDate);
        const daysArray = [];

        // Empty cells for days before start of month
        for (let i = 0; i < firstDayMon; i++) {
            daysArray.push(<div key={`empty-${i}`} className="min-h-[120px] bg-gray-50 border border-gray-100 mix-blend-multiply"></div>);
        }

        // Days of month
        for (let d = 1; d <= days; d++) {
            const dayEvents = getEventsForDay(d);
            const isToday = isSameDay(new Date(), new Date(currentDate.getFullYear(), currentDate.getMonth(), d));

            daysArray.push(
                <div key={d} className={`min-h-[120px] border border-gray-100 p-2 relative group hover:bg-gray-50 transition ${isToday ? 'bg-blue-50/50' : 'bg-white'}`}>
                    <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600 bg-blue-100 w-6 h-6 rounded-full flex items-center justify-center' : 'text-gray-700'}`}>
                        {d}
                    </div>
                    <div className="space-y-1 overflow-y-auto max-h-[100px] scrollbar-hide">
                        {dayEvents.map(evt => (
                            <div
                                key={evt.id}
                                onClick={(e) => openEditModal(evt, e)}
                                className={`text-xs p-1 rounded border truncate cursor-pointer transition select-none flex items-center gap-1
                                    ${evt.start.date
                                        ? 'bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100' // All day
                                        : 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100' // Timed
                                    }`}
                                title={evt.summary}
                            >
                                {evt.start.date ? (
                                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                                ) : (
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                                )}
                                <span className="truncate">{evt.summary}</span>
                            </div>
                        ))}
                    </div>
                    {/* Add button on hover */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            // Pass the specific date of this cell
                            handleCreateClick(new Date(currentDate.getFullYear(), currentDate.getMonth(), d));
                        }}
                        className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-blue-100 text-blue-600 rounded-full transition"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            );
        }
        return daysArray;
    };

    const weekDays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-6 py-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Calendario</h1>
                    <p className="text-gray-500">Gestisci i tuoi appuntamenti</p>
                </div>

                <div className="flex items-center gap-2">
                    {isConnected ? (
                        <>
                            <button onClick={() => handleCreateClick()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow">
                                <Plus className="w-4 h-4" /> Nuovo Evento
                            </button>
                            <button onClick={handleDisconnect} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl hover:bg-red-100 transition">
                                Scollega
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={handleConnect}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 text-gray-700 font-medium transition-colors shadow-sm"
                        >
                            <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" alt="GCal" className="w-5 h-5" />
                            Collega Google Calendar
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" /> {error}
                </div>
            )}

            {!isConnected ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 flex flex-col items-center justify-center text-center">
                    <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mb-6">
                        <CalendarIcon className="w-10 h-10 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Connetti il tuo Calendario</h2>
                    <p className="text-gray-500 max-w-md mx-auto mb-8">
                        Sincronizza i tuoi appuntamenti direttamente con Google Calendar per non perdere mai una visita.
                    </p>
                    <button onClick={handleConnect} className="px-8 py-3 bg-blue-600 text-white rounded-full font-bold shadow-lg hover:shadow-blue-500/30 hover:scale-105 transition-all">
                        Inizia Ora
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50/50">
                        <button onClick={prevMonth} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition text-gray-600">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <h2 className="text-xl font-bold text-gray-800 capitalize">
                            {currentDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' })}
                        </h2>
                        <button onClick={nextMonth} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition text-gray-600">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Week Days */}
                    <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                        {weekDays.map(day => (
                            <div key={day} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 bg-white">
                        {renderCalendar()}
                    </div>
                </div>
            )}

            {/* Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-900">{editingEvent ? 'Modifica Appuntamento' : 'Nuovo Appuntamento'}</h3>
                            {editingEvent && (
                                <button onClick={() => handleDeleteEvent(editingEvent.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        <form onSubmit={handleSaveEvent} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Titolo</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Es. Visita di controllo"
                                    className="w-full rounded-xl border-gray-200 border p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                    value={newEvent.summary}
                                    onChange={e => setNewEvent({ ...newEvent, summary: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Inizio</label>
                                    <input
                                        required
                                        type="datetime-local"
                                        className="w-full rounded-xl border-gray-200 border p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                        value={newEvent.start}
                                        onChange={e => setNewEvent({ ...newEvent, start: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fine</label>
                                    <input
                                        required
                                        type="datetime-local"
                                        className="w-full rounded-xl border-gray-200 border p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                        value={newEvent.end}
                                        onChange={e => setNewEvent({ ...newEvent, end: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                                <textarea
                                    className="w-full rounded-xl border-gray-200 border p-2.5 text-sm h-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none"
                                    value={newEvent.description}
                                    onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg font-medium transition">Annulla</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition shadow-lg shadow-blue-500/30">
                                    {editingEvent ? 'Salva Modifiche' : 'Crea Evento'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
