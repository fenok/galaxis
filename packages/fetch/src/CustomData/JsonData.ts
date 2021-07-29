import { CustomData } from './CustomData';

export class JsonData<T> extends CustomData<T> {
    public readonly contentType = 'application/json';

    public serialize(): string {
        return JSON.stringify(this.data);
    }
}
