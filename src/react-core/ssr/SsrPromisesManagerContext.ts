import * as React from 'react';
import { SsrPromisesManager } from '../../core/client';

const SsrPromisesManagerContext = React.createContext<SsrPromisesManager | null>(null);

export { SsrPromisesManagerContext };
