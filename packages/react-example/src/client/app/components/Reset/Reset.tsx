import { FC } from 'react';
import { useClient } from '@galaxis/react';

const Reset: FC = () => {
    const client = useClient();

    return <button onClick={() => client.reset()}>reset</button>;
};

export { Reset };
