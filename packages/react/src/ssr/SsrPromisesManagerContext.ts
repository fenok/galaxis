import { SsrPromisesManager } from '@galaxis/core';
import { createContext } from 'react';

const SsrPromisesManagerContext = createContext<SsrPromisesManager | undefined>(undefined);

export { SsrPromisesManagerContext };
