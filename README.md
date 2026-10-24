# maani1pk.github.io

Personal portfolio and studio site of Abdur Rehman Arshad — Unity, game and AR/VR developer.
Plain HTML/CSS/JS for GitHub Pages: no build step, no dependencies.

`app-ads.txt` is the AdMob app-ads verification file — keep it at the site root.
Skyfang's own site (`/skyfang/`) lives in the separate `maani1pk/skyfang` repository.

## Structure

| Path | Page |
|---|---|
| `index.html` | Home: hero, featured projects, about, studio, Vimersive Studio |
| `work/index.html` | Portfolio with category filters (`/work/#vr`, `#kids`, …) |
| `work/skyfang.html` | Skyfang project showcase |
| `services/index.html` | Skills and services |
| `contact/index.html` | Contact details and email-based inquiry form |
| `404.html` | Not-found page |
| `assets/js/config.js` | **Brand settings**: studio name, email, Vimersive details |
| `assets/js/projects.js` | **Project data**: every portfolio card |
| `assets/js/site.js` | Renders cards and filters, mobile menu, inquiry form |
| `assets/css/site.css` | All styles; colors are variables in `:root` |

## Common edits

- **Studio name / email** — edit `assets/js/config.js`. Every `data-brand` element picks it up.
  To rename the studio, also find/replace `Abdur Studio` across the repo (titles, meta tags, fallbacks).
- **Accent color** — `--accent` (and `--accent-line`) in `assets/css/site.css`.
- **Add a project** — add an object to `assets/js/projects.js` and put images in `assets/img/projects/`
  (JPEG, about 900–1280 px wide). Set `featured: true` to show it on the home page.
- **Contact form** — there is no backend. The form opens the visitor's email app with a pre-filled
  message to `studioEmail`. To receive submissions directly, connect a form service (e.g. Formspree) later.

## Preview locally

```bash
python -m http.server 8080
```

Then open http://127.0.0.1:8080/. Links to `/skyfang/` only work on the live site.

## Publish

Commit to `main` and push; GitHub Pages serves the repository root.
