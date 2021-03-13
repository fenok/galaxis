declare global {
    interface Window {
        __REDUX_DEVTOOLS_EXTENSION__?: ReduxDevtoolExtension;
    }
}

interface ReduxDevtoolExtension {
    connect(opts?: Options): ReduxDevTools;
}

interface Options {
    serialize?: {
        replacer?(key: string, value: unknown): unknown;
    };
}

interface ReduxDevTools {
    send(action: Action, state: any): void;
    subscribe(callback: (message: Message) => void): void;
}

type Action = {
    type: string;
} & { [key: string]: any };

interface Message {
    type: 'DISPATCH' | 'OTHER';
    payload: {
        type: 'JUMP_TO_ACTION' | 'OTHER';
    };
    state: string;
}

const devTools =
    typeof window !== 'undefined' && window.__REDUX_DEVTOOLS_EXTENSION__
        ? window.__REDUX_DEVTOOLS_EXTENSION__
        : undefined;

export { devTools, ReduxDevTools };
