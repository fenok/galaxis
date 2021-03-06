import { CustomData } from './CustomData';

export class JsonData<D> extends CustomData<D> {
    public readonly contentType = 'application/json';

    public serialize(): string {
        return JSON.stringify(this.data);
    }
}
