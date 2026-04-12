const copyButton = document.getElementById("copyMessage");
const copyStatus = document.getElementById("copyStatus");
const messageBox = document.getElementById("messageBox");

if (copyButton && copyStatus && messageBox) {
  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(messageBox.textContent.trim());
      copyStatus.textContent = "Support message copied.";
    } catch (error) {
      copyStatus.textContent = "Clipboard access failed. Copy the message manually.";
    }
  });
}
