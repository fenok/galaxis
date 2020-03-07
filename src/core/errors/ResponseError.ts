class ResponseError<R> extends Error {
    public readonly name = "ResponseError";
    public readonly response: R;

    constructor(response: R, message?: string) {
        super(message);

        this.response = response;
    }
}

export {ResponseError};
