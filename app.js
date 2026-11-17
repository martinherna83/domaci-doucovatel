"use strict";

const byId = (id) => document.getElementById(id);
const storageKey = "domaci-doucovatel/v1:" + location.pathname.replace(/index\.html$/, "");
const lessonForm = byId("lesson");
const promptBox = byId("prompt");
const copyButton = byId("copy");
const profileSelect = byId("profile");
const challengeList = byId("challenge-list");
const importStatus = byId("import-status");

const levels = {
  "primary-levels": Array.from({ length: 9 }, (_, i) => (i + 1) + ". ročník ZŠ"),
  "secondary-levels": Array.from({ length: 4 }, (_, i) => (i + 1) + ". ročník SŠ")
};
const allLevels = ["", ...Object.values(levels).flat()];
const modes = {
  "Vysvětlit látku": "Vysvětli hlavní myšlenku na jednoduchém příkladu a ověř porozumění krátkou otázkou.",
  "Pomoc s příkladem": "Pomoz mi najít další krok v příkladu. Pokud chybí samotný příklad, vyžádej si jej.",
  "Procvičit": "Dávej mi úlohy po jedné a po každé odpovědi vysvětli, co se povedlo a co opravit.",
  "Příprava na test": "Navrhni krátký plán přípravy a postupně pokládej otázky jako v testu. Po odpovědi dej zpětnou vazbu."
};

for (const [id, options] of Object.entries(levels)) {
  for (const level of options) byId(id).append(new Option(level));
}

function newProfile(name) {
  return { id: crypto.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint32Array(4))).join("-"),
    name, completed: [], topics: [] };
}

function newState() {
  const profile = newProfile("Host");
  return { version: 1, active: profile.id, profiles: [profile] };
}

const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const isText = (value, max) => typeof value === "string" && value === value.trim() && value.length > 0 && value.length <= max;
const unique = (values) => new Set(values).size === values.length;
const topicKey = ({ subject, topic, level }) => JSON.stringify([subject.toLocaleLowerCase("cs"), topic.toLocaleLowerCase("cs"), level]);
const validCount = (value) => Number.isSafeInteger(value) && value >= 0 && value <= 1000000;

function validateTopic(item) {
  return isRecord(item) && isText(item.subject, 80) && isText(item.topic, 150) && allLevels.includes(item.level)
    && ["", "Ještě procvičit", "Zvládám"].includes(item.status)
    && typeof item.queued === "boolean" && validCount(item.reviews);
}

function validateProfile(profile) {
  return isRecord(profile) && isText(profile.id, 100) && isText(profile.name, 24)
    && Array.isArray(profile.completed) && unique(profile.completed)
    && profile.completed.every((id) => challenges.some((challenge) => challenge.id === id))
    && Array.isArray(profile.topics) && profile.topics.every(validateTopic)
    && unique(profile.topics.map(topicKey));
}

function parseState(raw) {
  const data = JSON.parse(raw);
  if (!isRecord(data) || data.version !== 1 || !Array.isArray(data.profiles)
    || !data.profiles.length || !data.profiles.every(validateProfile)
    || !unique(data.profiles.map(({ id }) => id)) || !data.profiles.some(({ id }) => id === data.active)) {
    throw new Error("Neplatná záloha pokroku.");
  }
  return {
    version: 1, active: data.active,
    profiles: data.profiles.map(({ id, name, completed, topics }) => ({
      id, name, completed,
      topics: topics.map(({ subject, topic, level, status, queued, reviews }) => ({ subject, topic, level, status, queued, reviews }))
    }))
  };
}

let noticeTimer;
function announce(message) {
  const notice = byId("notice");
  notice.textContent = message;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { notice.textContent = ""; }, 5000);
}

let state = newState();
let canSave = true;
try {
  const raw = localStorage.getItem(storageKey);
  if (raw !== null) {
    canSave = false;
    state = parseState(raw);
    canSave = true;
  }
} catch {
  announce("Místní pokrok se nepodařilo načíst. Pokud máš zálohu, můžeš ji importovat.");
}

function persist(next, replace = false) {
  if (!canSave && !replace) {
    announce("Původní data jsou nečitelná. Uložení je možné po importu platné zálohy.");
    return false;
  }
  try {
    localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    announce("Pokrok se nepodařilo uložit. Zkontroluj nastavení úložiště prohlížeče.");
    return false;
  }
  canSave = true;
  state = next;
  renderProgress();
  return true;
}

const activeProfile = (data = state) => data.profiles.find(({ id }) => id === data.active);

function updateProfile(change, message) {
  const next = JSON.parse(JSON.stringify(state));
  change(activeProfile(next));
  if (persist(next)) announce(message);
}

function element(tag, value, className) {
  const node = document.createElement(tag);
  node.textContent = value;
  if (className) node.className = className;
  return node;
}

let currentLesson;
let draftRevision = 0;

function readLesson() {
  const data = new FormData(lessonForm);
  return { level: data.get("level"), subject: data.get("subject").trim(), topic: data.get("topic").trim() };
}

function describe({ subject, topic, level }) {
  return [subject, topic, level].filter(Boolean).join(" · ");
}

function refreshLesson() {
  const visible = Boolean(currentLesson && topicKey(readLesson()) === topicKey(currentLesson));
  byId("lesson-result").hidden = !visible;
  if (!visible) return;
  byId("result-topic").textContent = describe(currentLesson);
  const item = activeProfile().topics.find((entry) => topicKey(entry) === topicKey(currentLesson));
  byId("needs-practice").setAttribute("aria-pressed", item?.status === "Ještě procvičit");
  byId("mastered").setAttribute("aria-pressed", item?.status === "Zvládám");
  const queue = byId("queue");
  queue.textContent = item?.queued ? "Přidáno k opakování" : "Přidat k opakování";
  queue.setAttribute("aria-pressed", Boolean(item?.queued));
}

function draftChanged() {
  draftRevision++;
  copyButton.disabled = !promptBox.value.trim();
  byId("copy-status").textContent = "";
}

lessonForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const lesson = readLesson();
  for (const key of ["subject", "topic"]) {
    if (lesson[key]) continue;
    byId(key).setCustomValidity("Vyplň toto pole.");
    byId(key).reportValidity();
    return;
  }

  const data = new FormData(lessonForm);
  const mode = data.get("mode");
  const context = data.get("context").trim();
  const level = lesson.level || "neuvedená. Pokud ji potřebuješ k vysvětlení, zeptej se na ročník.";
  promptBox.value = [
    "Buď můj doučovatel. Piš česky, přirozeně, bez zdrobnělin a po krátkých krocích.",
    "Úroveň žáka: " + level,
    "Předmět: " + lesson.subject,
    "Téma: " + lesson.topic,
    "Režim: " + mode,
    ...(context ? ["S čím potřebuji pomoct: " + context] : []),
    "",
    modes[mode],
    "Pokud přiložím fotku, nejdřív napiš, jak jsi zadání přečetl. Pokud si nejsi jistý, doptávej se na nejasná místa.",
    "Navazuj na moje otázky a odpovědi. Když se zaseknu, nabídni jednu nápovědu. Na požádání ukaž celý postup.",
    "Na konci nabídni jeden podobný úkol přiměřený mojí úrovni."
  ].join("\n");
  currentLesson = lesson;
  draftChanged();
  refreshLesson();
  promptBox.focus();
});

lessonForm.addEventListener("input", ({ target }) => {
  if (target.id === "subject" || target.id === "topic") target.setCustomValidity("");
  refreshLesson();
});
lessonForm.addEventListener("change", refreshLesson);
for (const button of lessonForm.querySelectorAll("[data-subject]")) {
  button.addEventListener("click", () => {
    byId("subject").value = button.dataset.subject;
    byId("subject").setCustomValidity("");
    refreshLesson();
    byId("topic").focus();
  });
}

promptBox.addEventListener("input", draftChanged);
copyButton.addEventListener("click", async () => {
  const revision = draftRevision;
  const status = byId("copy-status");
  try {
    await navigator.clipboard.writeText(promptBox.value);
    if (revision === draftRevision) status.textContent = "Zadání je ve schránce.";
  } catch {
    if (revision !== draftRevision) return;
    status.textContent = "Kopírování se nepodařilo. Zadání je označené. Zkopíruj ho ručně.";
    promptBox.focus();
    promptBox.select();
  }
});

function updateLesson(change, message) {
  if (byId("lesson-result").hidden) return;
  updateProfile((profile) => {
    let item = profile.topics.find((entry) => topicKey(entry) === topicKey(currentLesson));
    if (!item) {
      item = { ...currentLesson, status: "", queued: false, reviews: 0 };
      profile.topics.push(item);
    }
    change(item);
  }, message);
}

byId("needs-practice").addEventListener("click", () => updateLesson(
  (item) => { item.status = "Ještě procvičit"; }, "Téma je označené k procvičení."
));
byId("mastered").addEventListener("click", () => updateLesson(
  (item) => { item.status = "Zvládám"; }, "Téma je označené jako zvládnuté."
));
byId("queue").addEventListener("click", () => updateLesson(
  (item) => { item.queued = true; }, "Téma je v seznamu k opakování."
));

function renderChallenges() {
  const filter = byId("filter").value;
  const cards = challenges.filter(({ level }) => !filter || level === filter).map((challenge) => {
    const card = element("article", "", "card");
    card.append(element("span", challenge.level + " · " + challenge.subject, "tag"),
      element("h3", challenge.title), element("p", challenge.task));

    for (const [label, content] of [["Nápověda", challenge.hint], ["Řešení", challenge.solution]]) {
      const details = document.createElement("details");
      details.append(element("summary", label), element("p", content));
      card.append(details);
    }
    const button = element("button", "Označit jako splněnou");
    button.type = "button";
    button.dataset.challenge = challenge.id;
    button.setAttribute("aria-label", "Označit jako splněnou: " + challenge.title);
    button.addEventListener("click", () => {
      if (activeProfile().completed.includes(challenge.id)) return;
      updateProfile((profile) => { profile.completed.push(challenge.id); }, "Výzva splněna. Získáváš bod!");
    });
    card.append(button);
    return card;
  });
  challengeList.replaceChildren(...cards);
  updateChallengeButtons();
}

function updateChallengeButtons() {
  const completed = activeProfile().completed;
  for (const button of challengeList.querySelectorAll("[data-challenge]")) {
    const done = completed.includes(button.dataset.challenge);
    const title = challenges.find(({ id }) => id === button.dataset.challenge).title;
    button.textContent = done ? "✓ Splněno" : "Označit jako splněnou";
    button.setAttribute("aria-label", (done ? "Splněno: " : "Označit jako splněnou: ") + title);
    button.setAttribute("aria-disabled", done);
  }
}

function renderProgress() {
  const profile = activeProfile();
  const reviews = profile.topics.reduce((sum, item) => sum + item.reviews, 0);
  byId("point-count").textContent = profile.completed.length + reviews;
  byId("challenge-count").textContent = profile.completed.length;
  byId("review-count").textContent = reviews;
  const options = Array.from(profileSelect.options);
  if (options.length !== state.profiles.length || options.some((option, i) =>
    option.value !== state.profiles[i].id || option.text !== state.profiles[i].name)) {
    profileSelect.replaceChildren(...state.profiles.map(({ name, id }) => new Option(name, id)));
  }
  profileSelect.value = profile.id;

  const queued = profile.topics.filter((item) => item.queued);
  byId("review-list").replaceChildren(...(queued.length ? queued.map((item) => {
    const row = element("li", describe(item));
    const button = element("button", "Označit opakování za hotové");
    button.type = "button";
    button.setAttribute("aria-label", "Označit opakování za hotové: " + describe(item));
    button.addEventListener("click", () => {
      if (item.reviews >= 1000000) return;
      updateProfile((profile) => {
        const entry = profile.topics.find((entry) => topicKey(entry) === topicKey(item));
        entry.queued = false;
        entry.reviews++;
      }, "Opakování je hotové. Získáváš bod!");
      if (!button.isConnected) byId("review-list").querySelector("li")?.focus();
    });
    row.append(button);
    return row;
  }) : [element("li", "Zatím tu nejsou žádná témata.", "muted")]));
  for (const row of byId("review-list").children) row.tabIndex = -1;
  byId("topic-list").replaceChildren(...(profile.topics.length ? profile.topics.map((item) => {
    const details = [item.status, item.reviews ? "Počet opakování: " + item.reviews : ""].filter(Boolean);
    const row = element("li", [describe(item), ...details].join(" · "));
    if (!item.queued) {
      const button = element("button", "Přidat k opakování");
      button.type = "button";
      button.setAttribute("aria-label", "Přidat k opakování: " + describe(item));
      button.addEventListener("click", () => {
        updateProfile((profile) => {
          profile.topics.find((entry) => topicKey(entry) === topicKey(item)).queued = true;
        }, "Téma je v seznamu k opakování.");
        if (!button.isConnected) byId("review-list").querySelector("li button")?.focus();
      });
      row.append(button);
    }
    return row;
  }) : [element("li", "Zatím tu nejsou žádná uložená témata.", "muted")]));
  updateChallengeButtons();
  refreshLesson();
}

function clearDraft() {
  currentLesson = undefined;
  lessonForm.reset();
  byId("subject").setCustomValidity("");
  byId("topic").setCustomValidity("");
  promptBox.value = "";
  draftChanged();
  refreshLesson();
}

profileSelect.addEventListener("change", () => {
  if (persist({ ...state, active: profileSelect.value })) {
    clearDraft();
    announce("Aktivní profil: " + activeProfile().name);
  } else {
    profileSelect.value = state.active;
  }
});

const nickname = byId("nickname");
nickname.addEventListener("input", () => nickname.setCustomValidity(""));
byId("profile-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = nickname.value.trim();
  if (!name || state.profiles.some((profile) => profile.name.toLocaleLowerCase("cs") === name.toLocaleLowerCase("cs"))) {
    nickname.setCustomValidity(name ? "Tato přezdívka už existuje. Vyber jinou." : "Zadej přezdívku.");
    nickname.reportValidity();
    return;
  }
  const profile = newProfile(name);
  if (persist({ ...state, active: profile.id, profiles: [...state.profiles, profile] })) {
    nickname.value = "";
    clearDraft();
    announce("Vytvořen profil: " + name);
  }
});

byId("export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "domaci-doucovatel-pokrok.json";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
});

byId("import").addEventListener("change", async ({ target }) => {
  const file = target.files[0];
  if (!file) return;
  target.disabled = true;
  importStatus.textContent = "";
  try {
    const next = parseState(await file.text());
    if (!window.confirm("Nahradit všechny místní profily a jejich pokrok obsahem této zálohy?")) {
      importStatus.textContent = "Import byl zrušen.";
    } else if (persist(next, true)) {
      clearDraft();
      importStatus.textContent = "Záloha pokroku byla načtena.";
    } else {
      importStatus.textContent = "Zálohu se nepodařilo uložit.";
    }
  } catch {
    importStatus.textContent = "Soubor není platná záloha Domácího doučovatele. Původní pokrok zůstal zachován.";
  } finally {
    target.value = "";
    target.disabled = false;
  }
});

window.addEventListener("storage", (event) => {
  if (event.key !== storageKey && event.key !== null) return;
  try {
    const raw = localStorage.getItem(storageKey);
    const next = raw === null ? newState() : parseState(raw);
    const switched = next.active !== state.active;
    state = next;
    canSave = true;
    if (switched) clearDraft();
    renderProgress();
  } catch {
    canSave = false;
    announce("Změnu pokroku z jiné karty se nepodařilo načíst.");
  }
});

byId("filter").addEventListener("change", renderChallenges);
renderChallenges();
renderProgress();
