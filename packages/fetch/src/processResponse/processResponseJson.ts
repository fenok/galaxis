import { NonUndefined } from '@galaxis/core';
import { ResponseError } from '../errors';

export async function processResponseJson<D extends NonUndefined>(response: Response): Promise<D> {
    if (!response.ok) {
        throw new ResponseError(
            await response.json(),
            response.status,
            response.statusText || `Request failed with status ${response.status}`,
        );
    }

    return (await response.json()) as D;
}
