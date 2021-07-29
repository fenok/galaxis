import {
    FIRST_ITEM,
    FIRST_ITEM_RESOURCE,
    FIRST_ITEM_UPDATE_DTO,
    FIRST_ITEM_UPDATED,
    fromCache,
    getClient,
    request,
    toCache,
} from './utils/request-helpers';

it('guarantees that mutation waits for loading queries', async () => {
    const client = getClient();

    const itemRequest = {
        request: request(),
        toCache,
        fromCache,
    };

    const queryResult = client.fetchQuery({
        ...itemRequest,
        resource: { ...FIRST_ITEM_RESOURCE, time: 400 },
    });

    const mutationResult = client.mutate({
        ...itemRequest,
        resource: { ...FIRST_ITEM_RESOURCE, time: 100, updateItem: FIRST_ITEM_UPDATE_DTO },
    });

    const finalQueryResult = client.fetchQuery({
        ...itemRequest,
        resource: { ...FIRST_ITEM_RESOURCE, time: 100 },
    });

    await expect(queryResult).resolves.toEqual(FIRST_ITEM);
    await expect(mutationResult).resolves.toEqual(FIRST_ITEM_UPDATED);
    await expect(finalQueryResult).resolves.toEqual(FIRST_ITEM_UPDATED);

    const cacheState = client.readQuery({ ...itemRequest, resource: FIRST_ITEM_RESOURCE });

    expect(cacheState).toMatchObject({ error: undefined, data: FIRST_ITEM_UPDATED });
});
