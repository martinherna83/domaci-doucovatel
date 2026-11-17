"use strict";

const challenges = [
  {
    id: "zs-mat", level: "ZŠ", subject: "Matematika", title: "Kolik pizzy zbylo?",
    task: "Ema snědla 1/4 pizzy a Adam 3/8 téže pizzy. Jaká část pizzy zbyla?",
    hint: "Převeď čtvrtinu na osminy.",
    solution: "1/4 = 2/8. Dohromady snědli 2/8 + 3/8 = 5/8. Celá pizza má 8/8, takže zbylo 8/8 − 5/8 = 3/8."
  },
  {
    id: "zs-cj", level: "ZŠ", subject: "Čeština", title: "Kdo běžel po hřišti?",
    task: "Doplň i, nebo y na konci přísudku: Chlapci a dívky běžel_ po hřišti. Proč?",
    hint: "Podmět má dvě části. Jakého rodu jsou chlapci?",
    solution: "Chlapci a dívky běželi. Součástí několikanásobného podmětu jsou chlapci, tedy mužský rod životný. Ve větě s podmětem před přísudkem má přednost, proto píšeme měkké i."
  },
  {
    id: "zs-aj", level: "ZŠ", subject: "Angličtina", title: "Co dělá Mia každé ráno?",
    task: "Doplň tvar slovesa go: Mia and Tom ___ to school by bus, but their sister ___ on foot.",
    hint: "Porovnej množné číslo s třetí osobou jednotného čísla.",
    solution: "Mia and Tom go to school by bus, but their sister goes on foot. Mia and Tom odpovídá zájmenu they, their sister odpovídá she. U slovesa go ve třetí osobě jednotného čísla přidáme -es."
  },
  {
    id: "ss-mat", level: "SŠ", subject: "Matematika", title: "Nuly kvadratické funkce",
    task: "Najdi obě nuly funkce f(x) = x² − 5x + 6.",
    hint: "Hledej dvě čísla se součtem 5 a součinem 6.",
    solution: "Čísla 2 a 3 dávají součet 5 a součin 6. Platí x² − 5x + 6 = (x − 2)(x − 3). Součin je nula, když je alespoň jeden činitel nulový, tedy pro x = 2 nebo x = 3."
  },
  {
    id: "ss-cj", level: "SŠ", subject: "Čeština", title: "Podmínka, nebo příčina?",
    task: "Urči druh obou vedlejších vět: Pokud zítra přestane pršet, půjdeme ven, protože už máme doma všechno hotové.",
    hint: "Zeptej se na jednu větu „za jaké podmínky?“ a na druhou „proč?“.",
    solution: "„Pokud zítra přestane pršet“ je vedlejší věta příslovečná podmínková. „Protože už máme doma všechno hotové“ je příslovečná příčinná. Obě rozvíjejí hlavní větu „půjdeme ven“."
  },
  {
    id: "ss-aj", level: "SŠ", subject: "Angličtina", title: "Jak by to dopadlo jinak?",
    task: "Doplň tvary leave a catch v podmínce o minulosti: If we ___ earlier, we ___ the train.",
    hint: "Ve větě s if použij předminulý čas. Ve výsledku použij would have a příčestí minulé.",
    solution: "If we had left earlier, we would have caught the train. Jde o třetí kondicionál. Odjeli jsme později a vlak nám ujel, věta tedy popisuje jiný možný výsledek už uzavřené situace."
  }
];
