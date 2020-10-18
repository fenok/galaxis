const LIBRARY_PREFIX = '[Fetcher]';

export const logger = {
    log(message?: any, ...optionalParams: any[]) {
        if (process.env.NODE_ENV !== 'production') {
            console.log(LIBRARY_PREFIX, message, ...optionalParams);
        }
    },
    warn(message?: any, ...optionalParams: any[]) {
        if (process.env.NODE_ENV !== 'production') {
            console.warn(LIBRARY_PREFIX, message, ...optionalParams);
        }
    },
    error(message?: any, ...optionalParams: any[]) {
        if (process.env.NODE_ENV !== 'production') {
            console.error(LIBRARY_PREFIX, message, ...optionalParams);
        }
    },
};
