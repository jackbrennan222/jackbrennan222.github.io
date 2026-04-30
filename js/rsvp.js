let rsvpEventId = null;

async function openRsvpModal(event) {
    rsvpEventId = event.id?.$oid || event.id;

    const res = await api.get(`/events/${rsvpEventId}/rsvps`);
    if (!res || !res.ok) return;
    const data = await res.json();

    document.getElementById("yesCount").textContent   = data.yes;
    document.getElementById("maybeCount").textContent = data.maybe;
    document.getElementById("noCount").textContent    = data.no;

    // Highlight current user's status
    ["yes", "maybe", "no"].forEach(s => {
        const el = document.getElementById(`${s}Count`);
        el.style.textDecoration = data.your_status === s ? "underline" : "none";
    });

    showToast(`${event.title} — click a count to RSVP`);
}

async function submitRsvp(status) {
    if (!rsvpEventId) return;
    const res = await api.post(`/events/${rsvpEventId}/rsvps`, { status });
    if (!res || !res.ok) { showToast("RSVP failed"); return; }
    const data = await res.json();

    document.getElementById("yesCount").textContent   = data.yes;
    document.getElementById("maybeCount").textContent = data.maybe;
    document.getElementById("noCount").textContent    = data.no;
    showToast(`RSVP updated to ${status}!`);
}

function initRsvp() {
    document.getElementById("yesCount").addEventListener("click",   () => submitRsvp("yes"));
    document.getElementById("maybeCount").addEventListener("click", () => submitRsvp("maybe"));
    document.getElementById("noCount").addEventListener("click",    () => submitRsvp("no"));
}

initRsvp();