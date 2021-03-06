class ResponseError<R> extends Error {
    public readonly name = 'ResponseError';
    public readonly response: R;
    public readonly code: number;

    constructor(response: R, code: number, message?: string) {
        super(message);

        this.response = response;
        this.code = code;
    }
}

export { ResponseError };
