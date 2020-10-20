import { hydrate } from 'react-dom';
import { createElement } from 'react';
import { App } from './app/components/App';
import { getClient } from './app/client/getClient';

hydrate(createElement(App, { client: getClient() }), document.getElementById('root'));
