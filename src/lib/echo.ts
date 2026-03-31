import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { getTenantDomain } from './api';

declare global {
  interface Window {
    Pusher: typeof Pusher;
    Echo: any;
  }
}

window.Pusher = Pusher;

const getReverbHost = () => {
    // Reverb server usually runs on the base API domain for all tenants.
    // Prepending tenant subdomains to the WebSocket host often causes SSL/Nginx issues.
    return import.meta.env.VITE_REVERB_HOST || window.location.hostname;
};

export const echo = new (Echo as any)({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: getReverbHost(),
    wsPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
    wssPort: import.meta.env.VITE_REVERB_PORT ?? 443,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
    enabledTransports: ['ws', 'wss'],
});
