import { ResponseError } from '../errors';

export async function processResponse(response: Response) {
    if (!response.ok) {
        throw new ResponseError(await response.json(), 'Response was not successful');
    }

    return response.json();
}
