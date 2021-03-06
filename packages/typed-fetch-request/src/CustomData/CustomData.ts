export abstract class CustomData<D> {
    public readonly data: D;
    public abstract readonly contentType: string;

    constructor(data: D) {
        this.data = data;
    }

    public abstract serialize(): string;
}
