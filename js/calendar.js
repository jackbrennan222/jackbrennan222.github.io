let events = [];

const homeCalState = {
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
};

const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
];

const weekdays = ["SUN","MON","TUE","WED","THU","FRI","SAT"];

function dateStr(year, month, day) {
    return `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

function eventDateStr(e) {
    const d = new Date(Number(e.date.$date?.$numberLong));
    return dateStr(d.getFullYear(), d.getMonth(), d.getDate());
}

async function fetchEvents() {
    const res = await api.get('/events');
    if (!res || !res.ok) return;
    events = await res.json();
    renderHomeCalendar();
    renderEventsView(events);
}

// ── HOME CALENDAR ──
function renderHomeCalendar() {
    const grid = document.getElementById('homeCalGrid');
    const title = document.getElementById('homeCalTitle');
    if (!grid || !title) return;
    grid.innerHTML = '';
    title.textContent = `${monthNames[homeCalState.month]} ${homeCalState.year}`;

    weekdays.forEach(day => {
        const header = document.createElement('div');
        header.className = 'cal-weekday';
        header.textContent = day;
        grid.appendChild(header);
    });

    const firstDay    = new Date(homeCalState.year, homeCalState.month, 1).getDay();
    const daysInMonth = new Date(homeCalState.year, homeCalState.month + 1, 0).getDate();
    const daysInPrev  = new Date(homeCalState.year, homeCalState.month, 0).getDate();

    for (let i = 0; i < 35; i++) {
        const cell = document.createElement('div');
        cell.className = 'cal-cell';

        let day, month, year, muted = false;

        if (i < firstDay) {
            day = daysInPrev - firstDay + i + 1;
            month = homeCalState.month - 1;
            year = homeCalState.year;
            if (month < 0) { month = 11; year--; }
            muted = true;
        } else if (i >= firstDay + daysInMonth) {
            day = i - (firstDay + daysInMonth) + 1;
            month = homeCalState.month + 1;
            year = homeCalState.year;
            if (month > 11) { month = 0; year++; }
            muted = true;
        } else {
            day = i - firstDay + 1;
            month = homeCalState.month;
            year = homeCalState.year;
        }

        if (muted) cell.classList.add('muted');

        const today = new Date();
        const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
        const dateNum = document.createElement('div');
        dateNum.className = `cal-date${isToday ? ' today-num' : ''}`;
        dateNum.textContent = day;
        cell.appendChild(dateNum);

        const cellStr = dateStr(year, month, day);
        const matching = events.filter(e => eventDateStr(e) === cellStr);

        matching.forEach(event => {
            const pill = document.createElement('button');
            const eventDate = new Date(year, month, day);
            pill.className = `event-pill ${event.category}${event.approved ? '' : '-pending'} ${eventDate < today ? 'past' : ''}`;
            pill.dataset.icon = event.icon;
            pill.innerHTML = `<span class="pill-title">${event.icon} ${event.title}</span>${ event.location ? '<span>📍 ' + event.location + '</span>' : ''}<small>${event.time}</small>`;
            if (event.approved) { pill.addEventListener('click', () => openRsvpModal(event)); }
            else { pill.addEventListener('click', () => navigate('admin')); }
            cell.appendChild(pill);
            ensureDotRow(cell, event.category);
        });

        grid.appendChild(cell);
    }
}

function changeHomeMonth(dir) {
    homeCalState.month += dir;
    if (homeCalState.month < 0)  { homeCalState.month = 11; homeCalState.year--; }
    if (homeCalState.month > 11) { homeCalState.month = 0;  homeCalState.year++; }
    renderHomeCalendar();
}

// ── EVENTS VIEW ──
async function renderEventsView(events) {
    const grid = document.getElementById('eventsGrid');
    const adminGrid = document.getElementById('eventsAdminGrid');
    grid.innerHTML = '';
    adminGrid.innerHTML = '';
    const catColors = { drinks:'#E2C4AA', dining:'#E2C4AA', daytrip:'#C0DCE0', yapping:'#CAD2C5' };

    await loadHomeStats()

    const sorted = events
        .map(e => ({ ...e, _d: new Date(Number(e.date.$date.$numberLong)) }))
        .sort((a, b) => a._d - b._d);

    for (const event of sorted) {
        const id = event._id?.$oid;
        const ds = event._d.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });

        // Fetch RSVP status for this event
        let yourStatus = null;
        const rsvpRes = await api.get(`/events/${id}/rsvps`);
        if (rsvpRes && rsvpRes.ok) {
            const rsvp = await rsvpRes.json();
            yourStatus = rsvp.your_status?.toLowerCase() ?? null;
        }

        const card = document.createElement('div');
        card.className = 'event-card';
        card.dataset.cat = event.category;
        card.innerHTML = `
            <div class="event-card-top">
                <div class="event-card-emoji ${event.category}">${event.icon}</div>
                <div>
                    <div class="event-card-title">${event.title}</div>
                    <div class="event-card-meta">${ds} · ${event.time}</div>
                    ${event.location ? `<div class="event-card-meta">📍 ${event.location}</div>` : ''}
                </div>
            </div>
            <div class="event-card-footer">
                ${event.approved ?
                `<div class="rsvp-mini">
                    <button class="rsvp-chip yes-chip   ${yourStatus === 'yes'   ? 'selected' : ''}" data-id="${id}" data-status="yes">✓ Yes</button>
                    <button class="rsvp-chip maybe-chip ${yourStatus === 'maybe' ? 'selected' : ''}" data-id="${id}" data-status="maybe">? Maybe</button>
                    <button class="rsvp-chip no-chip    ${yourStatus === 'no'    ? 'selected' : ''}" data-id="${id}" data-status="no">✕ No</button>
                </div>
                <span class="event-card-cat" style="background:${catColors[event.category]}60">${event.category}</span>`
                    :
                `<div class="mini-rsvp">
                    <button class="rsvp-chip yes-chip" data-id="${id}" id="approve">✓ Approve</button>
                    <button class="rsvp-chip no-chip"  data-id="${id}" id="delete">✕ Delete</button>
                </div>`
                }
            </div>
        `;

        card.querySelectorAll('.rsvp-chip').forEach(btn => {
            if (btn.id === "approve") {
                btn.addEventListener('click', async () => {
                    const res = await api.patch(`/events/${btn.dataset.id}/approve`, {});
                    if (!res || !res.ok) { showToast('RSVP failed'); return; }
                    fetchEvents();
                });
            } else if (btn.id === "delete") {
                btn.addEventListener('click', async () => {
                    const res = await api.delete(`/events/${btn.dataset.id}`);
                    if (!res || !res.ok) { showToast('RSVP failed'); return; }
                    fetchEvents();
                });
            } else {
                btn.addEventListener('click', async () => {
                    const res = await api.post(`/events/${btn.dataset.id}/rsvps`, { status: btn.dataset.status });
                    if (!res || !res.ok) { showToast('RSVP failed'); return; }
                    card.querySelectorAll('.rsvp-chip').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    showToast(`RSVP set to ${btn.dataset.status}!`);
                });
            }
        });
        
        if (event.approved) {
            grid.appendChild(card);
        } else {
            adminGrid.appendChild(card);
        }
    }

    if (document.getElementById('adminRsvpGrid')) {
        await renderAdminRsvpGrid(events);
    }

    // Toggle empty state for pending section
    const adminEmpty = document.getElementById('eventsAdminEmpty');
    if (adminEmpty) {
        const hasPending = events.some(e => !e.approved);
        adminEmpty.style.display = hasPending ? 'none' : 'block';
        document.getElementById('eventsAdminGrid').style.display = hasPending ? '' : 'none';
    }
}

async function renderAdminRsvpGrid(events) {
    const grid = document.getElementById('adminRsvpGrid');
    if (!grid) return;
    grid.innerHTML = '';

    // Fetch all users once for name lookup
    const usersRes = await api.get('/users');
    const users = (usersRes && usersRes.ok) ? await usersRes.json() : [];
    const userMap = Object.fromEntries(users.map(u => [u._id?.$oid, u.display_name || u.username]));

    const sorted = events
        .filter(e => e.approved)
        .map(e => ({ ...e, _d: new Date(Number(e.date.$date.$numberLong)) }))
        .sort((a, b) => a._d - b._d);

    for (const event of sorted) {
        const id = event._id?.$oid;
        const ds = event._d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

        // Fetch RSVPs for this event
        const rsvpRes = await api.get(`/events/${id}/rsvps`);
        const rsvpData = (rsvpRes && rsvpRes.ok) ? await rsvpRes.json() : {};
        const allRsvps = rsvpData.all ?? [];   // expects [{ user_id, status }]

        const counts = { yes: 0, maybe: 0, no: 0 };
        allRsvps.forEach(r => { if (counts[r.status] !== undefined) counts[r.status]++; });

        const nameRows = allRsvps.map(r => {
            const name = userMap[r.user_id] ?? r.user_id;
            return `
                <div class="admin-rsvp-name-row">
                    <span class="admin-rsvp-name">${name}</span>
                    <span class="admin-rsvp-status status-${r.status}">${r.status}</span>
                </div>`;
        }).join('');

        const card = document.createElement('div');
        card.className = 'admin-rsvp-card';
        card.innerHTML = `
            <div class="admin-rsvp-header">
                <div class="event-card-emoji ${event.category}" style="width:42px;height:42px;border-radius:10px;display:grid;place-items:center;font-size:22px;flex-shrink:0;">${event.icon}</div>
                <div>
                    <div class="admin-rsvp-title">${event.title}</div>
                    <div class="admin-rsvp-meta">${ds} · ${event.time}</div>
                </div>
            </div>
            <div class="admin-rsvp-counts">
                <div class="admin-count-pill">
                    <span class="admin-count-num yes-num">${counts.yes}</span>
                    <span class="admin-count-label">Yes</span>
                </div>
                <div class="admin-count-pill">
                    <span class="admin-count-num maybe-num">${counts.maybe}</span>
                    <span class="admin-count-label">Maybe</span>
                </div>
                <div class="admin-count-pill">
                    <span class="admin-count-num no-num">${counts.no}</span>
                    <span class="admin-count-label">No</span>
                </div>
            </div>
            ${allRsvps.length ? `<div class="admin-rsvp-names">${nameRows}</div>` : '<div style="font-size:12px;color:var(--muted);">No RSVPs yet.</div>'}
        `;

        grid.appendChild(card);
    }
}

// ── SUBMIT EVENT ──

async function submitEvent(e) {
    e.preventDefault();

    const form    = document.getElementById('eventForm');
    const isEdit  = form.dataset.mode === 'edit';
    const eventId = form.dataset.eventId;
    const memberIds = getSelectedMemberIds();

    const body = {
        title:    document.getElementById('eventName').value.trim(),
        date:     document.getElementById('eventDate').value,
        time:     to12(document.getElementById('eventTime').value),
        category: document.getElementById('eventCategory').value,
        icon:     { drinks:'🍹', dining:'🍽️', daytrip:'🌴', yapping:'💬' }
                  [document.getElementById('eventCategory').value],
        location: document.getElementById('eventLocation').value || null,
        notes:    document.getElementById('eventNote').value || null,
        ...(memberIds !== undefined && { member_ids: memberIds }),
    };

    const res = isEdit
        ? await api.patch(`/events/${eventId}`, body)
        : await api.post('/events', body);

    if (!res || !res.ok) { showToast(isEdit ? 'Update failed' : 'Failed to submit event'); return; }

    if (!isEdit) { 
        const d = new Date(body.date + 'T00:00:00');
        homeCalState.year  = d.getFullYear();
        homeCalState.month = d.getMonth();
    }

    await fetchEvents();
    closeModal();
    document.getElementById('eventForm').reset();
    showToast(isEdit ? 'Event updated!' : 'Event proposal added!');
}

function to12(time24) {
    const [h, m] = time24.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12  = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function ensureDotRow(cell, cat) {
  let row = cell.querySelector('.mobile-dot-row');
  if (!row) {
    row = document.createElement('div');
    row.className = 'mobile-dot-row';
    cell.appendChild(row);
  }
  
  if (row.children.length < 3) {
    const dot = document.createElement('span');
    dot.className = `mobile-dot ${cat}`;
    row.appendChild(dot);
  }
}

// ── INIT ──

async function initCalendar() {
    document.getElementById('homeCalPrev').addEventListener('click', () => changeHomeMonth(-1));
    document.getElementById('homeCalNext').addEventListener('click', () => changeHomeMonth(1));
    document.getElementById('homeCalTodayBtn').addEventListener('click', () => {
        const now = new Date();
        homeCalState.year  = now.getFullYear();
        homeCalState.month = now.getMonth();
        renderHomeCalendar();
        showToast('Back to today');
    });
    document.getElementById('eventForm').addEventListener('submit', submitEvent);

    await fetchEvents();
}