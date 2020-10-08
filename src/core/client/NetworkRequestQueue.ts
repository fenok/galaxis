import { NonUndefined, YarfRequest } from '../request';
import { Signals, smartPromise } from '../promise/smartPromise';
import * as logger from '../logger';

export class NetworkRequestQueue<C extends NonUndefined> {
    public getRequestPromise<R extends NonUndefined, E extends Error, I>(
        request: YarfRequest<C, R, E, I>,
        signals: Signals = {},
    ): Promise<R> {
        return smartPromise(request.getNetworkRequestFactory(request.requestInit), signals).then(dataOrError => {
            if (dataOrError instanceof Error) {
                logger.warn(
                    'Network request promise was resolved with error. You should reject the promise instead. Error: ',
                    dataOrError,
                );
                throw dataOrError;
            } else {
                return dataOrError;
            }
        });
    }
}
