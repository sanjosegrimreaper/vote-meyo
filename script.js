// === Parallax scroll ===
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
