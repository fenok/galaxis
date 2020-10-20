import { Request, Response } from 'express';
import { createElement } from 'react';
import { Html } from './app/components/Html';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { App } from './app/components/App';
import { getClient } from './app/client/getClient';
import { getDataFromTree } from '@fetcher/react';

export default async function ssrMiddleware(_: Request, res: Response<unknown>) {
    const client = getClient();

    console.log('Creating app...');
    const app = createElement(App, { client });

    console.log('Waiting for data...');
    await getDataFromTree(app);

    const fetcherState = client.getCache().extract();

    console.log('Creating html...');
    const html = createElement(Html, { content: renderToString(app), fetcherState });

    res.send(renderToStaticMarkup(html));
}
