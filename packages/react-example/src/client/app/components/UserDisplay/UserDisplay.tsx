import { FC, useState } from 'react';
import { userQuery } from '../../requests/user';
import { FetchPolicy, useQuery } from '@fetcher/react';
import { isResponseError } from '../../lib/isResponseError';

interface Props {
    fetchPolicy: FetchPolicy;
}

const UserDisplay: FC<Props> = ({ fetchPolicy }) => {
    const [userId, setUserId] = useState(1);

    const { data, error, loading, refetch, abort, execute, executed, reset } = useQuery(
        userQuery({
            requestParams: { pathParams: { id: userId } },
            fetchPolicy,
        }),
    );

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
            <button disabled={!executed} onClick={reset}>
                Reset
            </button>
            <button onClick={() => setUserId((prevId) => prevId + 1)}>Increment user id</button>
            <button onClick={() => setUserId((prevId) => prevId - 1)}>Decrement user id</button>
            <div>User id: {userId}</div>
            <div>Fetch policy: {fetchPolicy}</div>
            <div>Executed: {JSON.stringify(executed)}</div>
            <div>Data: {JSON.stringify(data)}</div>
            <div>Loading: {JSON.stringify(loading)}</div>
            <div>Error: {formatError(error)}</div>
        </div>
    );
};

function formatError(error: Error | undefined) {
    return error
        ? JSON.stringify({
              name: error.name,
              message: error.message,
              response: isResponseError(error) ? error.response : undefined,
          })
        : undefined;
}

export { UserDisplay };
