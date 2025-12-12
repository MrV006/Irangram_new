
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Define target hosts
    const FIRESTORE_HOST = 'firestore.googleapis.com';
    const AUTH_HOST = 'identitytoolkit.googleapis.com';
    const STORAGE_HOST = 'firebasestorage.googleapis.com';
    
    // --- CORS HANDLING (Preflight) ---
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
          'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || 'Content-Type, Authorization, x-goog-api-client, x-goog-request-params, x-firebase-gmpid, x-firebase-client, x-requested-with',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    let targetUrl = '';
    
    // --- ROUTING LOGIC ---
    
    // 1. Firestore Database Traffic
    if (url.pathname.startsWith('/google.firestore') || url.pathname.startsWith('/v1/projects')) {
       if (url.pathname.includes('accounts:')) {
           targetUrl = `https://${AUTH_HOST}${url.pathname}${url.search}`;
       } else {
           targetUrl = `https://${FIRESTORE_HOST}${url.pathname}${url.search}`;
       }
    } 
    // 2. Auth Routes
    else if (url.pathname.startsWith('/identitytoolkit')) {
       targetUrl = `https://${AUTH_HOST}${url.pathname}${url.search}`;
    }
    // 3. Storage (JSON API starts with /v0/b/)
    else if (url.pathname.startsWith('/v0/b/')) {
        targetUrl = `https://${STORAGE_HOST}${url.pathname}${url.search}`;
    }
    // 4. Default fallback to Firestore
    else {
        targetUrl = `https://${FIRESTORE_HOST}${url.pathname}${url.search}`;
    }

    // --- REQUEST HANDLING ---

    const newRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'follow'
    });

    // Note: 'Host' header is automatically managed by Cloudflare Workers fetch
    
    try {
      const response = await fetch(newRequest);
      const newResponse = new Response(response.body, response);
      
      newResponse.headers.set('Access-Control-Allow-Origin', '*');
      newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      newResponse.headers.set('Access-Control-Allow-Headers', '*');
      newResponse.headers.set('Access-Control-Expose-Headers', '*');
      
      return newResponse;
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { 
        status: 500,
        headers: { 
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        }
      });
    }
  },
};
