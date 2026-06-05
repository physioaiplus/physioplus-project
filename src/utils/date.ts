export const safeFormatDate = (value: unknown): string => {
    if (!value) return '-';
    try {
        let date: Date;
        if (typeof value === 'object') {
            const record = value as Record<string, unknown>;
            const seconds = record.seconds ?? record._seconds;
            date = typeof seconds === 'number' ? new Date(seconds * 1000) : new Date(String(value));
        } else {
            date = new Date(String(value));
        }
        if (isNaN(date.getTime())) return '-';
        return date.toISOString().slice(0, 10);
    } catch (error) {
        console.error("Date error:", value, error);
        return '-';
    }
};
