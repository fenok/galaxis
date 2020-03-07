import { EventListenerManager, EventTarget } from './EventTarget';

export type RerunSignal = EventListenerManager<'rerun'>;

export class RerunController {
    private readonly _signal: EventTarget<'rerun'> = new EventTarget();
    public readonly signal: RerunSignal = this._signal;

    public rerun() {
        this._signal.dispatchEvent('rerun', undefined);
    }
}
