import { SsrPromisesManager } from '@fetcher/core';
import { createContext } from 'react';

const SsrPromisesManagerContext = createContext<SsrPromisesManager | null>(null);

export { SsrPromisesManagerContext };
