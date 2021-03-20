import {
    getFirstItemRequest,
    FIRST_ITEM,
    getClient,
    FIRST_ITEM_UPDATE_DTO,
    FIRST_ITEM_UPDATED,
} from '../../test-utils/request-helpers';

it('guarantees that mutation waits for loading queries', async () => {
    const client = getClient();
    const firstItemRequest = getFirstItemRequest();

    const queryResult = client.watchQuery({
        ...firstItemRequest,
        requestParams: { ...firstItemRequest.requestParams, time: 400 },
    });

    const mutationResult = client.mutate({
        ...firstItemRequest,
        requestParams: { ...firstItemRequest.requestParams, time: 100, updateItem: FIRST_ITEM_UPDATE_DTO },
    });

    const finalQueryResult = client.watchQuery({
        ...firstItemRequest,
        requestParams: { ...firstItemRequest.requestParams, time: 100 },
    });

    await expect(queryResult.request).resolves.toEqual(FIRST_ITEM);
    await expect(mutationResult).resolves.toEqual(FIRST_ITEM_UPDATED);
    await expect(finalQueryResult.request).resolves.toEqual(FIRST_ITEM_UPDATED);

    const cacheState = client.getQueryState(firstItemRequest);

    expect(cacheState.cache).toMatchObject({ error: undefined, data: FIRST_ITEM_UPDATED });
});
