import * as React from 'react';

interface Props {
    content: string;
    fetcherState: unknown;
}

const Html: React.FC<Props> = ({ content, fetcherState }) => {
    return (
        <html>
            <head>
                <link
                    rel="icon"
                    href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🗃️</text></svg>"
                />
                <title>Fetcher React Example</title>
            </head>
            <body>
                <div
                    id="root"
                    dangerouslySetInnerHTML={{
                        __html: content,
                    }}
                ></div>
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
