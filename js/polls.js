let activePollId = null;

async function initPolls() {
    const res = await api.get("/polls/active");
    if (!res || !res.ok) return;
    const data = await res.json();

    activePollId = data.poll.id?.$oid || data.poll.id;

    // Render question
    document.querySelector(".side-card:has(#voteBtn) p strong").textContent = data.poll.question;

    // Render options
    const container = document.querySelector(".side-card:has(#voteBtn)");
    container.querySelectorAll(".poll-option").forEach(el => el.remove());

    const voteBtn = document.getElementById("voteBtn");

    data.poll.options.forEach(option => {
        const tally = data.tally.find(t => t.option_id === option.id);
        const count = tally ? tally.count : 0;
        const isYours = data.your_vote === option.id;

        const label = document.createElement("label");
        label.className = "poll-option";
        label.innerHTML = `
            <input type="radio" name="trip" value="${option.id}" ${isYours ? "checked" : ""}/>
            ${option.label} <span class="mini-meta" style="margin-top:0;margin-left:auto;">${count} votes</span>
        `;
        container.insertBefore(label, voteBtn.parentElement);
    });

    // Disable if already voted
    if (data.your_vote) {
        voteBtn.disabled = true;
        voteBtn.textContent = "Voted!";
    }

    voteBtn.addEventListener("click", castVote);
}

async function castVote() {
    const selected = document.querySelector('input[name="trip"]:checked');
    if (!selected) { showToast("Pick an option first!"); return; }
    if (!activePollId) return;

    const res = await api.post(`/polls/${activePollId}/vote`, { option_id: selected.value });
    if (!res) return;
    if (res.status === 409) { showToast("Already voted!"); return; }
    if (!res.ok) { showToast("Vote failed"); return; }

    showToast("Vote cast!");
    await initPolls(); // re-render with updated tallies
}