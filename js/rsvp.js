let rsvpEventId = null;

async function openRsvpModal(event) {
    const id = event._id?.$oid;
    setActiveRsvpEvent(id);

    // Populate details
    const d = event._d || new Date(Number(event.date.$date.$numberLong));
    const dateStr = d.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });

    document.getElementById('detailEmoji').textContent  = event.icon;
    document.getElementById('detailTitle').textContent  = event.title;
    document.getElementById('detailMeta').textContent   = `${dateStr} · ${event.time}`;

    const locEl = document.getElementById('detailLocation');
    if (event.location) {
        locEl.querySelector('span').textContent = event.location;
        locEl.style.display = 'block';
    } else {
        locEl.style.display = 'none';
    }

    const notesEl = document.getElementById('detailNotes');
    if (event.notes) {
        notesEl.textContent = event.notes;
        notesEl.style.display = 'block';
    } else {
        notesEl.style.display = 'none';
    }

    // Fetch RSVP counts and current user's status
    const res = await api.get(`/events/${id}/rsvps`);
    if (res && res.ok) {
        const data = await res.json();
        document.getElementById('detailRsvpCounts').textContent =
            `${data.yes} yes · ${data.maybe} maybe · ${data.no} no`;

        // Highlight current vote
        ['yes','maybe','no'].forEach(s => {
            document.getElementById(`detail${s.charAt(0).toUpperCase()+s.slice(1)}`)
                .classList.toggle('selected', data.your_status === s);
        });
    }

    document.getElementById('eventDetailModal').classList.add('show');
}

// Wire up RSVP buttons inside the detail modal
['Yes','Maybe','No'].forEach(s => {
    document.getElementById(`detail${s}`).addEventListener('click', async () => {
        const id = rsvpEventId;
        if (!id) return;
        const res = await api.post(`/events/${id}/rsvps`, { status: s.toLowerCase() });
        if (!res || !res.ok) { showToast('RSVP failed'); return; }

        const countRes = await api.get(`/events/${id}/rsvps`);
        if (!countRes || !countRes.ok) return;
        const data = await countRes.json();

        document.getElementById('detailRsvpCounts').textContent =
            `${data.yes} yes · ${data.maybe} maybe · ${data.no} no`;
        ['Yes','Maybe','No'].forEach(s2 => {
            document.getElementById(`detail${s2}`)
                .classList.toggle('selected', data.your_status === s2.toLowerCase());
        });

        // Also sync the right panel
        document.getElementById('yesCount').textContent   = data.yes;
        document.getElementById('maybeCount').textContent = data.maybe;
        document.getElementById('noCount').textContent    = data.no;

        showToast(`RSVP set to ${s.toLowerCase()}!`);
    });
});

function setActiveRsvpEvent(id) {
    rsvpEventId = id;
}

async function submitRsvp(status) {
    const id = rsvpEventId;
    if (!id) { showToast('No event selected'); return; }
    const res = await api.post(`/events/${id}/rsvps`, { status });
    if (!res || !res.ok) { showToast('RSVP failed'); return; }
    const countRes = await api.get(`/events/${id}/rsvps`);
    if (!countRes || !countRes.ok) return;
    const data = await countRes.json();
    document.getElementById('yesCount').textContent   = data.yes;
    document.getElementById('maybeCount').textContent = data.maybe;
    document.getElementById('noCount').textContent    = data.no;
    ["yes", "maybe", "no"].forEach(s => {
        const el = document.getElementById(`${s}Count`);
        el.style.textDecoration = data.your_status === s ? "underline" : "none";
    });
    showToast(`RSVP set to ${status}!`);
}