/**
 * @jest-environment node
 */

import {
    getQueryProcessor,
    getFirstItemRequest,
    FIRST_ITEM,
    getFailingFirstItemRequest,
    getNetworkError,
} from '../../test-utils/request-helpers';

it('does not return promise if there is error in cache', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemRequest = getFailingFirstItemRequest();

    const queryResult = queryProcessor.query(firstItemRequest, { requesterId: 'test' });

    await expect(queryResult.fromNetwork).rejects.toEqual(getNetworkError());

    const dataFromCache = queryProcessor.getCompleteRequestState(firstItemRequest, 'test');
    expect(dataFromCache).toEqual({ data: undefined, loading: [], error: getNetworkError() });

    const nextQueryResult = queryProcessor.query(firstItemRequest, { requesterId: 'test' });

    const postQueryDataFromCache = queryProcessor.getCompleteRequestState(firstItemRequest, 'test');
    expect(postQueryDataFromCache).toEqual({ data: undefined, loading: ['test'], error: getNetworkError() });

    expect(nextQueryResult.fromNetwork).toEqual(undefined);

    const nextDataFromCache = queryProcessor.getCompleteRequestState(firstItemRequest, 'test');

    expect(nextDataFromCache).toEqual({ data: undefined, loading: ['test'], error: getNetworkError() });
});

it('does not return promise if there is data in cache', async () => {
    const queryProcessor = getQueryProcessor();

    const firstItemRequest = getFirstItemRequest();

    const queryResult = queryProcessor.query(firstItemRequest, { requesterId: 'test' });

    await expect(queryResult.fromNetwork).resolves.toEqual(FIRST_ITEM);

    const dataFromCache = queryProcessor.getCompleteRequestState(firstItemRequest, 'test');

    expect(dataFromCache).toEqual({ data: FIRST_ITEM, loading: [], error: undefined });

    const nextQueryResult = queryProcessor.query(firstItemRequest, { requesterId: 'test' });

    expect(nextQueryResult.fromNetwork).toEqual(undefined);

    const nextDataFromCache = queryProcessor.getCompleteRequestState(firstItemRequest, 'test');

    expect(nextDataFromCache).toEqual({ data: FIRST_ITEM, loading: ['test'], error: undefined });
});

it('can opt-out from returning the promise', () => {
    const queryProcessor = getQueryProcessor();

    const firstItemRequest = getFirstItemRequest();

    const queryResult = queryProcessor.query({ ...firstItemRequest, disableSsr: true }, { requesterId: 'test' });
    expect(queryResult.fromNetwork).toEqual(undefined);

    const dataFromCache = queryProcessor.getCompleteRequestState(firstItemRequest, 'test');
    expect(dataFromCache).toEqual({ data: undefined, loading: ['test'], error: undefined });
});
