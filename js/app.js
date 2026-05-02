let currentUser = null;

function colorFromName(name) {
    const colors = ["ffadad","ffd6a5","fdffb6","caffbf","9bf6ff","a0c4ff","bdb2ff","ffc6ff"];
    const index = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
    return colors[index];
}

function avatarUrl(displayName) {
    const color = colorFromName(displayName);
    return `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(displayName[0])}&backgroundColor=${color}`;
}

function renderProfile(user) {
    const name = user.display_name || user.username;
    window._userName = name;

    // Sidebar avatar
    const avatarEl = document.getElementById('sidebarAvatar');
    avatarEl.innerHTML = `<img src="${avatarUrl(name)}" width="36" height="36" alt="${name}" />`;
    document.getElementById('sidebarName').textContent = name;

    // Greeting
    const h = new Date().getHours();
    const greeting = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
    document.getElementById('pageTitle').innerHTML =
        `Good ${greeting}, <span>${name}</span> 👋`;
}

async function loadHomeStats() {
    // Event count
    const res = await api.get('/events');
    if (res && res.ok) {
        const events = await res.json();
        document.getElementById('statEvents').textContent = events.length;
        document.getElementById('eventCount').textContent = events.length;
        renderUpcomingList(events);
        renderNextEvent(events);
    }

    // Yap count
    const yapRes = await api.get('/yaps?page=1&page_size=100');
    if (yapRes && yapRes.ok) {
        const yaps = await yapRes.json();
        document.getElementById('statYaps').textContent = yaps.length;
    }
}

function renderNextEvent(events) {
    const now = new Date();
    const upcoming = events
        .map(e => ({ ...e, _d: new Date(e.date?.$date?.$numberLong ? Number(e.date.$date.$numberLong) : e.date) }))
        .filter(e => e._d >= now)
        .sort((a, b) => a._d - b._d);

    if (!upcoming.length) {
        document.getElementById('nextEventTitle').textContent = 'No upcoming events';
        document.getElementById('nextUpTitle').textContent = 'No upcoming events';
        return;
    }

    const next = upcoming[0];
    if (!next) return;

    const dateStr = next._d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    // Home card
    document.getElementById('nextEventEmoji').textContent = next.icon;
    document.getElementById('nextEventTitle').textContent = next.title;
    document.getElementById('nextEventMeta').textContent = `${dateStr} · ${next.time}`;
    document.getElementById('nextEventBadge').textContent = next.location || next.category;

    // Right panel next up
    document.getElementById('nextUpEmoji').textContent = next.icon;
    document.getElementById('nextUpTitle').textContent = next.title;
    document.getElementById('nextUpMeta').textContent = `${dateStr} · ${next.time}`;

    // Load RSVPs for next event
    const id = next._id?.$oid;
    if (id) loadNextEventRsvp(id);
}

async function loadNextEventRsvp(eventId) {
    setActiveRsvpEvent(eventId);
    window._nextEventId = eventId;
    const res = await api.get(`/events/${eventId}/rsvps`);
    if (!res || !res.ok) return;
    const data = await res.json();
    document.getElementById('statYes').textContent    = data.yes;
}

function renderUpcomingList(events) {
    const now = new Date();
    const catColors = {
        drinks:  '#E2C4AA',
        dining:  '#E2C4AA',
        daytrip: '#C0DCE0',
        yapping: '#CAD2C5',
    };
    const upcoming = events
        .map(e => ({ ...e, _d: new Date(Number(e.date.$date.$numberLong)) }))
        .filter(e => e._d >= now)
        .sort((a, b) => a._d - b._d)
        .slice(0, 8);

    const list = document.getElementById('upcomingList');
    list.innerHTML = '';
    upcoming.forEach(event => {
        const dateStr = event._d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const item = document.createElement('div');
        item.className = 'upcoming-item';
        item.innerHTML = `
            <div class="upcoming-dot" style="background:${catColors[event.category] || '#ccc'}"></div>
            <div class="upcoming-item-info">
                <div class="upcoming-item-title">${event.icon} ${event.title}</div>
                <div class="upcoming-item-meta">${dateStr} · ${event.time}</div>
            </div>
            <span class="upcoming-item-cat" style="background:${catColors[event.category]}20;color:var(--muted)">${event.category}</span>
        `;
        item.addEventListener('click', () => navigate('calendar'));
        list.appendChild(item);
    });
}

async function loadMembers() {
    const res = await api.get('/users');
    if (!res || !res.ok) return;
    const users = await res.json();
    const grid = document.getElementById('membersGrid');
    grid.innerHTML = '';
    users.forEach(user => {
        const name = user.display_name || user.username;
        const card = document.createElement('div');
        card.className = 'member-card';
        card.innerHTML = `
            <div class="member-avatar">
                <img src="${avatarUrl(name)}" width="60" height="60" alt="${name}" />
            </div>
            <div class="member-name">${name}</div>
            <div class="member-username">@${user.username}</div>
            ${user.bio ? `<div class="member-bio">${user.bio}</div>` : ''}
            ${user.is_admin ? `<span class="member-badge">✦ Admin</span>` : ''}
        `;
        grid.appendChild(card);
    });
}

async function boot() {
    if (!getToken()) {
        window.location.href = '/login.html';
        return;
    }

    try {
        const res = await api.get('/me');
        if (!res) return;
        currentUser = await res.json();
        renderProfile(currentUser);
    } catch (e) {
        console.error('Boot failed', e);
    }

    await Promise.all([
        initCalendar(),
        initWeather(),
        initPolls(),
        initYaps(),
        loadHomeStats(),
        loadMembers(),
    ]);
}

document.addEventListener('DOMContentLoaded', boot);