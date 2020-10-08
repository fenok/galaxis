import { NonUndefined, YarfRequest } from '../request';
import { Signals, smartPromise } from '../promise/smartPromise';
import * as logger from '../logger';
import { EnableController, EnableSignal } from '../promise/controllers/EnableController';

export interface PromiseData {
    promise: Promise<unknown>;
    type: 'query' | 'mutation';
    enableController: EnableController;
}

export class NetworkRequestQueue<C extends NonUndefined> {
    private queue: (PromiseData | undefined)[] = [];

    public getPromise<R extends NonUndefined, E extends Error, I>(
        request: YarfRequest<C, R, E, I>,
        signals: Signals = {},
        type: 'query' | 'mutation',
    ): Promise<R> {
        const promise = (enableSignal?: EnableSignal) =>
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
                        'Network request promise was resolved with error. You should reject the promise instead. Error: ',
                        dataOrError,
                    );
                    throw dataOrError;
                } else {
                    return dataOrError;
                }
            });

        return this.addPromiseToQueue(promise, type);
    }

    private addPromiseToQueue<R extends NonUndefined>(
        promiseFactory: (enableSignal: EnableSignal) => Promise<R>,
        type: 'query' | 'mutation',
    ): Promise<R> {
        const lastQueuePromise = this.queue[this.queue.length - 1];

        const isAdding = lastQueuePromise?.type !== 'query' || type === 'mutation';

        const enableController = isAdding
            ? new EnableController()
            : lastQueuePromise?.enableController ?? new EnableController();

        const promise = promiseFactory(enableController.signal);

        const promiseGroupData = {
            promise: Promise.resolve(),
            enableController,
            type,
        };

        promiseGroupData.promise = this.onResolve(
            isAdding ? promise : this.onResolve(Promise.resolve(lastQueuePromise?.promise), () => promise),
            () => {
                if (promiseGroupData === this.queue[0]) {
                    this.queue.shift();
                    /* eslint-disable @typescript-eslint/no-unnecessary-condition */
                    this.queue[0]?.enableController.enable();
                }
            },
        );

        if (isAdding) {
            this.queue.push(promiseGroupData);
        } else {
            this.queue.pop();
            this.queue.push(promiseGroupData);
        }

        if (isAdding && !lastQueuePromise) {
            this.queue[0]?.enableController.enable();
        }

        return promise;
    }

    private onResolve(promise: Promise<any>, cb: () => any) {
        return promise.then(cb, cb);
    }
}
