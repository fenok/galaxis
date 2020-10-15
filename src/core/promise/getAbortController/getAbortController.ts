import { logger } from '../../logger';

export function getAbortController(): AbortController | undefined {
    const abortController = typeof AbortController !== 'undefined' ? new AbortController() : undefined;

    if (abortController) {
        return abortController;
    } else if (typeof window !== 'undefined') {
        logger.error('No AbortController detected, polyfill is required');
    }

    return undefined;
}
