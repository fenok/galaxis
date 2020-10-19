import * as React from 'react';

interface Props {
    content: string;
}

const Html: React.FC<Props> = ({ content }) => {
    return (
        <html>
            <div
                id="root"
                dangerouslySetInnerHTML={{
                    __html: content,
                }}
            ></div>
            <script src={'/client.bundle.js'} />
        </html>
    );
};

export { Html };
export type { Props };
