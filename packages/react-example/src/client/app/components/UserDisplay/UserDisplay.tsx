import * as React from 'react';
import { useQuery, getHashBase64 } from '@fetcher/react';
import { userQuery } from '../../requests';

interface Props {}

const UserDisplay: React.FC<Props> = () => {
    const { data, error, loading, refetch } = useQuery(userQuery, { getQueryHash: getHashBase64 });

    return (
        <div>
            <button onClick={refetch}>Refetch</button>
            <div>{JSON.stringify(data?.map(({ name }) => name))}</div>
            <div>{JSON.stringify(loading)}</div>
            <div>{JSON.stringify(error)}</div>
        </div>
    );
};

export { UserDisplay };
