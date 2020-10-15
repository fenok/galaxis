import queryString from 'query-string';

export function stringifyQuery(query?: { [key: string]: string | null | undefined }): string {
    return query && Object.values(query).length ? `?${queryString.stringify(query, { arrayFormat: 'bracket' })}` : '';
}
