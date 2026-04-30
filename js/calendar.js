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
    const res = await api.get(
        `/events?month=${calendarState.month + 1}&year=${calendarState.year}`
    );
    if (!res || !res.ok) return;
    calendarState.events = await res.json();
    renderCalendar();
}

function renderCalendar() {
    const grid = document.getElementById("calendarGrid");
    const title = document.getElementById("monthTitle");
    grid.innerHTML = "";
    title.textContent = `${monthNames[calendarState.month]} ${calendarState.year}`;

    weekdays.forEach(day => {
        const header = document.createElement("div");
        header.className = "weekday";
        header.textContent = day;
        grid.appendChild(header);
    });

    const firstDay    = new Date(calendarState.year, calendarState.month, 1).getDay();
    const daysInMonth = new Date(calendarState.year, calendarState.month + 1, 0).getDate();
    const daysInPrev  = new Date(calendarState.year, calendarState.month, 0).getDate();

    for (let i = 0; i < 42; i++) {
        const cell = document.createElement("div");
        cell.className = "day-cell";

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
        dateNum.className = "date-num";
        dateNum.textContent = day;
        cell.appendChild(dateNum);

        // Match events — compare against BSON DateTime (milliseconds)
        const cellDate = new Date(year, month, day);
        const matching = calendarState.events.filter(e => {
            const evDate = new Date(e.date.$date?.$numberLong
                ? Number(e.date.$date.$numberLong)
                : e.date);
            return evDate.toDateString() === cellDate.toDateString();
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

async function submitEvent(e) {
    e.preventDefault();

    const body = {
        title:    document.getElementById("eventName").value.trim(),
        date:     document.getElementById("eventDate").value,
        time:     document.getElementById("eventTime").value,
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

    document.getElementById("eventModal").classList.remove("show");
    document.getElementById("eventForm").reset();
    showToast("Event proposal added!");
}

async function initCalendar() {
    document.getElementById("prevMonth").addEventListener("click", () => changeMonth(-1));
    document.getElementById("nextMonth").addEventListener("click", () => changeMonth(1));
    document.getElementById("todayBtn").addEventListener("click", () => {
        const now = new Date();
        calendarState.year  = now.getFullYear();
        calendarState.month = now.getMonth();
        fetchEvents();
        showToast("Back to today");
    });
    document.getElementById("eventForm").addEventListener("submit", submitEvent);

    await fetchEvents();
}