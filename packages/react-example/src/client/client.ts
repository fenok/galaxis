import { hydrate } from 'react-dom';
import { createElement } from 'react';
import { App } from './app/components/App';

hydrate(createElement(App), document.getElementById('root'));
