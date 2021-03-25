import * as React from 'react';
import { useState } from 'react';
import { userQuery } from '../../requests/user';
import { useQuery } from '@fetcher/react';
import { isResponseError } from '../../lib/isResponseError';

interface Props {
    variant: number;
}

const UserDisplay: React.FC<Props> = ({ variant }) => {
    const [userId, setUserId] = useState(1);

    const { data, error, loading, refetch, abort, execute, executed } = useQuery(
        userQuery({
            requestParams: { pathParams: { id: userId } },
            fetchPolicy: variant === 1 ? 'cache-and-network' : variant === 2 ? 'cache-only' : 'no-cache',
            lazy: true,
        }),
    );

    console.log('Render', variant, data?.name, error?.message, loading);

    return (
        <div>
            <button
                onClick={() => {
                    console.log(execute());
                }}
            >
                Execute
            </button>
            <button disabled={!executed} onClick={refetch}>
                Refetch
            </button>
            <button disabled={!loading} onClick={abort}>
                Abort
            </button>
            <button onClick={() => setUserId((prevId) => prevId + 1)}>Iterate user</button>
            <div>{JSON.stringify(executed)}</div>
            <div>{JSON.stringify(data?.name)}</div>
            <div>{JSON.stringify(loading)}</div>
            {isResponseError(error) ? (
                <div>
                    {JSON.stringify(error.message)}, {JSON.stringify(error.response)}, {JSON.stringify(error.code)}
                </div>
            ) : (
                error?.message || 'No error'
            )}
        </div>
    );
};

export { UserDisplay };
