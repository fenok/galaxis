import { PartialRequestData } from '../../request';
import { getIdUrl } from '../../request/functions/getId';
import { getUrlDefault } from '../../request/functions/getUrl';
import { mergeShallow } from '../../request/functions/merge';
import { Client } from '../Client';
import {Cache} from '../../cache'

const FIRST_ITEM = {
    id: 1,
    title: 'Foo'
};

const SECOND_ITEM = {
    id: 2,
    title: 'Bar'
};

const ALTERED_ITEM = {
    id: 1,
    title: 'Altered'
}

const INITIAL_FAKE_BACKEND_STATE: FakeBackendState = {
    items: {
        "1": FIRST_ITEM,
        "2": SECOND_ITEM
    }
};

let fakeBackendState = JSON.parse(JSON.stringify(INITIAL_FAKE_BACKEND_STATE));

interface FakeBackendState {
    items: Record<string, Item>;
}

interface CacheState {
    items: {[key: string]: Item};
}

interface ResponseData {
    data: Item;
}

interface Item {id: number; title: string}


const fetchFn = (url: string, {method, body}: RequestInit) => {
    if(url.includes('/item/')) {
        const id = url[url.length - 1];

        if (method === 'POST' && typeof body === 'string') {
            return new Promise(resolve => {
                fakeBackendState.items[id] = JSON.parse(body);
                resolve({ data: fakeBackendState.items[id] });
            })
        } else {
            return new Promise(resolve => {
                const response = { data: fakeBackendState.items[id] };

                setTimeout(() => {
                    resolve(response)
                }, 100)
            })
        }
    } else {
        return Promise.reject({error: {code: 'INVALID_PATH'}});
    }
};

const client = new Client({
    cache: new Cache(),
    fetch: fetchFn as typeof fetch,
    generalRequestData: {
        root: 'http://test.test',
        fetchPolicy: 'cache-and-network',
        getId: getIdUrl,
        getUrl: getUrlDefault,
        merge: mergeShallow,
        processResponse(response) {
            return response as any
        }
    },
});

const request: PartialRequestData<CacheState, ResponseData, {id: string}> = {
    pathParams: {id: '1'},
    path: '/item/:id',
};

const requestWithSharedData: PartialRequestData<CacheState, ResponseData, {id: string}> = {
    ...request,
    toCache(sharedData, responseData, request) {
        return {
            ...sharedData,
            items: {...(sharedData.items || {}), [request.pathParams.id]: responseData.data}
        };
    },
    fromCache(sharedData, request) {
        return {data: sharedData.items[request.pathParams.id]};
    }
};

it('can query data', async() => {
    fakeBackendState = JSON.parse(JSON.stringify(INITIAL_FAKE_BACKEND_STATE));

    let response = await client.query({...request, pathParams: {id: "1"}}, {callerId: 'test'});

    expect(response).toEqual({data: FIRST_ITEM})
});

it('can mutate data', async() => {
    fakeBackendState = JSON.parse(JSON.stringify(INITIAL_FAKE_BACKEND_STATE));

    let response = await client.mutate({...request, pathParams: {id: "1"}, method: 'POST', body: JSON.stringify(ALTERED_ITEM)}, {callerId: 'test'});

    expect(response).toEqual({data: ALTERED_ITEM})
});

it('caches queried data', async() => {
    fakeBackendState = JSON.parse(JSON.stringify(INITIAL_FAKE_BACKEND_STATE));

    await client.query({...request, pathParams: {id: "1"}}, {callerId: 'test'});
    let {data: responseFromCache} = client.getState({...request, pathParams: {id: "1"}}, 'test');

    expect(responseFromCache).toEqual({data: FIRST_ITEM})
});

it('caches queried data for request with custom caching', async() => {
    fakeBackendState = JSON.parse(JSON.stringify(INITIAL_FAKE_BACKEND_STATE));

    await client.query({...requestWithSharedData, pathParams: {id: "1"}}, {callerId: 'test'});
    let {data: responseFromCache} = client.getState({...requestWithSharedData, pathParams: {id: "1"}}, 'test');

    expect(responseFromCache).toEqual({data: FIRST_ITEM})
});

it("guarantees that old query data won't overwrite state after mutation", async() => {
    fakeBackendState = JSON.parse(JSON.stringify(INITIAL_FAKE_BACKEND_STATE));

    const queryPromise = client.query({...requestWithSharedData, pathParams: {id: "1"}}, {callerId: 'test'});
    const mutatePromise = client.mutate({...requestWithSharedData, pathParams: {id: "1"}, method: 'POST', body: JSON.stringify(ALTERED_ITEM)}, {callerId: 'test'});

    await Promise.all([queryPromise, mutatePromise]);

    const {data: responseFromCache} = client.getState({...request, pathParams: {id: "1"}}, 'test');

    expect(responseFromCache).toEqual({data: ALTERED_ITEM})
});
