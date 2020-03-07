export function getIdBase64(request: object) {
    return Buffer.from(JSON.stringify(request)).toString('base64');
}
