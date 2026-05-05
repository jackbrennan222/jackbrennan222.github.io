const BASE_URL = "https://api.jackbrennan.dev";

function getToken() {
    return localStorage.getItem("token");
}

function isTokenExpired(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return Date.now() >= payload.exp * 1000;
    } catch {
        return true;
    }
}

function setTokenPair(data) {
    localStorage.setItem('token', data.token);
    if (data.refresh_token) {
        localStorage.setItem('refreshToken', data.refresh_token);
    }
}

async function tryRefresh() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;
    const res = await fetch(`${BASE_URL}/refresh`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${refreshToken}`,
        },
    });
    if (!res.ok) return false;
    const data = await res.json();
    setTokenPair(data);
    return true;
}

function clearToken() {
    localStorage.removeItem("token");
}

async function request(path, options = {}) {
    const token = getToken();
    const headers = {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers,
    });

    if (res.status === 401) {
        const refreshed = await tryRefresh();
        if (!refreshed) {
            clearToken();
            window.location.href = '/login.html';
            return;
        }
        res = await fetch(`${BASE_URL}${path}`, buildOptions(options));
    }

    return res;
}

const api = {
    get:    (path)         => request(path, { method: "GET" }),
    post:   (path, body)   => request(path, { method: "POST",   body: JSON.stringify(body) }),
    patch:  (path, body)   => request(path, { method: "PATCH",  body: JSON.stringify(body) }),
    delete: (path)         => request(path, { method: "DELETE" }),
};