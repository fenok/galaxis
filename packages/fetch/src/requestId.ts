import { FetchResource } from './types';
import { getUrl } from './getUrl';

export interface GetRequestIdOptions {
    hash(value: unknown): string;
}

export function requestId({ hash }: GetRequestIdOptions) {
    return (resource: FetchResource) => {
        return `${getUrl({ resource })}:${hash(resource)}`;
    };
}
