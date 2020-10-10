import { NonUndefined } from '../request';
import { EnableController, EnableSignal } from '../promise/controllers/EnableController';

export interface PromiseData {
    promise: Promise<unknown>;
    type: 'query' | 'mutation';
    enableController: EnableController;
}

export class NetworkRequestQueue {
    private queue: (PromiseData | undefined)[] = [];

    public addPromiseToQueue<R extends NonUndefined>(
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
