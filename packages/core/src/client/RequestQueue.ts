import { EnableController, EnableSignal, onResolve } from '../promise';
import { NonUndefined } from '../types';

export interface QueueSection {
    promise: Promise<unknown>;
    type: 'query' | 'mutation';
    enableController: EnableController;
}

export class RequestQueue {
    private queue: (QueueSection | undefined)[] = [];

    public addPromise<D extends NonUndefined>(
        promiseFactory: (enableSignal: EnableSignal) => Promise<D>,
        type: 'query' | 'mutation',
    ): Promise<D> {
        const lastQueueSection = this.queue[this.queue.length - 1];

        const noMerge = lastQueueSection?.type === 'mutation' || type === 'mutation';

        const enableController =
            noMerge || !lastQueueSection ? new EnableController() : lastQueueSection.enableController;

        const promise = promiseFactory(enableController.signal);

        const newQueueSection = {
            promise: onResolve(
                noMerge || !lastQueueSection ? promise : onResolve(lastQueueSection.promise, () => promise),
                () => {
                    if (newQueueSection === this.queue[0]) {
                        this.queue.shift();
                        /* eslint-disable @typescript-eslint/no-unnecessary-condition */
                        this.queue[0]?.enableController.enable();
                    }
                },
            ),
            enableController,
            type,
        };

        if (noMerge || !lastQueueSection) {
            this.queue.push(newQueueSection);
            if (!lastQueueSection) {
                newQueueSection.enableController.enable();
            }
        } else {
            this.queue.pop();
            this.queue.push(newQueueSection);
        }

        return promise;
    }
}
