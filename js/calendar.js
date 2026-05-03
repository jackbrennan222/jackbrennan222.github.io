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

    for (let i = 0; i < 42; i++) {
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
            pill.className = `event-pill ${event.category}`;
            pill.innerHTML = `<span class="pill-title">${event.icon} ${event.title}</span><small>${event.time}</small>`;
            pill.addEventListener('click', () => openRsvpModal(event));
            cell.appendChild(pill);
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

function renderEventsView(events) {
    const grid = document.getElementById('eventsGrid');
    grid.innerHTML = '';
    const catColors = { drinks:'#E2C4AA', dining:'#E2C4AA', daytrip:'#C0DCE0', yapping:'#CAD2C5' };

    events
        .map(e => ({ ...e, _d: new Date(Number(e.date.$date.$numberLong)) }))
        .sort((a, b) => a._d - b._d)
        .forEach(event => {
            const ds = event._d.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
            const id = event._id?.$oid;
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
                    <div class="rsvp-mini">
                        <button class="rsvp-chip yes-chip"   data-id="${id}" data-status="yes">✓ Yes</button>
                        <button class="rsvp-chip maybe-chip" data-id="${id}" data-status="maybe">? Maybe</button>
                        <button class="rsvp-chip no-chip"    data-id="${id}" data-status="no">✕ No</button>
                    </div>
                    <span class="event-card-cat" style="background:${catColors[event.category]}60">${event.category}</span>
                </div>
            `;
            card.querySelectorAll('.rsvp-chip').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const res = await api.post(`/events/${btn.dataset.id}/rsvps`, { status: btn.dataset.status });
                    if (!res || !res.ok) { showToast('RSVP failed'); return; }
                    card.querySelectorAll('.rsvp-chip').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    showToast(`RSVP set to ${btn.dataset.status}!`);
                });
            });
            grid.appendChild(card);
        });
}

// ── SUBMIT EVENT ──

async function submitEvent(e) {
    e.preventDefault();

    const body = {
        title:    document.getElementById('eventName').value.trim(),
        date:     document.getElementById('eventDate').value,
        time:     document.getElementById('eventTime').value,
        category: document.getElementById('eventCategory').value,
        icon:     { drinks:'🍹', dining:'🍽️', daytrip:'🌴', yapping:'💬' }
                  [document.getElementById('eventCategory').value],
        location: document.getElementById('eventLocation').value || null,
        notes:    document.getElementById('eventNote').value || null,
    };

    const res = await api.post('/events', body);
    if (!res || !res.ok) {
        showToast('Failed to submit event');
        return;
    }

    const d = new Date(body.date + 'T00:00:00');
    homeCalState.year  = d.getFullYear();
    homeCalState.month = d.getMonth();

    await fetchEvents();
    closeModal();
    document.getElementById('eventForm').reset();
    showToast('Event proposal added!');
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