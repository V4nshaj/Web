let intervalId;
const POLL_INTERVAL = 15000; // 15 seconds
const MAX_RETRIES = 3;

const logBox = document.getElementById('log');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const autoBuyToggle = document.getElementById('autoBuyToggle');
const floatCapToggle = document.getElementById('floatCapToggle');
const minFloatFilter = document.getElementById('minFloatFilter');
const maxFloatFilter = document.getElementById('maxFloatFilter');

function appendLog(msg, cls = '') {
  const div = document.createElement('div');
  div.textContent = msg;
  if (cls) div.classList.add(cls);
  logBox.appendChild(div);
  logBox.scrollTop = logBox.scrollHeight;
}

async function fetchListings(retryCount = 0) {
  const minDiscount = parseFloat(document.getElementById('discountFilter').value) || 20;
  const minPriceEUR = parseFloat(document.getElementById('minPriceFilter').value) || 3;
  const maxPriceEUR = parseFloat(document.getElementById('maxPriceFilter').value) || 100;
  const minPriceCents = Math.floor(minPriceEUR * 100);
  const maxPriceCents = Math.floor(maxPriceEUR * 100);
  const isFloatCapEnabled = floatCapToggle.checked;
  const minFloat = parseFloat(minFloatFilter.value) || 0;
  const maxFloat = parseFloat(maxFloatFilter.value) || 1;

  try {
    const API_KEY = "tq8eGWwJa6-gJ1m_lWV2rxHv0E-FyJY7"; // Replace this securely later

const res = await fetch("https://csfloat.com/api/v1/listings?sort_by=most_recent&limit=100", {
  headers: {
    "Authorization": API_KEY
  }
});
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();

    if (!Array.isArray(data)) {
      appendLog(`[ERROR] Invalid response structure.`, 'text-red-500');
      return;
    }

    let currentListings = data.filter(l => l.type === 'buy_now' && l.state === 'listed');
    currentListings = currentListings.filter(l => l.price >= minPriceCents && l.price <= maxPriceCents);

    if (isFloatCapEnabled) {
      currentListings = currentListings.filter(l =>
        l.item?.float_value >= minFloat && l.item?.float_value <= maxFloat
      );
    }

    const validSnipes = [];
    for (const l of currentListings) {
      if (!l.item?.scm?.price) continue;
      const discount = (1 - l.price / l.item.scm.price) * 100;
      if (discount >= minDiscount) validSnipes.push({ ...l, discount });
    }

    appendLog(`[${new Date().toLocaleTimeString()}] Checked ${currentListings.length} listings, ${validSnipes.length} match.`, 'text-gray-400');

    for (const listing of validSnipes) {
      await handleSnipe(listing);
    }

  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      appendLog(`[ERROR] ${error.message}. Retrying... (${retryCount + 1}/${MAX_RETRIES})`, 'text-red-500');
      await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)));
      fetchListings(retryCount + 1);
    } else {
      appendLog(`[FATAL] Fetch failed: ${error.message}`, 'text-red-600');
      stopPolling();
    }
  }
}

async function handleSnipe(listing) {
  const msg = `🔥 ${listing.item.name} | €${(listing.price / 100).toFixed(2)} (-${listing.discount.toFixed(1)}%)`;
  appendLog(msg, 'text-green-400');
  chrome.runtime.sendMessage({ type: 'notify', message: msg });

  if (autoBuyToggle.checked) {
    appendLog(`[AUTO BUY] Attempting purchase for ${listing.item.name}`, 'text-yellow-300');
    // Placeholder for buy logic (handled securely via background or external API)
  }
}

function startPolling() {
  if (intervalId) return;
  appendLog(`[START] Sniper activated.`, 'text-gray-400');
  fetchListings();
  intervalId = setInterval(fetchListings, POLL_INTERVAL);
}

function stopPolling() {
  clearInterval(intervalId);
  intervalId = null;
  appendLog(`[STOP] Sniper stopped.`, 'text-gray-400');
}

startBtn.addEventListener('click', startPolling);
stopBtn.addEventListener('click', stopPolling);
