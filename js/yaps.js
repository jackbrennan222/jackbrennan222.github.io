let ws = null;

async function initYaps() {
    await fetchYaps();
    connectWs();

    document.getElementById("postYap").addEventListener("click", postYap);
}

async function fetchYaps() {
    const res = await api.get("/yaps?page=1&page_size=20");
    if (!res || !res.ok) return;
    const yaps = await res.json();

    const list = document.getElementById("yapList");
    list.innerHTML = "";
    yaps.forEach(y => prependYap(y, false));
}

function prependYap(yap, prepend = true) {
    const list = document.getElementById("yapList");
    const id = yap._id?.$oid || yap.id || "";
    const hasLiked = yap.likes?.some(l => l.$oid === currentUser._id.$oid);
    const likeCount = yap.likes?.length ?? 0;
    const initial = (yap.username || "?")[0].toUpperCase();
    const color = colorFromName(yap.username || "");
    const timeAgo = formatTimeAgo(yap.created_at.$date.$numberLong);

    const entry = document.createElement("div");
    entry.className = "yap-entry";
    entry.dataset.id = id;
    entry.innerHTML = `
        <img src="https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(yap.username)}&backgroundColor=${color}"
             width="32" height="32" style="border-radius:50%;" alt="${initial}" />
        <div>
            <strong>${yap.username} <span class="mini-meta">${timeAgo}</span></strong>
            <p></p>
        </div>
        <button class="like-btn" data-id="${id}" style="background:none;color:var(--muted);font-size:13px;">${hasLiked ? '♥' : '♡'} ${likeCount}</button>
    `;
    entry.querySelector("p").textContent = yap.text;
    entry.querySelector(".like-btn").addEventListener("click", () => toggleLike(id, entry));

    if (prepend) {
        list.prepend(entry);
    } else {
        list.appendChild(entry);
    }
}

async function postYap() {
    const input = document.getElementById("yapInput");
    const text = input.value.trim();
    if (!text) { showToast("Type a note first!"); return; }
    if (text.length > 280) { showToast("Max 280 characters!"); return; }

    const res = await api.post("/yaps", { text });
    if (!res || !res.ok) { showToast("Failed to post yap"); return; }

    input.value = "";
    showToast("Yap posted!");
    // WS will deliver it to all clients including this one
}

async function toggleLike(yapId, entryEl) {
    const res = await api.post(`/yaps/${yapId}/like`);
    if (!res || !res.ok) return;
    const action = await res.json(); // "liked" or "unliked"

    const btn = entryEl.querySelector(".like-btn");
    const current = parseInt(btn.textContent.replace(/\D/g, "")) || 0;
    btn.textContent = `${action === 'unliked' ? '♡' : '♥'} ${action === "liked" ? current + 1 : Math.max(0, current - 1)}`;
}

function connectWs() {
    const token = getToken();
    ws = new WebSocket(`wss://api.jackbrennan.dev/ws?token=${token}`);

    ws.onmessage = (event) => {
        const yap = JSON.parse(event.data);
        prependYap({
            _id: yap._id,
            username: yap.username,
            text: yap.text,
            likes: [],
            created_at: yap.created_at,
        });
    };

    ws.onclose = () => {
        setTimeout(connectWs, 3000);
    };

    ws.onerror = () => {
        ws.close();
    };
}

function formatTimeAgo(dateStr) {
    const diff = (Date.now() - Number(dateStr)) / 1000;
    if (diff < 60)   return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}