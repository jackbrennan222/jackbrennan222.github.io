async function login(username, password) {
    const res = await fetch(`${BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
    });

    if (!res.ok) throw new Error(await res.text());

    const data = await res.json();
    setTokenPair(data.token);
    return data;
}

async function register(username, password) {
    const res = await fetch(`${BASE_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
    });

    if (!res.ok) throw new Error(await res.text());
    return res.text();
}

function logout() {
    clearToken();
    window.location.href = "/login.html";
}