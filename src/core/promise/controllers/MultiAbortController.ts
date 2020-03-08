import { EventListenerManager, EventTarget } from './EventTarget';

export type MultiAbortSignal = EventListenerManager<'abort', boolean> & { aborted?: boolean; multi?: boolean };

export class MultiAbortController {
    private readonly _signal: EventTarget<'abort', boolean> & {
        aborted?: boolean;
        multi?: boolean;
    } = new EventTarget();
    public readonly signal: MultiAbortSignal = this._signal;

    public abort(multi = false) {
        if (!this._signal.aborted) {
            this._signal.aborted = true;
            this._signal.multi = multi;
            this._signal.dispatchEvent('abort', multi);
        }
    }
}
