import { useRef, useEffect } from 'react';

export function useIsUnmounted() {
    const isUnmounted = useRef(false);

    useEffect(() => {
        return () => {
            isUnmounted.current = true;
        };
    }, []);

    return isUnmounted;
}
