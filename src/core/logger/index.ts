export function log(message?: any, ...optionalParams: any[]) {
    if (process.env.NODE_ENV !== 'production') {
        console.log(message, ...optionalParams);
    }
}

export function warn(message?: any, ...optionalParams: any[]) {
    if (process.env.NODE_ENV !== 'production') {
        console.warn(message, ...optionalParams);
    }
}

export function error(message?: any, ...optionalParams: any[]) {
    if (process.env.NODE_ENV !== 'production') {
        console.error(message, ...optionalParams);
    }
}
