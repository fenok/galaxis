const LIBRARY_PREFIX = '[Galaxis]';

export const logger = {
    log(message?: unknown, ...optionalParams: unknown[]) {
        if (process.env.NODE_ENV !== 'production') {
            console.log(LIBRARY_PREFIX, message, ...optionalParams);
        }
    },
    warn(message?: unknown, ...optionalParams: unknown[]) {
        if (process.env.NODE_ENV !== 'production') {
            console.warn(LIBRARY_PREFIX, message, ...optionalParams);
        }
    },
    error(message?: unknown, ...optionalParams: unknown[]) {
        if (process.env.NODE_ENV !== 'production') {
            console.error(LIBRARY_PREFIX, message, ...optionalParams);
        }
    },
};
