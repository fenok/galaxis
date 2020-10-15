import { renderToStaticMarkup } from 'react-dom/server';
import { SsrPromisesManager } from '../../core';
import * as React from 'react';
import { SsrPromisesManagerContext } from './SsrPromisesManagerContext';

/**
 * https://github.com/apollographql/react-apollo/blob/master/packages/ssr/src/getDataFromTree.ts
 */
export function getDataFromTree(tree: React.ReactNode): Promise<string> {
    const ssrPromisesManager = new SsrPromisesManager();

    function process(): Promise<string> | string {
        const html = renderToStaticMarkup(
            React.createElement(SsrPromisesManagerContext.Provider, { value: ssrPromisesManager }, tree),
        );

        return ssrPromisesManager.hasPromises() ? ssrPromisesManager.awaitPromises().then(process) : html;
    }

    return Promise.resolve().then(process);
}
