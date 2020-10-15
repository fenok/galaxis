import { useRef, useEffect } from 'react';

export function usePrevious<T>(value: T): T | undefined {
    const prevValueRef = useRef<T>();

    useEffect(() => {
        prevValueRef.current = value;
    }, [value]);

    return prevValueRef.current;
}
