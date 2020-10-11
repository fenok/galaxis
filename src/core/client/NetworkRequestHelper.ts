import { EnableSignal, Signals, smartPromise } from '../promise';
import * as logger from '../logger';
import { NonUndefined, CommonRequest } from '../types';

export class NetworkRequestHelper {
    public static getPromiseFactory<C extends NonUndefined, R extends NonUndefined, E extends Error, I>(
        request: CommonRequest<C, R, E, I>,
        signals: Signals = {},
    ): (enableSignal?: EnableSignal) => Promise<R> {
        return (enableSignal?: EnableSignal) =>
            smartPromise(
                request.getNetworkRequestFactory(request.requestInit),
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
