"use strict";

const get = (id) => document.getElementById(id);
const question = get("question");
const code = get("code");
const feed = get("messages");
const feedback = get("feedback");
const mic = get("mic");

const history = [];
let image = "";
let busy = false;
let ready = false;
let recorder;
let recordingTimer;

function controls() {
  get("send").disabled = !ready || busy || Boolean(recorder);
  get("camera").disabled = !ready || busy || Boolean(recorder);
  get("remove").disabled = busy;
  get("reset").disabled = busy || Boolean(recorder);
  mic.disabled = !ready || busy || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder !== "function";
}

function requireCode() {
  if (code.value.trim()) return true;
  get("access").open = true;
  feedback.textContent = "Zadej rodinný kód od rodiče.";
  code.focus();
  return false;
}

async function callApi(endpoint, payload) {
  const response = await fetch("./api/" + endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + code.value.trim() },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60000)
  });
  const result = await response.json();
  if (response.status === 401) {
    get("access").open = true;
    code.focus();
  }
  if (!response.ok) throw new Error(result.error || "Spojení se nepodařilo.");
  return result.text;
}

function showError(error) {
  feedback.textContent = error.name === "TypeError" || error.name === "TimeoutError" || error.name === "SyntaxError"
    ? "Spojení se nepodařilo. Zkus to znovu." : error.message;
}

function showMessage(role, text) {
  const message = document.createElement("article");
  message.className = "message";
  message.dataset.role = role;
  const name = document.createElement("strong");
  name.textContent = role === "user" ? "Ty" : "Doučovatel";
  const body = document.createElement("p");
  body.textContent = text;
  message.append(name, body);
  feed.append(message);
  return message;
}

function setAttachment(value) {
  image = value;
  get("attachment").hidden = !value;
  if (value) get("preview").src = value;
  else get("preview").removeAttribute("src");
}

get("reset").addEventListener("click", () => {
  history.length = 0;
  feed.replaceChildren();
  question.value = "";
  setAttachment("");
  feedback.textContent = "";
  get("welcome").hidden = false;
  get("reset").hidden = true;
  question.focus();
});

get("camera").addEventListener("click", () => get("photo").click());
get("remove").addEventListener("click", () => setAttachment(""));
get("photo").addEventListener("change", async ({ target }) => {
  const file = target.files[0];
  target.value = "";
  if (!file || busy) return;
  if (!file.type.startsWith("image/") || file.size > 20_000_000) {
    feedback.textContent = "Vyber fotku do 20 MB.";
    return;
  }

  busy = true;
  controls();
  const url = URL.createObjectURL(file);
  try {
    const photo = new Image();
    photo.src = url;
    await photo.decode();
    const ratio = Math.min(1, 1440 / Math.max(photo.width, photo.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(photo.width * ratio));
    canvas.height = Math.max(1, Math.round(photo.height * ratio));
    const context = canvas.getContext("2d", { alpha: false });
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(photo, 0, 0, canvas.width, canvas.height);
    const encoded = canvas.toDataURL("image/jpeg", .76);
    if (encoded.length > 1_300_000) throw new Error();
    setAttachment(encoded);
    feedback.textContent = "";
  } catch {
    feedback.textContent = "Fotku se nepodařilo načíst. Zkus formát JPEG nebo PNG.";
  } finally {
    URL.revokeObjectURL(url);
    busy = false;
    controls();
  }
});

get("compose").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!ready || busy || recorder || (!question.value.trim() && !image) || !requireCode()) return;

  const draft = question.value;
  const entry = { role: "user", text: draft.trim(), ...(image ? { image } : {}) };
  const prior = history.slice(-12);
  const lastPhoto = entry.image ? entry : prior.findLast((message) => message.image);
  // Pokračování zachová nejnovější fotku, aniž by každá žádost posílala všechny přílohy.
  const messages = [...prior, entry].map((message) => message.image && message !== lastPhoto
    ? { role: message.role, text: message.text || "Přiložil/a jsem fotku příkladu." } : message);
  busy = true;
  question.readOnly = true;
  controls();
  get("welcome").hidden = true;
  const pending = showMessage("user", [entry.text, entry.image ? "Přiložená fotka" : ""].filter(Boolean).join("\n"));
  pending.scrollIntoView({ block: "start" });
  feedback.textContent = "Doučovatel připravuje odpověď…";

  try {
    const text = await callApi("chat", { messages });
    history.push(entry, { role: "assistant", text });
    history.splice(0, Math.max(0, history.length - 12));
    for (const message of history) {
      if (message.image && message !== lastPhoto) {
        delete message.image;
        message.text ||= "Přiložil/a jsem fotku příkladu.";
      }
    }
    question.value = "";
    setAttachment("");
    showMessage("assistant", text).scrollIntoView({ block: "start" });
    get("reset").hidden = false;
    feedback.textContent = "";
  } catch (error) {
    pending.remove();
    get("welcome").hidden = Boolean(history.length);
    showError(error);
  } finally {
    busy = false;
    question.readOnly = false;
    controls();
  }
});

async function transcribe(blob) {
  busy = true;
  controls();
  feedback.textContent = "Přepisuji nahrávku…";
  try {
    if (!blob.size || blob.size > 2_000_000) throw new Error("Zkus kratší nahrávku.");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (let start = 0; start < bytes.length; start += 8192) {
      binary += String.fromCharCode(...bytes.subarray(start, start + 8192));
    }
    const text = await callApi("transcribe", { audio: btoa(binary) });
    const next = [question.value.trim(), text].filter(Boolean).join(" ");
    if (next.length > question.maxLength) throw new Error("Před přidáním přepisu zkrať rozepsanou otázku.");
    question.value = next;
    feedback.textContent = "Zkontroluj přepis a odešli otázku.";
    question.focus();
  } catch (error) {
    showError(error);
  } finally {
    busy = false;
    controls();
  }
}

mic.addEventListener("click", async () => {
  if (recorder) {
    if (recorder.state === "recording") recorder.stop();
    return;
  }
  if (!ready || busy || !requireCode()) return;
  busy = true;
  controls();
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = ["audio/webm;codecs=opus", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
    const capture = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    const chunks = [];
    let failed = false;
    capture.addEventListener("dataavailable", (event) => { if (event.data.size) chunks.push(event.data); });
    capture.addEventListener("error", () => {
      failed = true;
      feedback.textContent = "Nahrávání se přerušilo. Zkus to znovu.";
    });
    capture.addEventListener("stop", () => {
      clearTimeout(recordingTimer);
      stream.getTracks().forEach((track) => track.stop());
      recorder = undefined;
      mic.setAttribute("aria-pressed", "false");
      mic.setAttribute("aria-label", "Nadiktovat otázku");
      mic.title = "Nadiktovat otázku";
      if (failed) controls();
      else void transcribe(new Blob(chunks, { type: capture.mimeType }));
    });
    capture.start();
    recorder = capture;
    mic.setAttribute("aria-pressed", "true");
    mic.setAttribute("aria-label", "Zastavit nahrávání");
    mic.title = "Zastavit nahrávání";
    feedback.textContent = "Nahrávám. Klepni na mikrofon pro zastavení, nejvýš za 30 sekund.";
    recordingTimer = setTimeout(() => { if (capture.state === "recording") capture.stop(); }, 30000);
  } catch {
    stream?.getTracks().forEach((track) => track.stop());
    feedback.textContent = "Mikrofon se nepodařilo zapnout. Otázku můžeš napsat.";
  } finally {
    busy = false;
    controls();
  }
});

controls();
get("availability").textContent = "Ověřuji připojení chatu…";
fetch("./api/status", { cache: "no-store", signal: AbortSignal.timeout(5000) })
  .then((response) => response.ok ? response.json() : { ready: false })
  .then((result) => { ready = result.ready === true; })
  .catch(() => { ready = false; })
  .finally(() => {
    get("availability").textContent = ready ? "" : "Rodinný chat zatím není připojený k AI.";
    controls();
  });
