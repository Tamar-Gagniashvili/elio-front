export const getTenantDomain = () => {
    const hostname = window.location.hostname;
    
    // Ignore IP addresses
    if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname)) return null;
    if (hostname === 'localhost') return null;

    const parts = hostname.split('.');
    
    // Check for subdomain (e.g., acme.relink.app or acme.localhost)
    if (parts.length >= 2) {
      // If it's something like acme.localhost, return acme
      if (parts[parts.length - 1] === 'localhost') {
        return parts.slice(0, -1).join('.');
      }
      // If it's acme.relink.app, return acme
      if (parts.length >= 3) {
        return parts.slice(0, -2).join('.');
      }
    }
    return null;
};

const getApiUrl = () => {
    // Default to 8000 as per user's server configuration
    const baseApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/$/, '');
    const tenantDomain = getTenantDomain();
    
    if (!tenantDomain) return baseApiUrl;

    try {
        const url = new URL(baseApiUrl);
        // Prepend subdomain. Handle case where hostname might be localhost or an IP
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
            url.hostname = `${tenantDomain}.localhost`;
        } else {
            url.hostname = `${tenantDomain}.${url.hostname}`;
        }
        return url.toString().replace(/\/$/, '');
    } catch (e) {
        console.error('Failed to construct API URL', e);
        return baseApiUrl;
    }
};

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

/**
 * A simple fetch wrapper to communicate with the custom Laravel backend.
 */
export const api = {
    get: async <T>(endpoint: string): Promise<T> => {
        const res = await fetch(`${getApiUrl()}${endpoint}`, {
            headers: getHeaders()
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    post: async <T>(endpoint: string, data: any): Promise<T> => {
        const res = await fetch(`${getApiUrl()}${endpoint}`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    put: async <T>(endpoint: string, data: any): Promise<T> => {
        const res = await fetch(`${getApiUrl()}${endpoint}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    delete: async <T>(endpoint: string): Promise<T> => {
        const res = await fetch(`${getApiUrl()}${endpoint}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },

    /**
     * Replaces supabase.functions.invoke()
     * Allows frontend to easily call our new Laravel translated functions.
     */
    invoke: async <T>(functionName: string, options?: { body?: any }): Promise<{ data: T | null; error: Error | null }> => {
        try {
            const isFormData = options?.body instanceof FormData;
            const headers = getHeaders() as Record<string, string>;
            if (isFormData) {
                delete headers['Content-Type']; // Let the browser set it with boundary
            }
            
            const res = await fetch(`${getApiUrl()}/functions/${functionName}`, {
                method: 'POST',
                headers,
                body: isFormData ? options.body : (options?.body ? JSON.stringify(options.body) : undefined)
            });
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            return { data, error: null };
        } catch (e: any) {
            return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
        }
    }
};
