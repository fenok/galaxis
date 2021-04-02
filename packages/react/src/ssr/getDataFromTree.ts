import { renderToStaticMarkup } from 'react-dom/server';
import { SsrPromisesManager } from '@galaxis/core';
import { SsrPromisesManagerContext } from './SsrPromisesManagerContext';
import { ReactNode, createElement } from 'react';

/**
 * https://github.com/apollographql/react-apollo/blob/master/packages/ssr/src/getDataFromTree.ts
 */
export function getDataFromTree(tree: ReactNode): Promise<string> {
    const ssrPromisesManager = new SsrPromisesManager();

    function process(): Promise<string> | string {
        const html = renderToStaticMarkup(
            createElement(SsrPromisesManagerContext.Provider, { value: ssrPromisesManager }, tree),
        );

        return ssrPromisesManager.hasPromises() ? ssrPromisesManager.awaitPromises().then(process) : html;
    }

    return Promise.resolve().then(process);
}
