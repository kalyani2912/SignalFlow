// --- API helpers ---

function getApiKey() {
  let key = localStorage.getItem("signalflow_api_key");
  if (!key) {
    key = prompt("Enter your SignalFlow API key (leave blank for dev mode):");
    if (key) localStorage.setItem("signalflow_api_key", key);
  }
  return key || "";
}

async function fetchJSON(url) {
  const key = getApiKey();
  const headers = {};
  if (key) headers["X-Api-Key"] = key;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function postJSON(url, body) {
  const key = getApiKey();
  const headers = { "Content-Type": "application/json" };
  if (key) headers["X-Api-Key"] = key;
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// --- Utilities ---

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString();
}

function statusBadge(status) {
  const colors = {
    active: "#22c55e", draft: "#94a3b8", paused: "#f59e0b", archived: "#6b7280",
    sent: "#22c55e", delivered: "#3b82f6", failed: "#ef4444",
    generated: "#a855f7", pending: "#94a3b8", approved: "#22c55e",
  };
  const color = colors[status] || "#94a3b8";
  return `<span class="badge" style="background:${color}">${status}</span>`;
}

function channelBadges(channels) {
  const icons = { sms: "SMS", email: "Email", whatsapp: "WhatsApp", instagram_dm: "IG DM" };
  return channels.map((c) => `<span class="badge channel">${icons[c] || c}</span>`).join(" ");
}

// --- SSE Live Feed ---

function connectSSE(container, maxItems = 20) {
  const evtSource = new EventSource("/api/v1/signals/stream");
  evtSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    const el = document.createElement("div");
    el.className = "feed-item";
    el.innerHTML = `
      <span class="feed-time">${formatDate(data.signal.timestamp)}</span>
      <span class="feed-type">${data.signal.signalType}</span>
      <span class="feed-shopper">${data.signal.shopperId}</span>
      <span class="feed-msgs">${data.messagesGenerated} msg${data.messagesGenerated !== 1 ? "s" : ""}</span>
      ${data.rateLimited ? '<span class="badge" style="background:#ef4444">RATE LIMITED</span>' : ""}
    `;
    container.prepend(el);
    while (container.children.length > maxItems) {
      container.removeChild(container.lastChild);
    }
  };
  evtSource.onerror = () => {
    console.warn("SSE connection lost, reconnecting...");
  };
  return evtSource;
}

// --- Dashboard Page ---

async function initDashboard() {
  try {
    const campaigns = await fetchJSON("/api/v1/campaigns");

    // Summary cards
    const active = campaigns.filter((c) => c.status === "active").length;
    document.getElementById("active-count").textContent = active;
    document.getElementById("total-campaigns").textContent = campaigns.length;

    // Fetch analytics for all campaigns
    let totalSignals = 0;
    let totalMessages = 0;
    const rows = [];

    for (const camp of campaigns) {
      let stats = { signalsReceived: 0, messagesSent: 0, deliverySuccessCount: 0, deliveryFailureCount: 0 };
      try {
        stats = await fetchJSON(`/api/v1/campaigns/${camp.id}/analytics`);
      } catch (e) { /* no stats yet */ }
      totalSignals += stats.signalsReceived;
      totalMessages += stats.messagesSent;
      rows.push({ ...camp, stats });
    }

    document.getElementById("signal-count").textContent = totalSignals;
    document.getElementById("message-count").textContent = totalMessages;

    // Campaign table
    const tbody = document.getElementById("campaign-tbody");
    tbody.innerHTML = rows.map((c) => `
      <tr onclick="location.href='/campaign.html?id=${c.id}'" style="cursor:pointer">
        <td>${c.name}</td>
        <td>${statusBadge(c.status)}</td>
        <td>${channelBadges(c.channels)}</td>
        <td>${c.stats.signalsReceived}</td>
        <td>${c.stats.messagesSent}</td>
        <td>${c.stats.deliverySuccessCount} / ${c.stats.deliveryFailureCount}</td>
      </tr>
    `).join("");

    // Live feed
    const feedContainer = document.getElementById("live-feed");
    connectSSE(feedContainer);
  } catch (err) {
    console.error("Dashboard init error:", err);
    document.getElementById("error-banner")?.classList.remove("hidden");
  }
}

// --- Campaign Detail Page ---

async function initCampaignDetail() {
  const id = new URLSearchParams(location.search).get("id");
  if (!id) { document.body.innerHTML = "<p>No campaign ID provided.</p>"; return; }

  try {
    const [campaign, stats, messages] = await Promise.all([
      fetchJSON(`/api/v1/campaigns/${id}`),
      fetchJSON(`/api/v1/campaigns/${id}/analytics`),
      fetchJSON(`/api/v1/messages?campaignId=${id}`),
    ]);

    document.getElementById("camp-name").textContent = campaign.name;
    document.getElementById("camp-status").innerHTML = statusBadge(campaign.status);
    document.getElementById("camp-brand").textContent = campaign.brandId;
    document.getElementById("camp-created").textContent = formatDate(campaign.createdAt);
    document.getElementById("camp-channels").innerHTML = channelBadges(campaign.channels);
    document.getElementById("camp-rules").textContent = JSON.stringify(campaign.triggerRules, null, 2);
    if (campaign.toneGuidelines) {
      document.getElementById("camp-tone").textContent = campaign.toneGuidelines;
    }

    // Analytics cards
    document.getElementById("stat-signals").textContent = stats.signalsReceived;
    document.getElementById("stat-messages").textContent = stats.messagesSent;
    document.getElementById("stat-success").textContent = stats.deliverySuccessCount;
    document.getElementById("stat-failure").textContent = stats.deliveryFailureCount;

    // Analytics bar chart
    const barData = [
      ["bar-signals", stats.signalsReceived],
      ["bar-messages", stats.messagesSent],
      ["bar-success", stats.deliverySuccessCount],
      ["bar-failure", stats.deliveryFailureCount],
    ];
    const maxVal = Math.max(...barData.map(([, v]) => v), 1);
    barData.forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.style.width = Math.max((val / maxVal) * 100, 2) + "%";
    });

    // Messages table
    const tbody = document.getElementById("msg-tbody");
    tbody.innerHTML = messages.map((m) => `
      <tr>
        <td>${m.shopperId}</td>
        <td>${channelBadges([m.channel])}</td>
        <td>${statusBadge(m.status)}</td>
        <td class="msg-body">${m.body}</td>
        <td>${formatDate(m.generatedAt)}</td>
      </tr>
    `).join("");
  } catch (err) {
    console.error("Campaign detail error:", err);
    document.body.innerHTML = `<p class="error">Failed to load campaign: ${err.message}</p>`;
  }
}

// --- Router ---
document.addEventListener("DOMContentLoaded", () => {
  const page = location.pathname;
  if (page === "/" || page === "/index.html") initDashboard();
  else if (page === "/campaign.html") initCampaignDetail();
});
