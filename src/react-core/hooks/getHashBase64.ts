import { Buffer as BufferExternal } from 'buffer';

export function getHashBase64(request: object) {
    return (typeof Buffer !== 'undefined' ? Buffer : BufferExternal).from(JSON.stringify(request)).toString('base64');
}
