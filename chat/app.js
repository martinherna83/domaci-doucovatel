"use strict";

const start = document.getElementById("start");
const manual = document.getElementById("manual");
const instructions = document.getElementById("instructions");
const status = document.getElementById("status");
const gemini = document.getElementById("gemini");

start.hidden = false;

start.addEventListener("click", async () => {
  start.disabled = true;
  status.textContent = "";

  try {
    await navigator.clipboard.writeText(instructions.value);
  } catch {
    start.disabled = false;
    manual.open = true;
    status.textContent = "Kopírování se nepodařilo. Pokyny zkopíruj ručně a klepni na Otevřít Gemini.";
    instructions.focus();
    instructions.select();
    return;
  }

  start.disabled = false;
  location.assign(gemini.href);
});
