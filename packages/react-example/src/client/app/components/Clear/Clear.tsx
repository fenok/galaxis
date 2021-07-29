import { FC } from 'react';
import { useClient } from '../../lib/Client';

const Clear: FC = () => {
    const client = useClient();

    return (
        <button
            onClick={() => {
                client.getCache().clear();
            }}
        >
            clear
        </button>
    );
};

export { Clear };
