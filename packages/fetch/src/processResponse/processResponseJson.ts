import { ResponseError } from '../errors';

export async function processResponseJson(response: Response) {
    if (!response.ok) {
        throw new ResponseError(
            await response.json(),
            response.status,
            response.statusText || `Request failed with status ${response.status}`,
        );
    }

    return response.json();
}
