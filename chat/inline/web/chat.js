"use strict";

const get = (id) => document.getElementById(id);
const question = get("question");
const feed = get("messages");
const feedback = get("feedback");
const mic = get("mic");

const history = [];
let image = "";
let busy = false;
let ready = false;
let recorder;
let recordingTimer;
let reading;
let quizActive = false;
let stars = 0;

function stopReading() {
  if (!reading) return;
  const { button } = reading;
  reading = undefined;
  button.textContent = "Přečíst nahlas";
  speechSynthesis.cancel();
}

function readAnswer(text, button, status) {
  const stopping = reading?.button === button;
  stopReading();
  status.textContent = "";
  if (stopping) return;

  const voice = speechSynthesis.getVoices().find((item) =>
    item.localService && /^cs(?:[-_]|$)/i.test(item.lang));
  if (!voice) {
    status.textContent = "Český hlas není dostupný. Můžeš ho přidat v nastavení předčítání zařízení, pokud ho zařízení nabízí.";
    return;
  }

  const parts = text.match(/\S[\s\S]{0,179}(?=\s|$)|\S{1,180}/g) ?? [];
  const playback = { button, utterance: null };
  reading = playback;
  button.textContent = "Zastavit čtení";
  let index = 0;
  function next() {
    if (reading !== playback) return;
    if (index === parts.length) {
      stopReading();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(parts[index++]);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = .9;
    playback.utterance = utterance;
    utterance.onend = next;
    utterance.onerror = () => {
      if (reading !== playback) return;
      stopReading();
      status.textContent = "Odpověď se nepodařilo přehrát.";
    };
    speechSynthesis.speak(utterance);
  }
  next();
}

function controls() {
  get("send").disabled = !ready || busy || Boolean(recorder);
  get("camera").disabled = !ready || busy || Boolean(recorder);
  get("remove").disabled = busy;
  get("reset").disabled = busy || Boolean(recorder);
  mic.disabled = !ready || busy || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder !== "function";
  get("quiz-tools").hidden = !history.length;
  get("quiz").hidden = quizActive;
  get("skip-quiz").hidden = !quizActive;
  get("quiz").disabled = busy || Boolean(recorder);
  get("skip-quiz").disabled = busy || Boolean(recorder);
  question.placeholder = quizActive ? "Napiš odpověď na kvíz…" : "Napiš otázku…";
}

async function callApi(endpoint, payload, onText) {
  const response = await fetch("./api/" + endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60000)
  });
  if (response.ok && response.headers.get("Content-Type")?.includes("text/event-stream")) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";
    let complete = false;
    function consume(event) {
      const data = event.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart()).join("\n");
      if (!data) return;
      if (data.trim() === "[DONE]") { complete = true; return; }
      const chunk = JSON.parse(data);
      if (chunk.error) throw new Error("Odpověď se přerušila. Zkus otázku znovu.");
      const choice = chunk.choices?.[0];
      if (choice?.finish_reason) complete = true;
      const part = choice?.delta?.content ?? chunk.response;
      if (typeof part === "string") {
        text += part;
        onText?.(text);
      }
    }
    try {
      for (;;) {
        const { done, value } = await reader.read();
        buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
        buffer = buffer.replace(/\r\n/g, "\n");
        let boundary;
        while ((boundary = buffer.indexOf("\n\n")) !== -1) {
          consume(buffer.slice(0, boundary));
          buffer = buffer.slice(boundary + 2);
        }
        if (done) break;
      }
      if (buffer.trim()) consume(buffer);
      if (!complete || !text.trim()) throw new Error("Odpověď se přerušila. Zkus otázku znovu.");
      return { text: text.trim() };
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  }
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Spojení se nepodařilo.");
  return result;
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
  if (role === "assistant" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "read-answer";
    button.textContent = "Přečíst nahlas";
    const status = document.createElement("p");
    status.className = "reading-status";
    status.setAttribute("role", "status");
    button.addEventListener("click", () => readAnswer(text, button, status));
    message.append(button, status);
  }
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
  stopReading();
  history.length = 0;
  quizActive = false;
  stars = 0;
  get("stars").hidden = true;
  get("stars").textContent = "";
  feed.replaceChildren();
  question.value = "";
  setAttachment("");
  feedback.textContent = "";
  get("welcome").hidden = false;
  get("reset").hidden = true;
  controls();
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

get("compose").addEventListener("submit", (event) => {
  event.preventDefault();
  void sendMessage(quizActive ? "grade" : "chat");
});
get("quiz").addEventListener("click", () => { void sendMessage("quiz"); });
get("skip-quiz").addEventListener("click", () => {
  quizActive = false;
  feedback.textContent = "Kvíz ukončen. Můžeš se dál ptát.";
  controls();
  question.focus();
});

async function sendMessage(intent) {
  const quizRequest = intent === "quiz";
  if (!ready || busy || recorder || (!quizRequest && !question.value.trim() && !image)) return;
  if (quizRequest && (question.value.trim() || image)) {
    feedback.textContent = "Nejdřív odešli rozepsanou zprávu a pak zkus kvíz.";
    return;
  }
  const entry = {
    role: "user",
    text: quizRequest ? "Chci zkusit krátký kvíz." : question.value.trim(),
    ...(!quizRequest && image ? { image } : {})
  };
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
  const waiting = document.createElement("p");
  waiting.className = "message waiting";
  waiting.setAttribute("role", "status");
  waiting.textContent = "Doučovatel připravuje odpověď…";
  feed.append(waiting);
  waiting.scrollIntoView({ block: "center" });
  feedback.textContent = "";

  try {
    const { text, correct } = await callApi("chat", { messages, intent, stream: intent !== "grade" }, (text) => {
      waiting.classList.remove("waiting");
      waiting.classList.add("streaming");
      waiting.textContent = text;
    });
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
    waiting.remove();
    showMessage("assistant", text).scrollIntoView({ block: "start" });
    get("reset").hidden = false;
    feedback.textContent = "";
    if (quizRequest) quizActive = true;
    if (intent === "grade" && correct === true) {
      quizActive = false;
      const badge = get("stars");
      badge.hidden = false;
      badge.textContent = "★ " + ++stars;
      badge.setAttribute("aria-label", "Hvězdy za kvízy: " + stars);
      badge.classList.remove("reward");
      requestAnimationFrame(() => { if (!badge.hidden) badge.classList.add("reward"); });
      feedback.textContent = "Správně! Získáváš hvězdu.";
    }
  } catch (error) {
    pending.remove();
    get("welcome").hidden = Boolean(history.length);
    showError(error);
  } finally {
    waiting.remove();
    busy = false;
    question.readOnly = false;
    controls();
  }
}

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
    const { text } = await callApi("transcribe", { audio: btoa(binary) });
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
  if (!ready || busy) return;
  stopReading();
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
      get("mic-label").textContent = "Mluvit";
      if (failed) controls();
      else void transcribe(new Blob(chunks, { type: capture.mimeType }));
    });
    capture.start();
    recorder = capture;
    mic.setAttribute("aria-pressed", "true");
    get("mic-label").textContent = "Zastavit";
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
    get("availability").textContent = ready ? "" : "Chat zatím není připojený k AI.";
    controls();
  });
