import { EventListenerManager, EventTarget } from './EventTarget';

export type EnableSignal = EventListenerManager<'enable'> & { enabled?: boolean };

export class EnableController {
    private readonly _signal: EventTarget<'enable'> & { enabled?: boolean } = new EventTarget();
    public readonly signal: EnableSignal = this._signal;

    public enable() {
        if (!this._signal.enabled) {
            this.signal.enabled = true;
            this._signal.dispatchEvent('enable', undefined);
        }
    }
}
