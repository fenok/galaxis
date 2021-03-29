export abstract class CustomData<T> {
    public readonly data: T;
    public abstract readonly contentType: string;

    constructor(data: T) {
        this.data = data;
    }

    public abstract serialize(): string;
}
