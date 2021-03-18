import merge from 'lodash.merge';

export const mergeDeepNonUndefined: typeof merge = (...args: any[]) => merge({}, args);
