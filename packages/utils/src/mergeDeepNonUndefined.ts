import merge from 'lodash.merge';

// eslint-disable-next-line @typescript-eslint/no-unsafe-return
export const mergeDeepNonUndefined: typeof merge = (...args: unknown[]) => merge({}, ...args);
