const BASE_URL = "https://api.jackbrennan.dev";

function getToken() {
    return localStorage.getItem("token");
}

function setToken(token) {
    localStorage.setItem("token", token);
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
        clearToken();
        window.location.href = "/login.html";
        return;
    }

    return res;
}

const api = {
    get:    (path)         => request(path, { method: "GET" }),
    post:   (path, body)   => request(path, { method: "POST",   body: JSON.stringify(body) }),
    patch:  (path, body)   => request(path, { method: "PATCH",  body: JSON.stringify(body) }),
    delete: (path)         => request(path, { method: "DELETE" }),
};