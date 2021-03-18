import merge from 'lodash.merge';

export const mergeDeepNonUndefined: typeof merge = (...args: unknown[]) => merge({}, args);
