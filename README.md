# maani1pk.github.io

Personal portfolio and studio site of Abdur Rehman Arshad (Abdur Studio): Unity, game, mobile, AR, VR and mixed-reality developer.
Plain HTML/CSS/JS for GitHub Pages. No framework and no build step for the site itself; the portfolio pages are generated once from a data file (see below).

`app-ads.txt` is the AdMob app-ads verification file: keep it at the site root.
Skyfang's own site (`/skyfang/`) lives in the separate `maani1pk/skyfang` repository.

## Structure

| Path | What it is |
|---|---|
| `index.html` | Home: hero, eight disciplines, featured projects, studio, technologies, Vimersive (generated) |
| `work/index.html` | Portfolio with category filters (`/work/#vr`, `#games`, ...) (generated) |
| `work/<category>/` | One page per discipline: `games`, `mobile-apps`, `vr`, `ar`, `mixed-reality`, `interactive-experiences`, `360-tours`, `ai` (generated) |
| `work/<project>/` | One page per project that has no site of its own (generated) |
| `work/skyfang/` | Skyfang case study (hand-written; header and footer are refreshed by the generator) |
| `bandpulse/`, `vpn-super/` | Standalone app sites with their own styles |
| `services/`, `contact/`, `404.html` | Hand-written; header and footer are refreshed by the generator |
| `_src/projects.json` | **Project data**: every card and project page comes from here |
| `_src/build.py` | Page generator (the `_src` folder is not published by GitHub Pages) |
| `assets/js/config.js` | Brand settings: studio name, email, Vimersive details |
| `assets/js/site.js` | Mobile menu, project filter, motion, inquiry form |
| `assets/css/site.css` | All styles; colours and fonts are variables in `:root` |

## Adding or changing a project

1. Edit `_src/projects.json`. Fields: `cats` (games, apps, vr, ar, mr, interactive, tours, ai; the first one is the main category),
   `status` (`released`, `soon`, `dev`, `prototype`, `client`), `owner` (`personal` or `vimersive`), `platforms`, `tech`, `desc`, optional `details`, `highlights`, `gallery`.
   Use `page` for a project that already has its own site, `external` for a link-out, and `store` / `privacy` for store and policy links.
2. Put images in `assets/img/projects/` (JPEG, about 560-900 px wide). Mark stock photos with `"stock": true` and generated cover art with `"cover": true` so the page says so.
3. Run `python _src/build.py` from the repo root. It rewrites the home page, portfolio, category pages, project pages and `sitemap.xml`.

Only list work that exists, and keep the status honest. Empty categories show an "in preparation" message instead of placeholder projects.

## Preview

```
python -m http.server 8080
```
