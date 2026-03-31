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
    // Default to the provided host or window.location.hostname
    let baseHost = import.meta.env.VITE_REVERB_HOST || window.location.hostname;
    const tenantDomain = getTenantDomain();
    
    // If we're on localhost or don't have a tenant, use the base host
    if (!tenantDomain || baseHost === 'localhost' || baseHost === '127.0.0.1') {
        return baseHost;
    }

    // If the baseHost is api.relink.ge, we want [tenant].api.relink.ge
    // But if we're on [tenant].relink.ge, the baseHost might already be configured.
    // If it's a generic host like api.relink.ge, prepend.
    if (!baseHost.startsWith(`${tenantDomain}.`)) {
        return `${tenantDomain}.${baseHost}`;
    }
    
    return baseHost;
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
