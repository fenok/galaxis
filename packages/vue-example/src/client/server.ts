import { Request, Response } from 'express';

export default function ssrMiddleware(_: Request, res: Response<unknown>) {
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
            '                <div id="root"></div>\n' +
            '                <script src="/client.bundle.js"></script>\n' +
            '            </body>\n' +
            '        </html>',
    );
}
