# Přímý chat s doučovatelem

[Otevřít nasazený chat](https://domaci-doucovatel-chat.martinherna83.workers.dev/)

Tato varianta zobrazuje otázky i odpovědi přímo na stránce. Umí přijmout fotku, přepsat krátkou nahrávku do upravitelného textu a navázat na posledních šest výměn. Přepis se před odesláním zobrazí v poli zprávy. Odpovědi jsou textové. Stávající GitHub Pages dál hostí obě původní stránky. Přímý chat se publikuje jako samostatný Cloudflare Worker spolu s obsahem složky `web/`, aby prohlížeč a API běžely na stejné adrese.

Po vysvětlení si můžeš vybrat **Zkusit kvíz**. Doučovatel položí otázku k tématu, při chybě nabídne nápovědu a za správnou odpověď získáš hvězdu. Hvězdy se počítají v otevřeném chatu. Odpověď můžeš také nechat přečíst místním českým hlasem, pokud ho prohlížeč nabízí.

## Nasazení na Workers Free

1. Přihlas se do [Cloudflare](https://dash.cloudflare.com/) a zkontroluj v **Workers & Pages**, že účet používá **Workers Free**. Placený plán ani AI Gateway nezapínej. Cloudflare na Free po vyčerpání denní kvóty AI odmítne další požadavky. [Ceník a kvóty Workers AI](https://developers.cloudflare.com/workers-ai/platform/pricing/)
2. V novém terminálu otevři složku `chat/inline` a spusť `npx wrangler login`. Potvrď přístup v prohlížeči. Pomocí `npx wrangler whoami` zkontroluj správný účet.
3. Spusť `npx wrangler deploy`. Vypíše HTTPS adresu na doméně `workers.dev`.
4. Otevři adresu Workeru a vyzkoušej text, doplňující otázku, fotku a přepis. Kdokoli s odkazem může chat ihned použít.

Ve Windows lze použít `npx.cmd`, pokud PowerShell blokuje spouštění skriptů. Nástroj nevyžaduje, aby doma běžel počítač. Členové rodiny pro něj nepotřebují vlastní účet Cloudflare.

## Provoz a data

Worker používá [Qwen pro text a fotky](https://developers.cloudflare.com/workers-ai/models/qwen3.8-27b/) a [Whisper pro přepis češtiny](https://developers.cloudflare.com/workers-ai/models/whisper-large-v3-turbo/). Volání používá vazbu Workers AI místo API klíče ve webu. Denní bezplatná kvóta je společná pro všechny návštěvníky. Při chybě lze rozepsanou otázku znovu odeslat. Konverzaci lze vymazat tlačítkem **Nový chat**.

Aplikace neukládá konverzace, fotky ani nahrávky do databáze či trvalého úložiště prohlížeče. Obsah posílá ke zpracování Cloudflare. Poslední konverzace se po dobu práce drží v paměti karty. K navazující otázce se může znovu odeslat poslední fotka z dosud dostupného kontextu. Obsah z fotky před odesláním ořízni na samotné zadání. [Zpracování dat ve Workers AI](https://developers.cloudflare.com/workers-ai/platform/data-usage/)

Gemini API se pro tuto variantu nepoužívá. Aktuální podmínky Google vylučují jeho použití v aplikacích zaměřených na nezletilé a pro klienty dostupné v EHP vyžadují placené služby. [Podmínky Gemini API](https://ai.google.dev/gemini-api/terms)

## Ověření před sdílením

Místní testy používají kontrolovanou náhradu odpovědí Workers AI. Pro živé ověření po nasazení otestuj vstup bez přihlášení, návaznost dotazů, odpověď na fotku a český přepis z mikrofonu. Zvlášť zkus Safari na iPhonu nebo iPadu a Chrome na Androidu, protože nabídka focení, oprávnění mikrofonu a formáty nahrávek závisejí na zařízení.

Na nasazeném Workeru prošlo ověření české odpovědi, navazující otázky a příkladu z testovací fotky v mobilním rozložení Edge. Přepis na serveru prošel se syntetickou anglickou nahrávkou. Český hlas z mikrofonu telefonu zbývá ověřit.

Odpovědi na otázky a kvízové otázky se zobrazují průběžně. Vyhodnocení kvízu přijde jako celek. Stav čekání je přímo v konverzaci. Při přerušeném spojení se rozepsaná otázka zachová pro nový pokus.
