import { Request, Response } from 'express';
import { createElement } from 'react';
import { Html } from './app/components/Html';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { App } from './app/components/App';

export default function ssrMiddleware(_: Request, res: Response<unknown>) {
    const app = createElement(App);

    const html = createElement(Html, { content: renderToString(app) });

    res.send(renderToStaticMarkup(html));
}
