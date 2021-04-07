import { Request, Response } from 'express';
import { createSSRApp } from 'vue';
import { renderToString } from '@vue/server-renderer';
import App from './app/components/App.vue';
import { getClient } from './app/lib/getClient';
import fetchFn from 'node-fetch';

export default async function ssrMiddleware(_: Request, res: Response<unknown>) {
    const client = getClient({ fetch: (fetchFn as unknown) as typeof fetch });

    const app = createSSRApp(App, { client });

    const content = await renderToString(app);

    const state = client.getCache().extract();

    res.send(
        '<html>\n' +
            '            <head>\n' +
            '                <link\n' +
            '                    rel="icon"\n' +
            '                    href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text x=%2250%%22 y=%2250%%22 font-size=%2285%22 text-anchor=%22middle%22 dominant-baseline=%22central%22>🌌</text></svg>"\n' +
            '                />\n' +
            '                <title>Galaxis Vue Example</title>\n' +
            '            </head>\n' +
            '            <body>\n' +
            '                <div id="root">' +
            content +
            '</div>\n' +
            `<script>window.GALAXIS_STATE=${JSON.stringify(state)}</script>` +
            '                <script src="/client.bundle.js"></script>\n' +
            '            </body>\n' +
            '        </html>',
    );
}
