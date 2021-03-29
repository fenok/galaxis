import queryString, { StringifiableRecord } from 'query-string';

export function stringifyQuery(query?: StringifiableRecord): string {
    return query && Object.values(query).length ? `?${queryString.stringify(query, { arrayFormat: 'bracket' })}` : '';
}
