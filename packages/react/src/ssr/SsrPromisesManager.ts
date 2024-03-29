class SsrPromisesManager {
    private promises: Promise<unknown>[] = [];

    public addPromise(promise: Promise<unknown>) {
        this.promises.push(promise);
    }

    public awaitPromises(): Promise<void> {
        return Promise.allSettled(this.promises).then(() => {
            this.promises = [];
        });
    }

    public hasPromises() {
        return Boolean(this.promises.length);
    }
}

export { SsrPromisesManager };
