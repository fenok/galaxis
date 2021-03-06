import { hydrate } from 'react-dom';
import { createElement } from 'react';
import { App } from './app/components/App';
import { getClient } from './app/lib/getClient';

hydrate(createElement(App, { client: getClient() }), document.getElementById('root'));
