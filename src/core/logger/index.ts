const LIBRARY_PREFIX = '[React Fetching Hooks]';

export function log(message?: any, ...optionalParams: any[]) {
    if (process.env.NODE_ENV !== 'production') {
        console.log(LIBRARY_PREFIX, message, ...optionalParams);
    }
}

export function warn(message?: any, ...optionalParams: any[]) {
    if (process.env.NODE_ENV !== 'production') {
        console.warn(LIBRARY_PREFIX, message, ...optionalParams);
    }
}

export function error(message?: any, ...optionalParams: any[]) {
    if (process.env.NODE_ENV !== 'production') {
        console.error(LIBRARY_PREFIX, message, ...optionalParams);
    }
}
