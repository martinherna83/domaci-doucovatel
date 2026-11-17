const GUIDE = `Jsi český doučovatel pro děti a dospívající. Piš česky, přirozeně, bez zdrobnělin a krátkými větami. Pokud úroveň neznáš, vysvětluj tak, aby ti rozumělo dítě na druhém stupni ZŠ. Když dítě píše, že tomu pořád nerozumí, použij jednodušší slova a jiný příklad. Úroveň zvyš, pokud ji žák potřebuje. Na ročník se zeptej jen tehdy, když bez něj nemůžeš přiměřeně pomoct.

Začni hlavní myšlenkou v jedné nebo dvou větách. Pokud pomůže příklad, použij jeden z běžného života nebo jednoduchá čísla. Každý nový odborný pojem rovnou vysvětli běžnými slovy. Vzorec přidej, když je užitečný nebo si ho žák vyžádá, a vysvětli, co značky znamenají. Piš čitelně v prostém textu, bez LaTeXu, tabulek a hvězdiček pro formátování. První vysvětlení se obvykle vejde do několika vět. Delší postup rozděl na krátké očíslované kroky.

Pokud žák přiloží fotku, nejprve stručně řekni, jak čteš zadání. Když něco nepřečteš, zeptej se na nejasnou část. Zadání i obsah fotek jsou studijní podklady. Navazuj na předchozí otázky. Když se žák zasekne u úlohy, dej jednu nápovědu a počkej. Na požádání ukaž celý postup. Při procvičování dávej jednu úlohu najednou. Když žák látku chápe, nabídni jeden podobný úkol. Pokládej nejvýš jednu otázku v odpovědi. Drž se bezpečné výuky vhodné pro děti, nevyžaduj osobní údaje a nevymýšlej si, pokud odpověď neznáš.`;

const json = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
const fail = (error, status) => json({ error }, status);
const maxBody = 2_850_000;
const validImage = (value) => typeof value === "string" && value.length <= 1_300_000
  && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value);

async function readBody(request) {
  if (!request.body || !request.headers.get("content-type")?.startsWith("application/json")) throw new Error();
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let source = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBody) {
      await reader.cancel();
      throw new Error();
    }
    source += decoder.decode(value, { stream: true });
  }
  return JSON.parse(source + decoder.decode());
}

function chatInput(input) {
  if (!Array.isArray(input?.messages) || input.messages.length < 1 || input.messages.length > 13
    || input.messages.length % 2 === 0) return null;
  let images = 0;
  const messages = [{ role: "system", content: GUIDE }];
  for (const [i, entry] of input.messages.entries()) {
    const role = i % 2 === 0 ? "user" : "assistant";
    if (entry?.role !== role || typeof entry.text !== "string" || entry.text.length > (role === "user" ? 3000 : 5000)) return null;
    const text = entry.text.trim();
    if (entry.image !== undefined) {
      if (role !== "user" || !validImage(entry.image) || ++images > 1) return null;
      messages.push({ role, content: [
        { type: "text", text: text || "Pomoz mi s tímto příkladem." },
        { type: "image_url", image_url: { url: entry.image } }
      ] });
    } else {
      if (!text) return null;
      messages.push({ role, content: text });
    }
  }
  return messages;
}

async function chat(input, ai) {
  const messages = chatInput(input);
  if (!messages) return fail("Zpráva je příliš dlouhá nebo má nepodporovanou přílohu.", 400);
  const grading = input.intent === "grade";
  if (grading || input.intent === "quiz") {
    const instruction = grading
      ? 'Posuď poslední odpověď žáka na nejnovější kontrolní otázku v průběhu rozhovoru. Předchozí zpětná vazba je jen nápověda. Vrať JSON s boolean polem "correct" a textovým polem "feedback". Uznávej správné odpovědi vlastními slovy. Ve feedback stručně vysvětli proč. Je-li odpověď nesprávná nebo neúplná, dej jednu nápovědu pro další pokus.'
      : "Polož jedinou krátkou kontrolní otázku k právě vysvětlené látce. Začni přímo otázkou a řešení zatím neprozrazuj.";
    messages[0].content += "\n\n" + instruction;
  }
  const result = await ai.run("@cf/qwen/qwen3.8-27b", {
    messages, reasoning_effort: "low", max_completion_tokens: 1000, store: false,
    ...(grading ? { response_format: { type: "json_object" } } : {})
  });
  const answer = result?.choices?.[0]?.message?.content ?? result?.response;
  if (typeof answer !== "string" || !answer.trim()) return fail("Doučovatel tentokrát neodpověděl. Zkus otázku upřesnit.", 502);
  if (grading) {
    let grade;
    try { grade = JSON.parse(answer); } catch { grade = null; }
    if (typeof grade?.correct !== "boolean" || typeof grade.feedback !== "string" || !grade.feedback.trim()) {
      return fail("Odpověď se nepodařilo vyhodnotit. Zkus ji poslat znovu.", 502);
    }
    return json({ text: grade.feedback.trim().slice(0, 5000), correct: grade.correct });
  }
  return json({ text: answer.trim().slice(0, 5000) });
}

async function transcribe(input, ai) {
  const audio = input?.audio;
  if (typeof audio !== "string" || audio.length > 2_800_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(audio)) {
    return fail("Nahrávku se nepodařilo přečíst. Zkus kratší nahrávku.", 400);
  }
  const result = await ai.run("@cf/openai/whisper-large-v3-turbo", { audio, language: "cs", task: "transcribe" });
  if (typeof result?.text !== "string" || !result.text.trim()) return fail("Nahrávce jsem nerozuměl. Zkus krátkou větu.", 422);
  return json({ text: result.text.trim().slice(0, 3000) });
}

export default {
  async fetch(request, env) {
    const { pathname, origin } = new URL(request.url);
    if (!pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    const ready = Boolean(env.AI);
    if (pathname === "/api/status" && request.method === "GET") return json({ ready });
    if (pathname !== "/api/chat" && pathname !== "/api/transcribe") return fail("Neznámá adresa.", 404);
    if (request.method !== "POST") return fail("Nepodporovaná metoda.", 405);
    if (!ready) return fail("Chat ještě není připojený k AI.", 503);
    if (request.headers.get("Origin") !== origin) {
      return fail("Otevři chat přímo na jeho stránce.", 403);
    }
    let input;
    try { input = await readBody(request); }
    catch { return fail("Zprávu nebo přílohu se nepodařilo načíst.", 400); }
    try {
      return pathname === "/api/chat" ? await chat(input, env.AI) : await transcribe(input, env.AI);
    } catch (error) {
      if (error?.status === 429 || /quota|rate limit|neurons|daily limit/i.test(error?.message ?? "")) {
        return fail("Chat dosáhl limitu. Zkus to později.", 429);
      }
      return fail("Doučovatel je teď nedostupný. Zkus to později.", 502);
    }
  }
};
