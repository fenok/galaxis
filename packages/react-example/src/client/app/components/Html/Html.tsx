import { CacheData } from '../../lib/CacheData';
import { CacheState, ErrorObject } from '@fetcher/in-memory-cache';
import { FC } from 'react';

interface Props {
    content: string;
    fetcherState: CacheState<CacheData, ErrorObject>;
}

const Html: FC<Props> = ({ content, fetcherState }) => {
    return (
        <html>
            <head>
                <link
                    rel="icon"
                    href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text x=%2250%%22 y=%2250%%22 font-size=%2285%22 text-anchor=%22middle%22 dominant-baseline=%22central%22>🌌</text></svg>"
                />
                <title>Fetcher React Example</title>
            </head>
            <body>
                <div
                    id="root"
                    dangerouslySetInnerHTML={{
                        __html: content,
                    }}
                />
                <script
                    dangerouslySetInnerHTML={{
                        __html: Object.entries({
                            FETCHER_STATE: JSON.stringify(fetcherState),
                        })
                            .map(([key, value]) => `window.${key}=${value};`)
                            .join(''),
                    }}
                />
                <script src={'/client.bundle.js'} />
            </body>
        </html>
    );
};

export { Html };
export type { Props };
