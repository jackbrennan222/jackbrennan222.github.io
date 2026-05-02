const calendarState = {
    year: 2026,
    month: 5, // June, 0-indexed
    events: [],
};

const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
];

const weekdays = ["SUN","MON","TUE","WED","THU","FRI","SAT"];

async function fetchEvents() {
    const res = await api.get('/events');
    if (!res || !res.ok) return;
    calendarState.events = await res.json();
    renderCalendar();
    renderMiniCal();
    renderEventsView(calendarState.events);
}

function renderCalendar() {
    const grid = document.getElementById('calGrid');
    const title = document.getElementById('calTitle');
    grid.innerHTML = "";
    title.textContent = `${monthNames[calendarState.month]} ${calendarState.year}`;

    weekdays.forEach(day => {
        const header = document.createElement("div");
        header.className = "cal-weekday";
        header.textContent = day;
        grid.appendChild(header);
    });

    const firstDay    = new Date(calendarState.year, calendarState.month, 1).getDay();
    const daysInMonth = new Date(calendarState.year, calendarState.month + 1, 0).getDate();
    const daysInPrev  = new Date(calendarState.year, calendarState.month, 0).getDate();

    for (let i = 0; i < 35; i++) {
        const cell = document.createElement("div");
        cell.className = "cal-cell";

        let day, month, year, muted = false;

        if (i < firstDay) {
            day = daysInPrev - firstDay + i + 1;
            month = calendarState.month - 1;
            year = calendarState.year;
            if (month < 0) { month = 11; year--; }
            muted = true;
        } else if (i >= firstDay + daysInMonth) {
            day = i - (firstDay + daysInMonth) + 1;
            month = calendarState.month + 1;
            year = calendarState.year;
            if (month > 11) { month = 0; year++; }
            muted = true;
        } else {
            day = i - firstDay + 1;
            month = calendarState.month;
            year = calendarState.year;
        }

        if (muted) cell.classList.add("muted");

        const dateNum = document.createElement("div");
        dateNum.className = "cal-date";
        dateNum.textContent = day;
        cell.appendChild(dateNum);

        // Match events — compare against BSON DateTime (milliseconds)
        const cellDateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const matching = calendarState.events.filter(e => {
            const ms = Number(e.date.$date?.$numberLong);
            const evDate = new Date(ms);
            const evStr = `${evDate.getFullYear()}-${String(evDate.getMonth()+1).padStart(2,'0')}-${String(evDate.getDate()).padStart(2,'0')}`;
            return evStr === cellDateStr;
        });

        matching.forEach(event => {
            const pill = document.createElement("button");
            pill.className = `event-pill ${event.category}`;
            pill.innerHTML = `${event.icon} ${event.title}<small>${event.time}</small>`;
            pill.addEventListener("click", () => openRsvpModal(event));
            cell.appendChild(pill);
        });

        grid.appendChild(cell);
    }
}

function changeMonth(dir) {
    calendarState.month += dir;
    if (calendarState.month < 0)  { calendarState.month = 11; calendarState.year--; }
    if (calendarState.month > 11) { calendarState.month = 0;  calendarState.year++; }
    fetchEvents();
}

function formatTime(timeStr) {
    let [hour, minute] = timeStr.split(':');
    let amPm = hour < 12 ? 'AM' : 'PM';
    return `${((hour - 1) % 12) + 1}:${minute} ${amPm}`;
}

async function submitEvent(e) {
    e.preventDefault();

    const body = {
        title:    document.getElementById("eventName").value.trim(),
        date:     document.getElementById("eventDate").value,
        time:     formatTime(document.getElementById("eventTime").value),
        category: document.getElementById("eventCategory").value,
        icon:     { drinks:"🍹", dining:"🍽️", daytrip:"🌴", yapping:"💬" }
                  [document.getElementById("eventCategory").value],
        location: document.getElementById("eventLocation").value || null,
        notes:    document.getElementById("eventNote").value || null,
    };

    const res = await api.post("/events", body);
    if (!res || !res.ok) {
        showToast("Failed to submit event");
        return;
    }

    // Jump to that month
    const d = new Date(body.date + "T00:00:00");
    calendarState.year  = d.getFullYear();
    calendarState.month = d.getMonth();
    await fetchEvents();
    renderEventsView(calendarState.events);
    closeModal();

    document.getElementById("eventModal").classList.remove("show");
    document.getElementById("eventForm").reset();
    showToast("Event proposal added!");
}

async function initCalendar() {
    document.getElementById('calPrev').addEventListener('click', () => changeMonth(-1));   // was 'prevMonth'
    document.getElementById('calNext').addEventListener('click', () => changeMonth(1));    // was 'nextMonth'
    document.getElementById('calTodayBtn').addEventListener('click', () => { 
        const now = new Date();
        calendarState.year  = now.getFullYear();
        calendarState.month = now.getMonth();
        fetchEvents();
        showToast("Back to today");
    });
    document.getElementById("eventForm").addEventListener("submit", submitEvent);

    const now = new Date();
    calendarState.year  = now.getFullYear();
    calendarState.month = now.getMonth();
    await fetchEvents();

    initMiniCal();
}

const miniState = { year: 2026, month: 5 };
const miniMonthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function renderMiniCal() {
    const grid = document.getElementById('miniCalGrid');
    const title = document.getElementById('miniCalTitle');
    if (!grid || !title) return;
    grid.innerHTML = '';
    title.textContent = `${miniMonthNames[miniState.month]} ${miniState.year}`;

    ['S','M','T','W','T','F','S'].forEach(d => {
        const h = document.createElement('div');
        h.className = 'mini-cal-day-header';
        h.textContent = d;
        grid.appendChild(h);
    });

    const firstDay    = new Date(miniState.year, miniState.month, 1).getDay();
    const daysInMonth = new Date(miniState.year, miniState.month + 1, 0).getDate();
    const daysInPrev  = new Date(miniState.year, miniState.month, 0).getDate();
    const today       = new Date();

    for (let i = 0; i < 35; i++) {
        const cell = document.createElement('div');
        cell.className = 'mini-cal-day';

        let day, month, year, muted = false;
        if (i < firstDay) {
            day = daysInPrev - firstDay + i + 1; month = miniState.month - 1; year = miniState.year;
            if (month < 0) { month = 11; year--; }
            muted = true;
        } else if (i >= firstDay + daysInMonth) {
            day = i - (firstDay + daysInMonth) + 1; month = miniState.month + 1; year = miniState.year;
            if (month > 11) { month = 0; year++; }
            muted = true;
        } else {
            day = i - firstDay + 1; month = miniState.month; year = miniState.year;
        }

        if (muted) cell.classList.add('muted');

        const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
        if (isToday) cell.classList.add('today-num');

        const cellDateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const hasEvent = calendarState.events.some(e => {
            const ms = Number(e.date.$date?.$numberLong);
            const evDate = new Date(ms);
            const evStr = `${evDate.getFullYear()}-${String(evDate.getMonth()+1).padStart(2,'0')}-${String(evDate.getDate()).padStart(2,'0')}`;
            return evStr === cellDateStr;
        });
        if (hasEvent) cell.classList.add('has-event');

        cell.textContent = day;
        cell.addEventListener('click', () => {
            calendarState.year = year;
            calendarState.month = month;
            fetchEvents();
            navigate('calendar');
        });
        grid.appendChild(cell);
    }
}

function initMiniCal() {
    document.getElementById('miniPrev').addEventListener('click', () => {
        miniState.month--;
        if (miniState.month < 0) { miniState.month = 11; miniState.year--; }
        renderMiniCal();
    });
    document.getElementById('miniNext').addEventListener('click', () => {
        miniState.month++;
        if (miniState.month > 11) { miniState.month = 0; miniState.year++; }
        renderMiniCal();
    });
    renderMiniCal();
}

function renderEventsView(events) {
    const grid = document.getElementById('eventsGrid');
    grid.innerHTML = '';
    document.getElementById('eventCount').textContent = events.length;
    const catColors = { drinks:'#E2C4AA', dining:'#E2C4AA', daytrip:'#C0DCE0', yapping:'#CAD2C5' };

    events
        .map(e => ({ ...e, _d: new Date(Number(e.date.$date.$numberLong)) }))
        .sort((a, b) => a._d - b._d)
        .forEach(event => {
            const dateStr = event._d.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
            const id = event._id?.$oid;
            const card = document.createElement('div');
            card.className = 'event-card';
            card.dataset.cat = event.category;
            card.innerHTML = `
                <div class="event-card-top">
                    <div class="event-card-emoji ${event.category}">${event.icon}</div>
                    <div>
                        <div class="event-card-title">${event.title}</div>
                        <div class="event-card-meta">${dateStr} · ${event.time}</div>
                        ${event.location ? `<div class="event-card-meta">${event.location}</div>` : ''}
                    </div>
                </div>
                <div class="event-card-footer">
                    <div class="rsvp-mini">
                        <button class="rsvp-chip yes-chip"  data-id="${id}" data-status="yes">✓ Yes</button>
                        <button class="rsvp-chip maybe-chip" data-id="${id}" data-status="maybe">? Maybe</button>
                        <button class="rsvp-chip no-chip"   data-id="${id}" data-status="no">✕ No</button>
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