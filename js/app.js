let currentUser = null;

function colorFromName(name) {
    const colors = [
        "ffadad", "ffd6a5", "fdffb6",
        "caffbf", "9bf6ff", "a0c4ff",
        "bdb2ff", "ffc6ff"
    ];
    const index = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
    return colors[index];
}

function avatarUrl(displayName) {
    const color = colorFromName(displayName);
    return `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(displayName[0])}&backgroundColor=${color}`;
}

function renderProfile(user) {
    const name = user.display_name || user.username;

    // Sidebar avatar — swap letter for dicebear img
    const avatarEl = document.querySelector(".profile-mini .avatar");
    avatarEl.innerHTML = `<img src="${avatarUrl(name)}" width="38" height="38" style="border-radius:50%;display:block;margin-left:auto;margin-right-auto;" alt="${name}" />`;

    // Greeting
    const greeting = document.querySelector(".profile-mini p:first-child");
    greeting.textContent = `Hello, ${name}! 👋`;
}

async function boot() {
    if (!getToken()) {
        window.location.href = "/login.html";
        return;
    }

    try {
        const res = await api.get("/me");
        if (!res) return; // 401 redirect handled in api.js
        currentUser = await res.json();
        renderProfile(currentUser);
    } catch (e) {
        console.error("Boot failed", e);
    }

    // Init all modules
    await initCalendar();
    await initWeather();
    await initPolls();
    await initYaps();
}

document.addEventListener("DOMContentLoaded", boot);