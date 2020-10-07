interface ReduxDevtoolExtension {
    connect(opts?: Options): ReduxDevTools;
}

interface Options {
    serialize?: {
        replacer?(key: string, value: any): any;
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
    typeof window !== 'undefined' && (window as any).__REDUX_DEVTOOLS_EXTENSION__
        ? ((window as any).__REDUX_DEVTOOLS_EXTENSION__ as ReduxDevtoolExtension)
        : undefined;

export { devTools, ReduxDevTools };
