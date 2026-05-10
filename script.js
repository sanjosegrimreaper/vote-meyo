const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// === Parallax scroll ===
const parallaxItems = document.querySelectorAll("[data-parallax]");

if (parallaxItems.length && !reduceMotion) {
  let ticking = false;

  function updateParallax() {
    const viewportH = window.innerHeight;
    parallaxItems.forEach((el) => {
      const rate = parseFloat(el.dataset.parallax) || 0.1;
      const rect = el.getBoundingClientRect();
      const elementCenter = rect.top + rect.height / 2;
      const distanceFromCenter = elementCenter - viewportH / 2;
      const offset = -distanceFromCenter * rate;
      el.style.setProperty("--parallax-y", `${offset.toFixed(1)}px`);
    });
    ticking = false;
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        window.requestAnimationFrame(updateParallax);
        ticking = true;
      }
    },
    { passive: true }
  );

  window.addEventListener("resize", updateParallax, { passive: true });
  updateParallax();
}

// === Reveal: force all content visible ===
// Adds .reveal-in to every reveal target on page load. With current CSS this
// is a no-op; with any older cached CSS that still hides content, the
// .reveal-in rule (opacity: 1 !important) explicitly overrides the hiding.
document
  .querySelectorAll(
    ".section-head, .card, .index-card, .sticky, .bio-card, .share-card, .qr-card, .notebook, .collage-frame, .bulletin .polaroid, .vote-strip-inner"
  )
  .forEach((el) => el.classList.add("reveal-in"));

// === Copy support message (campaign page) ===
const copyButton = document.getElementById("copyMessage");
const copyStatus = document.getElementById("copyStatus");
const messageBox = document.getElementById("messageBox");

if (copyButton && copyStatus && messageBox) {
  const originalText = copyButton.textContent;
  let resetTimer;

  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(messageBox.textContent.trim());
      copyButton.textContent = "Copied! ✓";
      copyStatus.textContent = "thanks for spreading the word!";
    } catch (error) {
      copyStatus.textContent = "clipboard blocked — copy the message manually";
    }
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      copyButton.textContent = originalText;
      copyStatus.textContent = "";
    }, 4000);
  });
}

// =============================================================================
// === Vote counter (Supabase) =================================================
// =============================================================================
// SETUP: paste your Supabase project URL + anon key below.
// While both are empty, the counter element stays hidden and vote buttons
// behave normally — the page works fine either way.
const VOTE_CONFIG = {
  url: "", // e.g. "https://xxxxxxxx.supabase.co"
  key: "", // long string starting with "eyJ"
};

const VOTE_LOCAL_KEY = "voteMeyoVoted";
const VOTE_BUTTON_SELECTOR = 'a[href*="bit.ly/vote-for-meyo"]';
const VOTE_POLL_MS = 15000;

let lastKnownCount = null;

function formatVoteCount(n) {
  if (n === 0) return "be the first to vote!";
  if (n === 1) return "1 person has voted";
  return `${Number(n).toLocaleString("en-US")} people have voted`;
}

function paintVoteCount(n, isAuthoritative) {
  if (n == null) return;
  if (!isAuthoritative && lastKnownCount != null && n < lastKnownCount) {
    n = lastKnownCount;
  }
  lastKnownCount = n;
  document.querySelectorAll("[data-vote-counter]").forEach((el) => {
    el.textContent = formatVoteCount(n);
  });
}

function markVoteButtonsDone() {
  document.querySelectorAll(VOTE_BUTTON_SELECTOR).forEach((btn) => {
    btn.classList.add("button-voted");
    btn.setAttribute("aria-disabled", "true");
  });
}

function unmarkVoteButtons() {
  document.querySelectorAll(VOTE_BUTTON_SELECTOR).forEach((btn) => {
    btn.classList.remove("button-voted");
    btn.removeAttribute("aria-disabled");
  });
}

async function fetchVoteCount() {
  if (!VOTE_CONFIG.url || !VOTE_CONFIG.key) return null;
  try {
    const res = await fetch(
      `${VOTE_CONFIG.url}/rest/v1/vote_counts?id=eq.meyo&select=count`,
      {
        headers: {
          apikey: VOTE_CONFIG.key,
          Authorization: `Bearer ${VOTE_CONFIG.key}`,
        },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data[0]?.count ?? null;
  } catch {
    return null;
  }
}

async function postVoteIncrement() {
  if (!VOTE_CONFIG.url || !VOTE_CONFIG.key) return null;
  try {
    const res = await fetch(`${VOTE_CONFIG.url}/rest/v1/rpc/increment_meyo_vote`, {
      method: "POST",
      headers: {
        apikey: VOTE_CONFIG.key,
        Authorization: `Bearer ${VOTE_CONFIG.key}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data === "number" ? data : null;
  } catch {
    return null;
  }
}

(function initVoteCounter() {
  const hasCounter = document.querySelector("[data-vote-counter]");
  const hasButtons = document.querySelector(VOTE_BUTTON_SELECTOR);
  if (!hasCounter && !hasButtons) return;

  // If localStorage says voted, mark UI now (before any network)
  if (localStorage.getItem(VOTE_LOCAL_KEY) === "1") markVoteButtonsDone();

  // Initial load + polling
  fetchVoteCount().then((c) => paintVoteCount(c));
  setInterval(() => {
    fetchVoteCount().then((c) => paintVoteCount(c));
  }, VOTE_POLL_MS);

  // Wire up vote buttons
  document.querySelectorAll(VOTE_BUTTON_SELECTOR).forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (localStorage.getItem(VOTE_LOCAL_KEY) === "1") return;

      // Optimistic update
      paintVoteCount((lastKnownCount ?? 0) + 1);
      localStorage.setItem(VOTE_LOCAL_KEY, "1");
      markVoteButtonsDone();

      // Persist to backend
      const real = await postVoteIncrement();
      if (real == null) {
        // Roll back on failure so the user can try again later
        localStorage.removeItem(VOTE_LOCAL_KEY);
        unmarkVoteButtons();
        fetchVoteCount().then((c) => {
          if (c != null) {
            lastKnownCount = c;
            paintVoteCount(c, true);
          }
        });
      } else {
        paintVoteCount(real, true);
      }
    });
  });
})();
