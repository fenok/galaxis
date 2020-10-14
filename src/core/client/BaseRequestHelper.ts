import { EnableSignal, Signals, smartPromise } from '../promise';
import * as logger from '../logger';
import { NonUndefined, BaseRequest } from '../types';

export class BaseRequestHelper {
    public static getPromiseFactory<C extends NonUndefined, R extends NonUndefined, E extends Error, I>(
        request: BaseRequest<C, R, E, I>,
        signals: Signals = {},
    ): (enableSignal?: EnableSignal) => Promise<R> {
        return (enableSignal?: EnableSignal) =>
            smartPromise(
                request.getRequestFactory(request),
                {
                    ...signals,
                    enableSignal,
                },
                { disabled: true },
            ).then(dataOrError => {
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
