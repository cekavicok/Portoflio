# Portfolio

Personal portfolio of Gordan Djordjević: a short introduction, projects and a CV.

The site is plain hand-written HTML and CSS, plus one JavaScript file that draws
an interactive Game of Life in the background. There is no framework, no
analytics and no cookies, and nothing is loaded from other domains. Vite is used
only as a dev server and to bundle the styles and script for deployment.

## Project structure

```
portfolio/
├── index.html                 home: who I am and what I'm interested in
├── cv.html                    CV as a web page, with links to the PDF
│
├── projects/                  the "projects" section of the site
│   ├── index.html             list of all projects, with GitHub links
│   ├── os1-kernel.html        detail page: OS1 RISC-V kernel
│   ├── bandit.html            detail page: Bandit, phishing-detection extension
│   ├── portfolio-site.html    detail page: this site
│   └── social-network.html    detail page: social network simulation (ASP)
│
├── src/
│   ├── styles/
│   │   ├── tokens.css         colours and font stacks (shared with the blog)
│   │   └── main.css           layout and styling for every page, incl. print
│   └── scripts/
│       └── life-bg.js         Game of Life background animation (shared with the blog)
│
├── public/                    copied as-is to the root of the build
│   ├── CV_GordanDjordjevic.pdf   the CV linked from cv.html
│   ├── favicon.svg
│   └── img/                   images for project pages (empty for now)
│
├── vite.config.js             dev server settings and the list of pages to build
├── package.json               npm scripts: dev, build, preview
└── dist/                      build output (generated, not committed)
```

## Running it

Requires Node.js 20 or newer.

```
npm install       # once, installs Vite
npm run dev       # dev server at http://localhost:5173, reloads on save
npm run build     # production build into dist/
npm run preview   # serve dist/ locally to check the build
```

`base` is set to `'./'` in `vite.config.js`, so the contents of `dist/` work
from a domain root, from a subfolder, or opened straight from disk. To deploy,
upload the contents of `dist/` to any static host.

Vite is pinned to 6.x because the installed Node is 20.17; Vite 7 needs Node
20.19+ or 22.12+.

## More

Notes on adding projects, updating the CV, where to change things and the
site's conventions are in [helpnotes.txt](helpnotes.txt).
