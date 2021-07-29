import { useRef } from 'react';

export function useMemoByHashObject<T>(
    value: T | undefined,
    hash: (value: T) => Record<string, unknown>,
): T | undefined {
    const currentHashRef = useRef<Record<string, unknown>>();
    const currentValueRef = useRef<T>();

    const nextHash = value !== undefined ? hash(value) : undefined;
    if (!areHashObjectsEqual(currentHashRef.current, nextHash)) {
        currentHashRef.current = nextHash;
        currentValueRef.current = value;
    }

    return currentValueRef.current;
}

function areHashObjectsEqual(first: Record<string, unknown> | undefined, second: Record<string, unknown> | undefined) {
    if (first === undefined && second === undefined) {
        return true;
    }

    if (first === undefined || second === undefined) {
        return false;
    }

    const firstKeys = Object.keys(first);
    const secondKeys = Object.keys(second);

    if (firstKeys.length !== secondKeys.length) {
        return false;
    }

    return firstKeys.every((key) => first[key] === second[key]);
}
