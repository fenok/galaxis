import { createApp } from 'vue';
import App from './app/components/App.vue';
import { getClient } from './app/lib/getClient';

createApp(App, { client: getClient({}) }).mount('#root');
