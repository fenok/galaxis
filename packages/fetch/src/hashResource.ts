import { FetchResource } from './types';
import { getUrl } from './getUrl';

export interface HashResourceOptions {
    hash(value: unknown): string;
}

export function hashResource({ hash }: HashResourceOptions) {
    return (resource: FetchResource) => {
        return `${getUrl({ resource })}:${hash(resource)}`;
    };
}
