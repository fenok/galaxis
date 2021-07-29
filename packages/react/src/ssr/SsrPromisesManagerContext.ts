import { createContext } from 'react';
import { SsrPromisesManager } from './SsrPromisesManager';

const SsrPromisesManagerContext = createContext<SsrPromisesManager | undefined>(undefined);

export { SsrPromisesManagerContext };
