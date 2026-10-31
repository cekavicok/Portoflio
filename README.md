# Portfolio

Lični portfolio sajt: početna, projekti, CV i "about". Čist HTML + CSS, jedan
JavaScript fajl za pozadinsku animaciju, a Vite služi samo za dev server i build.
Nema frameworka, nema analitike, ništa se ne učitava sa drugih domena.

## Struktura

```
portfolio/
├── index.html                 početna: kratak uvod + "Selected work" (3 projekta)
├── cv.html                    CV: iskustvo, obrazovanje, veštine (ima print stil)
├── about.html                 duža biografija + kontakt
│
├── projects/                  sve što ide pod "projects" u navigaciji
│   ├── index.html             lista svih projekata (stranica /projects/)
│   ├── os1-kernel.html        detalji: OS1 RISC-V kernel
│   ├── bandit.html            detalji: Bandit (browser ekstenzija)
│   ├── portfolio-site.html    detalji: ovaj sajt
│   └── social-network.html    detalji: ASP projekat (simulacija društvene mreže)
│
├── src/
│   ├── styles/
│   │   ├── tokens.css         boje i fontovi (deljeno sa blogom, ne menjati samo ovde)
│   │   └── main.css           raspored i izgled svih stranica
│   └── scripts/
│       └── life-bg.js         Game of Life animacija u pozadini (deljeno sa blogom)
│
├── public/                    kopira se 1:1 u koren builda
│   ├── favicon.svg
│   └── img/                   slike za stranice projekata (trenutno prazno)
│
├── vite.config.js             lista svih stranica koje ulaze u build
├── package.json               skripte: dev / build / preview
└── dist/                      izlaz builda (generiše se, ne commituje se)
```

### Čemu služi `projects/`

To je sekcija sajta sa projektima. `projects/index.html` je stranica koja se
otvara klikom na **projects** u meniju i prikazuje sve projekte sa kratkim
opisom i linkom ka GitHub repou. Svaki ostali fajl u folderu je zasebna stranica
sa detaljima jednog projekta (šta radi, kako radi, šta sam naučio). Stranice su
povezane strelicama ← → na dnu, redom kao u listi.

Folder postoji samo zbog organizacije i lepših URL-ova (`/projects/bandit.html`)
— nema nikakvu posebnu logiku.

## Pokretanje

```
npm install
npm run dev       # http://localhost:5173
npm run build     # -> dist/
npm run preview   # pregled builda
```

`base: './'` u `vite.config.js` znači da `dist/` radi bilo gde: na korenu
domena, u podfolderu, ili otvoren direktno sa diska.

## Dodavanje novog projekta

1. Kopiraj neku postojeću stranicu iz `projects/` (npr. `bandit.html`) pod novim
   imenom i promeni sadržaj: `<title>`, `<meta name="description">`, `<h1>`,
   blok `facts` (godina, tehnologije, link ka izvoru) i tekst.
2. Dodaj je u `input` u `vite.config.js`. **Bez toga stranica neće biti u
   buildu**, iako radi u `npm run dev`.
3. Dodaj karticu (`<div class="project">`) u `projects/index.html`, a po želji i
   na početnu u "Selected work".
4. Ispravi `pagination` linkove (← →) na susednim stranicama projekata.

Header, meni i footer su običan HTML ponovljen u svakom fajlu — ako ih menjaš,
menjaj svuda.

## Gde se šta menja

| Hoću da promenim...           | Fajl                                    |
| ----------------------------- | --------------------------------------- |
| boje, fontove                 | `src/styles/tokens.css` (+ kopija u blog) |
| razmake, izgled elemenata     | `src/styles/main.css`                   |
| pozadinsku animaciju          | konstante na vrhu `src/scripts/life-bg.js` |
| meni / footer                 | svaki `.html` fajl posebno              |
| favicon, slike                | `public/`                               |

Detaljnije o dizajnu, animaciji i sigurnosnim `<meta>` tagovima piše u
[README-u na nivou repoa](../README.md).
