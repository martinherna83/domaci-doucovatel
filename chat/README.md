# Doučovatel v chatu

[Otevřít nástroj](https://martinherna83.github.io/domaci-doucovatel/chat/)

Jednoduchý vstup do rozhovoru v Gemini. Tlačítko zkopíruje české pokyny pro doučovatele a otevře oficiální Gemini ve stejné kartě. V novém chatu vlož pokyny, připiš otázku nebo přidej fotku a odešli zprávu. Při potížích se schránkou stránka otevře pokyny pro ruční zkopírování a nabídne samostatný odkaz.

Pro hlas otevři Gemini Live v mobilní aplikaci a řekni „Doučuj mě česky, jednoduše a po jednom kroku.“ Web používá pouze schránku pro kopírování pokynů. Otázky, fotky a hlas zpracovává Gemini. Použití stránky nevyžaduje předplatné. Bezplatné Gemini má limity a jednotlivé funkce závisejí na účtu a zařízení. [Přílohy v Gemini](https://support.google.com/gemini/answer/14903178?hl=cs) · [Gemini Live](https://support.google.com/gemini/answer/15274899?hl=cs)

## Sdílené přednastavení v Gemini

Google od 17. listopadu 2026 převádí Gems u osobních účtů dospělých na Skills. Skills lze podle Googlu použít bez předplatného, ale pro vytvoření i používání je potřeba věk alespoň 18 let, přihlášení a zapnuté uchovávání aktivity. Dokumentovaný postup je sdílení na konkrétní e-mail a následné přidání dovednosti příjemcem. Samotný odkaz proto nenahrazuje pokyny pro všechny žáky. [Přechod na Skills](https://support.google.com/gemini/answer/18560919?hl=cs) · [Vytvoření a sdílení Skills](https://support.google.com/gemini/answer/17094296?hl=cs)

Pokud si chceš připravit přednastavení pro dospělé členy rodiny:

1. Na počítači otevři [Gemini](https://gemini.google.com/) a v postranní nabídce vyber **Customize → Skills → Create → Create manually**.
2. Jako název zadej **Domácí doučovatel**, popis třeba **České doučování pro ZŠ a SŠ**. Pokyny zkopíruj z části **Pokyny k ručnímu zkopírování** na našem webu. Ulož tlačítkem **Create**.
3. V nabídce dovednosti zvol **Share skill**, zadej e-maily členů rodiny, kteří splňují podmínky, zvol **Viewer** a potvrď sdílení.
4. Příjemce v pozvánce klikne na **Open**, potom v Gemini na **Add skill**. V chatu pak dovednost vybere pomocí zkratky, kterou Gemini u Skills zobrazuje.
5. Pokud chceš ověřit možnost samostatného odkazu pro oprávněné dospělé, pošli adresu tlačítka **Open** z pozvánky na dovednost. Přístup příjemců se řídí oprávněními v Gemini.

Google uvádí, že dozorované účty v EHP, tedy i v Česku, přístup k Gemini nemají. U konkrétního účtu dítěte ověř dostupnost ještě před prvním použitím. Pokud Gemini dostupné není, dítě může použít výzvy z původního Domácího doučovatele. Google dokumentuje, že Gems v Live nefungují. Použití Skills v Live se v nápovědě nepodařilo potvrdit, proto stránka nabízí krátký hlasový pokyn. [Dozorované účty](https://support.google.com/gemini/answer/16109150?hl=cs) · [Gems a Live](https://support.google.com/gemini/answer/15146780?hl=cs)

## Místní spuštění a nasazení

V kořeni repozitáře spusť `python -m http.server 8000` a otevři [místní verzi](http://localhost:8000/chat/). Pro zkoušku cesty odpovídající GitHub Pages spusť server z nadřazené složky a otevři `http://localhost:8000/NAZEV-SLOZKY/chat/`. Kopírování vyžaduje HTTPS nebo localhost.

Nasazení používá existující GitHub Pages repozitáře. Po odeslání změn do větve `main` GitHub publikuje `chat/index.html` pod `/domaci-doucovatel/chat/`.
