export const getTenantDomain = () => {
    const hostname = window.location.hostname;
    
    // Ignore IP addresses and base domains
    if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname)) return null;
    if (hostname === 'localhost' || hostname === 'relink.app' || hostname === 'relink.ge' || hostname === 'api.relink.ge') return null;

    if (hostname.endsWith('.relink.ge')) {
      return hostname.replace('.relink.ge', '');
    }
    
    if (hostname.endsWith('.relink.app')) {
      return hostname.replace('.relink.app', '');
    }

    if (hostname.endsWith('.localhost')) {
       return hostname.replace('.localhost', '');
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
        // Prepend subdomain.
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
            url.hostname = `${tenantDomain}.localhost`;
        } else {
            // Ensure we don't double-prepend if it's already there
            if (!url.hostname.startsWith(`${tenantDomain}.`)) {
                url.hostname = `${tenantDomain}.${url.hostname}`;
            }
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

    delete: async <T>(endpoint: string): Promise<T | null> => {
        const res = await fetch(`${getApiUrl()}${endpoint}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!res.ok) throw new Error(await res.text());
        if (res.status === 204) return null;
        
        const text = await res.text();
        return text ? JSON.parse(text) : null;
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
