import { getAbortController } from '../promise';
import { NonUndefined } from '../types';

export interface QueueSection {
    promise: Promise<unknown>;
    type: 'query' | 'mutation';
    abortDelayController?: AbortController;
    resolvedEarly: boolean;
}

export class RequestQueue {
    private queue: (QueueSection | undefined)[] = [];

    public addPromise<TData extends NonUndefined>(
        promiseFactory: (abortDelaySignal?: AbortSignal) => Promise<TData>,
        type: 'query' | 'mutation',
    ): Promise<TData> {
        const lastQueueSection = this.queue[this.queue.length - 1];

        const noMerge = lastQueueSection?.type === 'mutation' || type === 'mutation';

        const abortDelayController =
            noMerge || !lastQueueSection ? getAbortController() : lastQueueSection.abortDelayController;

        const promise = promiseFactory(abortDelayController?.signal);

        const newQueueSection: QueueSection = {
            promise: onResolve(
                noMerge || !lastQueueSection ? promise : onResolve(lastQueueSection.promise, () => promise),
                () => {
                    if (newQueueSection === this.queue[0]) {
                        do {
                            this.queue.shift();
                        } while (this.queue[0]?.resolvedEarly);

                        this.queue[0]?.abortDelayController?.abort();
                    } else {
                        newQueueSection.resolvedEarly = true;
                    }
                },
            ),
            abortDelayController,
            type,
            resolvedEarly: false,
        };

        if (noMerge || !lastQueueSection) {
            this.queue.push(newQueueSection);
            if (!lastQueueSection) {
                newQueueSection.abortDelayController?.abort();
            }
        } else {
            this.queue.pop();
            this.queue.push(newQueueSection);
        }

        return promise;
    }
}

export function onResolve<U>(promise: Promise<unknown>, cb: () => U | Promise<U>): Promise<U> {
    return promise.then(cb, cb);
}
