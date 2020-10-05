export class EventListenerManager<T extends string = string, D = any> {
    protected listeners: { [type: string]: ((data: D) => void)[] | undefined } = {};

    public addEventListener(type: T, callback: (data: D) => void) {
        this.listeners[type] = this.listeners[type] ?? [];
        this.listeners[type]?.push(callback);
    }

    public removeEventListener(type: T, callback: (data: D) => void) {
        this.listeners[type] = this.listeners[type] ?? [];
        this.listeners[type] = this.listeners[type]?.filter(cb => cb !== callback);
    }
}

export class EventTarget<T extends string = string, D = any> extends EventListenerManager {
    public dispatchEvent(type: T, data: D) {
        this.listeners[type] = this.listeners[type] ?? [];
        this.listeners[type]?.forEach(cb => cb(data));
    }
}
