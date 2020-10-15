import { SsrPromisesManager } from '../../core/client';
import { createContext } from 'react';

const SsrPromisesManagerContext = createContext<SsrPromisesManager | null>(null);

export { SsrPromisesManagerContext };
