class SsrPromisesManager {
    private promises: Promise<any>[] = [];

    public addPromise(promise: Promise<any>) {
        this.promises.push(promise);
    }

    public awaitPromises(): Promise<any> {
        return this.allSettled().then(() => {
            this.promises = [];
        });
    }

    public hasPromises() {
        return Boolean(this.promises.length);
    }

    private allSettled() {
        return new Promise(resolve => {
            let unsettledCount = this.promises.length;

            if (!unsettledCount) {
                resolve();
            }

            const onSettle = () => {
                if (--unsettledCount <= 0) {
                    resolve();
                }
            };

            this.promises.forEach(promise => {
                promise.then(onSettle, onSettle);
            });
        });
    }
}

export { SsrPromisesManager };
