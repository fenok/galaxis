import React from 'react';

export function usePrevious<T>(value: T): T | undefined {
    const prevValueRef = React.useRef<T>();

    React.useEffect(() => {
        prevValueRef.current = value;
    }, [value]);

    return prevValueRef.current;
}
