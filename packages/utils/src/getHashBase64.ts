import { Buffer as BufferExternal } from 'buffer';

export function getHashBase64(object: unknown) {
    return (typeof Buffer !== 'undefined' ? Buffer : BufferExternal).from(JSON.stringify(object)).toString('base64');
}
