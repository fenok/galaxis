import { SsrPromisesManager } from '@fetcher/core';
import { createContext } from 'react';

const SsrPromisesManagerContext = createContext<SsrPromisesManager | undefined>(undefined);

export { SsrPromisesManagerContext };
