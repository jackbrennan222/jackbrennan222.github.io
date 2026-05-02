let activePollId = null;

async function initPolls() {
    const res = await api.get("/polls/active");
    if (!res || !res.ok) return;
    const data = await res.json();

    activePollId = data.poll.id?.$oid || data.poll.id;

    document.getElementById('pollQuestion').textContent = data.poll.question;
    const container = document.getElementById('pollCard');
    container.querySelectorAll('.poll-option-row').forEach(el => el.remove());

    const voteBtn = document.getElementById("voteBtn");

    data.poll.options.forEach(option => {
        const tally = data.tally.find(t => t.option_id === option.id);
        const count = tally ? tally.count : 0;
        const total = data.tally.reduce((s, t) => s + t.count, 0);
        const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
        const isYours = data.your_vote === option.id;

        const row = document.createElement('div');
        row.className = `poll-option-row${isYours ? ' selected' : ''}`;
        row.dataset.optionId = option.id;
        row.innerHTML = `
            <div class="poll-radio"></div>
            <span class="poll-option-label">${option.label}</span>
            <div class="poll-bar-wrap"><div class="poll-bar" style="width:${pct}%"></div></div>
            <span class="poll-count">${count}</span>
        `;
        row.addEventListener('click', () => {
            document.querySelectorAll('.poll-option-row').forEach(r => r.classList.remove('selected'));
            row.classList.add('selected');
        });
        container.insertBefore(row, document.getElementById('voteBtn'));
    });

    // Disable if already voted
    if (data.your_vote) {
        voteBtn.disabled = true;
        voteBtn.textContent = "Voted!";
    }

    voteBtn.addEventListener("click", castVote);
}

async function castVote() {
    const selected = document.querySelector('.poll-option-row.selected');
    if (!selected) { showToast('Pick an option first!'); return; }
    const res = await api.post(`/polls/${activePollId}/vote`, { option_id: selected.dataset.optionId });
    if (!res) return;
    if (res.status === 409) { showToast('Already voted!'); return; }
    if (!res.ok) { showToast('Vote failed'); return; }
    showToast('Vote cast!');
    await initPolls();
}