import { Request, Response } from 'express';
import { createElement } from 'react';
import { Html } from './app/components/Html';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { App } from './app/components/App';
import { getClient } from './app/lib/Client';
import { getDataFromTree } from '@galaxis/react';
import fetchFn from 'node-fetch';

export default async function ssrMiddleware(_: Request, res: Response<unknown>) {
    const client = getClient({ fetch: fetchFn as unknown as typeof fetch });

    console.log('Creating app...');
    const app = createElement(App, { client });

    console.log('Waiting for data...');
    await getDataFromTree(app);

    const galaxisState = client.getCache().extract();

    console.log('Creating html...');
    const html = createElement(Html, { content: renderToString(app), galaxisState });

    res.send(renderToStaticMarkup(html));
}
