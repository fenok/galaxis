import { ResponseError } from '../errors';

export async function processResponseRestfulJson(response: Response) {
    if (!response.ok) {
        throw new ResponseError(await response.json(), 'Response was not successful');
    }

    return response.json();
}
