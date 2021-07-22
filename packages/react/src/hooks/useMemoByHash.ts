import { useRef } from 'react';

export function useMemoByHash<T>(value: T | undefined, hash: (value: T) => unknown): T | undefined {
    const currentHashRef = useRef<unknown>();
    const currentValueRef = useRef<T>();

    const nextHash = value !== undefined ? hash(value) : undefined;
    if (currentHashRef.current !== nextHash) {
        currentHashRef.current = nextHash;
        currentValueRef.current = value;
    }

    return currentValueRef.current;
}
