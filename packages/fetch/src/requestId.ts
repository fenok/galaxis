import { FetchResource } from './types';
import { getUrl } from './getUrl';

export interface RequestIdOptions {
    hash(resource: FetchResource): string;
}

export function requestId({ hash }: RequestIdOptions) {
    return (resource: FetchResource) => {
        return `${getUrl({ resource })}:${hash(resource)}`;
    };
}
