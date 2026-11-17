# Domácí doučovatel

Český statický web pro žáky základních a středních škol. Funguje bez registrace a bez poplatku za používání webu. Stačí HTML, CSS a JavaScript. Po publikování na GitHub Pages domácí počítač nemusí běžet.

## Místní spuštění

V kořenové složce projektu spusť:

```bash
python -m http.server 8000
```

Ve Windows můžeš místo `python` použít `py`. Otevři [místní web](http://localhost:8000/). Server ukončíš pomocí Ctrl+C. Schránku zkoušej přes `localhost` nebo HTTPS. Pokud prohlížeč kopírování zamítne, aplikace označí zadání pro ruční zkopírování.

Stejnou strukturu jako na GitHub Pages vyzkoušíš tak, že spustíš server z **nadřazené složky** a otevřeš `http://localhost:8000/NAZEV-SLOZKY/`. Odkazy na všechny soubory webu jsou relativní.

## Publikování na GitHub Pages

1. Na GitHubu vytvoř veřejný repozitář, třeba `domaci-doucovatel`. Pro veřejný repozitář lze GitHub Pages použít i s GitHub Free.
2. Ulož do kořene větve `main` soubory `index.html`, `style.css`, `app.js`, `challenges.js`, `favicon.svg`, `.nojekyll` a `README.md`. Při nahrávání přes web zkontroluj, že se přidal i skrytý soubor `.nojekyll`. Složky `work` a `outputs` do repozitáře nepatří.
3. V nastavení repozitáře otevři **Settings → Pages**. Pod **Build and deployment** nastav **Deploy from a branch**, větev **main** a složku **/ (root)**. Ulož nastavení.
4. Po dokončení nasazení otevři adresu z nastavení Pages. Pro běžný projektový repozitář má tvar `https://UZIVATEL.github.io/domaci-doucovatel/`. Pošli rodině tuto adresu. Návštěvníci k samotnému webu účet GitHub nepotřebují.

[Oficiální návod GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## První použití na mobilu

1. Otevři sdílený odkaz v Safari, Chromu nebo jiném prohlížeči. Můžeš rovnou začít jako **Host**. Pokud zařízení sdílíte, v části **Pokrok** si založ profil s přezdívkou.
2. Pro doučování zadej předmět a téma, případně ročník a místo, kde ses zasekl/a. Vyber režim a klepni na **Sestavit zadání**.
3. Zadání můžeš upravit. Klepni na **Zkopírovat zadání** a potom na **Otevřít Gemini**. V Gemini text vlož a odešli ručně. Gemini může vyžadovat přihlášení a jeho bezplatná verze má limity. Dostupnost závisí na účtu, mimo jiné u dětských nebo školních účtů.
4. Fotku připoj přímo v Gemini pomocí nabídky příloh. Pokud chceš mluvit a tvůj účet to umožňuje, otevři v mobilní aplikaci Gemini režim **Live** a řekni téma a úroveň. [Fotky a přílohy v Gemini](https://support.google.com/gemini/answer/14903178?hl=cs) · [Gemini Live](https://support.google.com/gemini/answer/15274899?hl=cs)
5. Vrať se na kartu Domácího doučovatele a označ téma **Ještě procvičit** nebo **Zvládám**. Přes **Přidat k opakování** jej zařadíš do seznamu v části **Pokrok**.

## Výzvy, pokrok a zálohy

Šest výzev z matematiky, češtiny a angličtiny má nápovědu i vysvětlené řešení přímo na webu. Gemini k nim nepotřebuješ. Bod získáš za první označení výzvy jako splněné a za každé dokončené opakování tématu. Výsledek si označuješ sám/sama.

Web ukládá přezdívky, stav témat, splněné výzvy a opakování místně v prohlížeči. Profily lze na sdíleném zařízení libovolně přepínat. Rozpracované zadání a doplňující text se trvale neukládají. Web nemá přístup k chatu v Gemini, mikrofonu ani k fotoaparátu. Do Gemini přecházíš čistým odkazem a sám/sama volíš, jaký text a přílohy tam odešleš.

Přes **Stáhnout JSON** zálohuj všechny profily. Na novém zařízení otevři stejný web a vyber zálohu v části **Přenos pokroku**. Web nejdřív ověří formát a teprve po potvrzení nahradí místní profily obsahem zálohy. Neplatný soubor stávající pokrok nepřepíše. Export obsahuje přezdívky a názvy uložených témat.

## Ověření

V Microsoft Edge na Windows byl web ověřen z místní adresy s předponou `/domaci-doucovatel/`. Prohlížeč načetl všechny soubory bez chyb. Automatické kontroly pokryly rozložení při šířkách 320, 768 a 1440 px, navigaci klávesou Tab, generování ve všech čtyřech režimech, volný předmět a vynechanou úroveň, kopírování do schránky i ruční označení při zamítnutí, otevření cílové adresy Gemini po selhání kopírování, nápovědu a řešení výzvy, získání bodů, oddělení profilů, stav po obnovení stránky a výměnu zálohy včetně odmítnutí poškozeného JSON a neplatné struktury.

Na skutečném zařízení zbývá zkontrolovat zejména chování schránky a souborů v Safari na iPhonu a iPadu a v prohlížeči na Androidu. Ověření odkazu použilo zachycenou síťovou odpověď. Přihlášení, přílohy a Gemini Live vyžadují zkoušku s konkrétním účtem. Po publikování otevři skutečnou adresu GitHub Pages.
