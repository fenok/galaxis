import { allSettled } from '../promise';

class SsrPromisesManager {
    private promises: Promise<any>[] = [];

    public addPromise(promise: Promise<any>) {
        this.promises.push(promise);
    }

    public awaitPromises(): Promise<any> {
        return allSettled(this.promises).then(() => {
            this.promises = [];
        });
    }

    public hasPromises() {
        return Boolean(this.promises.length);
    }
}

export { SsrPromisesManager };
