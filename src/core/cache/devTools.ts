interface ReduxDevtoolExtension {
    connect(): ReduxDevTools;
}

interface ReduxDevTools {
    send(action: Action, state: any): void;
    subscribe(callback: (message: Message) => void): void;
}

type Action = {
    type: string;
} & { [key: string]: any };

interface Message {
    type: 'DISPATCH';
    payload: {
        type: 'JUMP_TO_ACTION';
    };
    state: string;
}

const devTools =
    typeof window !== 'undefined' && (window as any).__REDUX_DEVTOOLS_EXTENSION__
        ? ((window as any).__REDUX_DEVTOOLS_EXTENSION__ as ReduxDevtoolExtension)
        : undefined;

export { devTools, ReduxDevTools };
