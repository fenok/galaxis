import { useRef } from 'react';

export function useMemoOnce<T>(value: T, deps: unknown[]): T {
    const valueRef = useRef<T>(value);
    const depsRef = useRef<unknown[]>(deps);

    if (depsRef.current.some((refDep, refDepIndex) => refDep !== deps[refDepIndex])) {
        valueRef.current = value;
        depsRef.current = deps;
    }

    return valueRef.current;
}
