import { FC, useState } from 'react';
import { userQuery } from '../../requests/user';
import { FetchPolicy, useQuery } from '@galaxis/react';
import { isResponseError } from '../../lib/isResponseError';

interface Props {
    fetchPolicy: FetchPolicy;
}

const UserDisplay: FC<Props> = ({ fetchPolicy }) => {
    const [userId, setUserId] = useState(1);

    const { data, error, loading, refetch } = useQuery(
        userQuery({
            requestParams: { pathParams: { id: userId } },
            fetchPolicy,
        }),
    );

    return (
        <div>
            <button onClick={refetch}>Refetch</button>
            <button onClick={() => setUserId((prevId) => prevId + 1)}>Increment user id</button>
            <button onClick={() => setUserId((prevId) => prevId - 1)}>Decrement user id</button>
            <div>User id: {userId}</div>
            <div>Fetch policy: {fetchPolicy}</div>
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
