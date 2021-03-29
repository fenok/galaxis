class ResponseError<T> extends Error {
    public readonly name = 'ResponseError';
    public readonly response: T;
    public readonly code: number;

    constructor(response: T, code: number, message?: string) {
        super(message);

        this.response = response;
        this.code = code;
    }
}

export { ResponseError };
