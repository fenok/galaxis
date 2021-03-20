import { Signals, delayedPromise } from '../promise';
import { logger } from '../logger';
import { NonUndefined, InternalRequest } from '../types';

export class RequestHelper {
    public static getPromiseFactory<C extends NonUndefined, D extends NonUndefined, E extends Error, R>(
        request: InternalRequest<C, D, E, R>,
        signals: Signals = {},
    ): (abortDelaySignal?: AbortSignal) => Promise<D> {
        return (abortDelaySignal?: AbortSignal) =>
            delayedPromise(request.getRequestFactory(request), {
                ...signals,
                abortDelaySignal,
            }).then((dataOrError) => {
                if (dataOrError instanceof Error) {
                    logger.warn(
                        'Network request promise was fulfilled with an error. You should reject the promise instead. Error: ',
                        dataOrError,
                    );
                    throw dataOrError;
                } else {
                    return dataOrError;
                }
            });
    }
}
