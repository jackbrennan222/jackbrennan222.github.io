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
        document.getElementById('eventCount').textContent = events.length;
        renderNextEvent(events);
    }

    // Yap count
    const yapRes = await api.get('/yaps?page=1&page_size=100');
    if (yapRes && yapRes.ok) {
        const yaps = await yapRes.json();
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

function addAdminNav() {
    const nav = document.querySelector('.nav');
    const adminSection = document.createElement('div');
    adminSection.innerHTML = `
        <div class="nav-section-label">Admin</div>
        <button class="nav-item" data-view="admin">
            <span class="nav-icon">⚙</span><span>Admin</span>
        </button>
    `;
    nav.appendChild(adminSection);

    // Register the new nav item for navigation
    adminSection.querySelectorAll('.nav-item[data-view]').forEach(btn => {
        btn.addEventListener('click', () => navigate(btn.dataset.view));
    });
}

function addEditButtons() {
    const modalHead = document.getElementById("eventDetailModalHead");
    
    if (modalHead.querySelector('.edit-btn')) return;

    const editButton = document.createElement('button');
    editButton.className = 'edit-btn';
    editButton.id = 'editButton';
    editButton.textContent = '✎';

    editButton.addEventListener('click', () => {
        console.log(editButton.dataset);
        document.getElementById('eventDetailModal').classList.remove('show');

        document.getElementById('eventName').value = editButton.dataset.eventTitle;
        document.getElementById('eventDate').value = editButton.dataset.eventDate;
        document.getElementById('eventTime').value = editButton.dataset.eventTime;
        document.getElementById('eventCategory').value = editButton.dataset.eventCategory;
        document.getElementById('eventLocation').value = editButton.dataset.eventLocation;
        document.getElementById('eventNote').value = editButton.dataset.eventNotes;

        document.getElementById('eventModal').classList.add('show'); 
    });

    const closeBtn = modalHead.querySelector('#closeDetailModal');
    
    const btnGroup = document.createElement('div');
    btnGroup.style.cssText = 'display:flex; align-items:center; gap:8px;';
    closeBtn.replaceWith(btnGroup);
    btnGroup.appendChild(editButton);
    btnGroup.appendChild(closeBtn);
}

function addMemberLists() {
    const eventForm = document.getElementById("eventForm");
    const proposeSubmitButton = document.getElementById("proposeSubmitButton"); // insert before

    const middleSection = document.getElementById("eventDetailMiddleSection"); // append child

    const memberList = document.createElement('div');
    memberList.id = "detailMembers";
    memberList.style = "font-size: 13px; color: var(--ink); line-height: 1.5; background: rgba(236, 234, 209, 0.4); border-radius: 10px; padding: 10px 12px; display: block;";
    memberList.innerText = "Test"

    eventForm.insertBefore(memberList, proposeSubmitButton);
    middleSection.appendChild(memberList);
}

async function boot() {
    if (!getToken() || isTokenExpired(getToken())) {
        clearToken();
        window.location.href = '/login.html';
        return;
    }

    try {
        const res = await api.get('/me');
        if (!res) return;
        currentUser = await res.json();
        renderProfile(currentUser);

        if (currentUser.is_admin) {
            addAdminNav();
            addEditButtons();
            addMemberLists();
        }
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