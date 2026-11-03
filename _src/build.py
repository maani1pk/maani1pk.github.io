#!/usr/bin/env python3
"""Static page generator for maani1pk.github.io (not published: the _src folder is ignored by GitHub Pages).

Run from the repo root after editing _src/projects.json:   python _src/build.py

Writes: index.html, work/index.html, work/<category>/index.html, work/<project>/index.html, sitemap.xml
Refreshes the shared header/footer and fonts in the hand-written pages (services, contact, 404, work/skyfang).
Existing project sites (/skyfang case study, /bandpulse/, /vpn-super/) are linked, never overwritten.
"""
import json, os, re, html, datetime
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = 'https://maani1pk.github.io'
E = html.escape

CATS = [
    dict(id='games', slug='games', name='Game Development', short='Games', color='#FF8A4C',
         intro='Mobile and 3D games built in Unity, from the core loop and rules to UI, polish and store builds.',
         topics=['Mobile games (Android & iOS)', '3D games', 'Multiplayer games', 'Casual & hyper-casual games', 'Unity game development', 'Game UI/UX']),
    dict(id='apps', slug='mobile-apps', name='Mobile App Development', short='Mobile Apps', color='#F5705F',
         intro='Android and iOS apps that do one job well: utilities, creative tools and apps for kids.',
         topics=['Android applications', 'iOS applications', 'Utility apps', 'VPN applications', 'Productivity apps', 'AI-powered applications']),
    dict(id='vr', slug='vr', name='Virtual Reality', short='VR', color='#E5546B',
         intro='Meta Quest experiences, from games and creative tools to training and educational worlds.',
         topics=['Meta Quest 2 / Quest 3', 'VR training simulations', 'VR experiences', 'Interactive VR environments', 'Educational VR applications', 'VR games']),
    dict(id='ar', slug='ar', name='Augmented Reality', short='AR', color='#C9459A',
         intro='AR on phones: placing things in your room, drawing and tracing with the camera, and face effects.',
         topics=['AR applications', 'AR product visualization', 'AR face filters', 'AR drawing & tracing', 'AR try-on experiences', 'Interactive AR experiences']),
    dict(id='mr', slug='mixed-reality', name='Mixed Reality & Spatial Computing', short='MR', color='#A33A93',
         intro='Experiences that blend the real room with virtual objects and respond to where you are.',
         topics=['Mixed reality experiences', 'Spatial interactions', 'Passthrough applications', 'Immersive environments']),
    dict(id='interactive', slug='interactive-experiences', name='Interactive Experiences & Installations', short='Interactive Experiences', color='#8A4BC0',
         intro='Interactive and visual work for exhibitions, spaces and commercial settings.',
         topics=['Interactive kiosks', 'Touchscreen applications', 'Interactive displays', 'Smart mirror experiences', 'Commercial interactive solutions']),
    dict(id='tours', slug='360-tours', name='360° Experiences & Virtual Tours', short='360° Tours', color='#6B4BC8',
         intro='Walk-through 360° environments and virtual tours for places, property and presentations.',
         topics=['360° virtual tours', 'Interactive 360° environments', 'Real estate virtual tours', 'Immersive presentations']),
    dict(id='ai', slug='ai', name='AI & Emerging Technologies', short='AI', color='#4A3AA0',
         intro='Practical AI and automation inside apps and tools.',
         topics=['AI-powered applications', 'AI integration', 'Creative AI tools', 'Automation & smart solutions']),
]
CAT = {c['id']: c for c in CATS}
STATUS = {
    'released': ('Published', 'chip--released'), 'soon': ('Coming soon', 'chip--soon'), 'dev': ('In development', 'chip--dev'),
    'prototype': ('Prototype', 'chip--proto'), 'client': ('Client work', 'chip--client'),
}
OWNER = {'personal': 'Personal product', 'vimersive': 'Vimersive Studio'}

PROJECTS = json.load(open(os.path.join(ROOT, '_src', 'projects.json'), encoding='utf-8'))
for p in PROJECTS:
    p['primary'] = p['cats'][0]
    if p.get('page'): p['url'] = p['page']
    elif p.get('external'): p['url'] = p['external']
    else: p['url'] = f"/work/{p['id']}/"
    p['internal'] = not p['url'].startswith('http')
    p['has_page'] = not p.get('page') and not p.get('external')

def count(cid): return sum(1 for p in PROJECTS if cid in p['cats'])
def in_cat(cid): return [p for p in PROJECTS if cid in p['cats']]
def write(path, text):
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w', encoding='utf-8', newline='\n') as f: f.write(text)

# ------------------------------------------------------------------ shared chrome
FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&amp;family=Instrument+Sans:wght@400;500;600&amp;display=swap">'

def header(current=''):
    def a(href, label, key):
        cur = ' aria-current="page"' if key == current else ''
        return f'<a href="{href}"{cur}>{label}</a>'
    return ('<header class="site-header">\n<nav class="wrap nav" aria-label="Main">\n'
            '<a class="brand" href="/"><img class="brand__logo" src="/assets/img/logo.svg" alt="Abdur Studio" width="130" height="44"></a>\n'
            '<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-menu">Menu</button>\n<div class="menu" id="site-menu">\n'
            + a('/work/', 'Work', 'work') + '\n' + a('/services/', 'Services', 'services') + '\n' + a('/#studio', 'Studio', 'studio') + '\n' + a('/#vimersive', 'Vimersive', 'vimersive')
            + '\n<a class="btn btn--primary" href="/contact/">Work with me</a>\n</div>\n</nav>\n</header>')

def footer():
    cats = ''.join(f'<li><a href="/work/{c["slug"]}/">{E(c["name"])}</a></li>' for c in CATS)
    return ('<footer class="site-footer">\n<div class="wrap">\n<div class="foot">\n'
            '<div><h2>Abdur Studio</h2><p>Games, apps and immersive experiences by Abdur Rehman Arshad. Unity, AR, VR and mixed reality, from prototype to a build on a real device.</p></div>\n'
            f'<div><h2>Work</h2><ul><li><a href="/work/">All projects</a></li>{cats}</ul></div>\n'
            '<div><h2>Studio</h2><ul><li><a href="/services/">Services</a></li><li><a href="/#studio">About the studio</a></li><li><a href="/#vimersive">Vimersive Studio</a></li><li><a href="/contact/">Contact</a></li><li><a href="/privacy/">Privacy</a></li></ul></div>\n'
            '<div><h2>Apps and policies</h2><ul><li><a href="/work/skyfang/">Skyfang</a></li><li><a href="/skyfang/privacy-policy.html">Skyfang privacy policy</a></li><li><a href="/bandpulse/">BandPulse</a></li><li><a href="/bandpulse/privacy-policy.html">BandPulse privacy policy</a></li><li><a href="/vpn-super/">VPN Super</a></li><li><a href="/vpn-super/privacy-policy.html">VPN Super privacy policy</a></li></ul></div>\n'
            '</div>\n<div class="legal"><span>© <span data-year>2026</span> Abdur Rehman Arshad · <span data-brand="studioName">Abdur Studio</span></span><a href="mailto:maani1pk@gmail.com">maani1pk@gmail.com</a></div>\n</div>\n</footer>')

def head(title, desc, path, og_img='/assets/img/og.jpg', extra='', og_type='website'):
    url = SITE + path
    return (f'<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n'
            f'<title>{E(title)}</title>\n<meta name="description" content="{E(desc)}">\n<link rel="canonical" href="{url}">\n<meta name="theme-color" content="#F5F3FA">\n'
            f'<meta property="og:type" content="{og_type}">\n<meta property="og:site_name" content="Abdur Studio">\n<meta property="og:title" content="{E(title)}">\n'
            f'<meta property="og:description" content="{E(desc)}">\n<meta property="og:url" content="{url}">\n<meta property="og:image" content="{SITE + og_img}">\n'
            f'<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:title" content="{E(title)}">\n<meta name="twitter:description" content="{E(desc)}">\n<meta name="twitter:image" content="{SITE + og_img}">\n'
            '<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">\n<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">\n'
            f'{FONTS}\n<link rel="stylesheet" href="/assets/css/site.css">\n{extra}</head>\n<body>\n<a class="skip" href="#main">Skip to content</a>\n')

def tail():
    return '<script src="/assets/js/config.js"></script>\n<script src="/assets/js/site.js"></script>\n</body>\n</html>\n'

def ld(obj): return '<script type="application/ld+json">\n' + json.dumps(obj, ensure_ascii=False, separators=(',', ':')) + '\n</script>\n'
def crumbs_ld(items):
    return {'@type': 'BreadcrumbList', 'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': SITE + u} for i, (n, u) in enumerate(items)]}

# ------------------------------------------------------------------ cards
def status_chip(p):
    label, cls = STATUS[p['status']]
    return f'<span class="chip {cls}">{E(p.get("statusLabel") or label)}</span>'

def card(p):
    cat = CAT[p['primary']]
    cats = ' '.join(p['cats'])
    phone = ' card__media--phone' if p.get('fit') == 'phone' else ''
    img = f'<img src="{p["img"]}" alt="{E(p.get("alt", p["name"]))}" loading="lazy" decoding="async">' if p.get('img') else ''
    if not img:
        img = f'<span class="card__empty" aria-hidden="true"></span>'
    live = '<span class="card__live">Live on the App Store</span>' if p['status'] == 'released' and p.get('store') and 'apple' in p['store'] else ''
    note = ('<p class="card__note">Illustrative stock photo. Captures coming soon.</p>' if p.get('stock')
            else '<p class="card__note">Cover graphic. Captures coming soon.</p>' if p.get('cover') else '')
    chip = f'<span class="card__badge">{status_chip(p)}</span>' if not live else ''
    tech = ''.join(f'<li>{E(t)}</li>' for t in p['tech'][:3])
    ext = ' rel="noopener"' if not p['internal'] else ''
    label = p.get('linkLabel') or ('Read the case study' if p['internal'] else 'View project')
    link_txt = label + (' ↗' if not p['internal'] else '')
    store = ''
    if p.get('store'):
        sn = p.get('storeName', 'App Store')
        small = 'Download on the' if sn == 'App Store' else 'Get it on'
        the = 'the ' if sn == 'App Store' else ''
        store = f'<a class="btn-store" href="{p["store"]}" rel="noopener" aria-label="Download {E(p["name"])} on {the}{sn}"><small>{small}</small><strong>{sn}</strong></a>'
    privacy = f'<a class="card__privacy" href="{p["privacy"]}">Privacy policy</a>' if p.get('privacy') else ''
    return (f'<article class="card" data-cats="{cats}" data-primary="{p["primary"]}" data-status="{p["status"]}">\n'
            f'<div class="card__media{phone}">{img}{chip}{live}</div>{note}\n'
            f'<div class="card__body">\n<p class="card__cat">{E(cat["short"])}{" and " + E(CAT[p["cats"][1]]["short"]) if len(p["cats"]) > 1 else ""}</p>\n'
            f'<h3 class="card__title"><a href="{p["url"]}"{ext}>{E(p["name"])}</a></h3>\n<p class="card__desc">{E(p["desc"])}</p>\n'
            f'<ul class="card__tech" aria-label="Technologies">{tech}</ul>\n<p class="card__meta">{E(" · ".join(p["platforms"]))} · {OWNER[p["owner"]]}</p>\n'
            f'<div class="card__actions"><a class="card__link" href="{p["url"]}"{ext} aria-label="{E(label)}: {E(p["name"])}">{E(link_txt)}</a>{store}</div>\n{privacy}\n</div>\n</article>')

def grid(projs): return '<div class="grid" id="project-grid">\n' + '\n'.join(card(p) for p in projs) + '\n</div>'

def empty_state(cat):
    return (f'<div class="empty" id="project-empty">\n<h3>Case studies for {E(cat["name"])} are in preparation</h3>\n'
            '<p>Nothing is published in this category yet. If you have a project in this area, tell me about it and I will reply with a plan.</p>\n'
            '<div class="btn-row"><a class="btn btn--primary" href="/contact/">Discuss a project</a><a class="btn btn--ghost" href="/work/">Browse all projects</a></div>\n</div>')

def other_cats(current=None):
    items = ''.join(f'<li><a style="--c:{c["color"]}" href="/work/{c["slug"]}/">{E(c["short"])}</a></li>' for c in CATS if c['id'] != current)
    return f'<ul class="cat-nav">{items}</ul>'

# ------------------------------------------------------------------ pages
def cta_block():
    return ('<section class="wrap" style="padding-bottom:96px" aria-labelledby="cta-h">\n<div class="cta">\n<div class="cta__rings" aria-hidden="true"><i></i><i></i><i></i></div>\n<div>\n'
            '<h2 class="h2" id="cta-h">Have a game, app or XR idea?</h2>\n<p class="muted" style="margin-top:10px">Tell me what you are building. I will reply with honest questions, a rough plan and what it would take.</p>\n</div>\n'
            '<a class="btn btn--primary" href="/contact/">Discuss your project</a>\n</div>\n</section>')

def work_page():
    filters = '<a class="filter" data-filter="all" href="/work/" aria-current="page">All Projects <span>%d</span></a>' % len(PROJECTS)
    for c in CATS:
        filters += f'<a class="filter" data-filter="{c["id"]}" href="/work/{c["slug"]}/">{E(c["short"])} <span>{count(c["id"])}</span></a>'
    h = head('Portfolio: games, apps, AR, VR and more | Abdur Studio',
             'Games, apps, AR, VR and mixed-reality projects by Abdur Rehman Arshad, each with its real status: published, coming soon, in development, prototype or client work.', '/work/',
             extra=ld({'@context': 'https://schema.org', '@type': 'CollectionPage', 'name': 'Abdur Studio portfolio', 'url': SITE + '/work/',
                       'mainEntity': {'@type': 'ItemList', 'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'url': (SITE + p['url']) if p['internal'] else p['url'], 'name': p['name']} for i, p in enumerate(PROJECTS)]}}))
    return (h + header('work') + '\n<main id="main">\n<section class="wrap page-head">\n<p class="eyebrow">Portfolio</p>\n<h1 class="h1">Games, apps and immersive work</h1>\n'
            '<p class="lead">Every card says who owns the work and where it stands: published, coming soon, in development, prototype, or client work done with Vimersive Studio.</p>\n</section>\n'
            f'<div class="filterbar"><nav class="wrap" aria-label="Filter projects by category"><div class="filters" id="project-filters">{filters}</div></nav></div>\n'
            '<section class="wrap section" style="padding-top:8px" aria-label="Projects">\n<p class="result-line" id="project-count" aria-live="polite">%d projects</p>\n' % len(PROJECTS)
            + grid(PROJECTS) + '\n<div hidden id="empty-filter">' + empty_state(dict(name='this category')) + '</div>\n</section>\n'
            '<section class="section section--alt"><div class="wrap">\n<div class="section-head"><div><h2 class="h2">Browse by discipline</h2></div></div>\n' + other_cats() + '\n</div></section>\n'
            + cta_block() + '\n</main>\n' + footer() + '\n' + tail())

def category_page(c):
    projs = in_cat(c['id'])
    n = len(projs)
    filters = '<a class="filter" data-filter="all" href="/work/">All Projects <span>%d</span></a>' % len(PROJECTS)
    for k in CATS:
        cur = ' aria-current="page"' if k['id'] == c['id'] else ''
        filters += f'<a class="filter" data-filter="{k["id"]}" href="/work/{k["slug"]}/"{cur}>{E(k["short"])} <span>{count(k["id"])}</span></a>'
    title = f'{c["name"]} portfolio | Abdur Studio'
    desc = f'{c["intro"]} {n} project{"s" if n != 1 else ""} by Abdur Rehman Arshad.' if n else f'{c["intro"]} Case studies are in preparation.'
    og = next((p['img'] for p in projs if p.get('img') and not p.get('stock') and p['fit'] == 'cover'), '/assets/img/og.jpg')
    ld_obj = {'@context': 'https://schema.org', '@graph': [
        {'@type': 'CollectionPage', 'name': c['name'], 'url': f'{SITE}/work/{c["slug"]}/', 'description': c['intro'],
         'mainEntity': {'@type': 'ItemList', 'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'url': (SITE + p['url']) if p['internal'] else p['url'], 'name': p['name']} for i, p in enumerate(projs)]}},
        crumbs_ld([('Home', '/'), ('Work', '/work/'), (c['name'], f'/work/{c["slug"]}/')])]}
    body = grid(projs) if n else empty_state(c)
    topics = ''.join(f'<li>{E(t)}</li>' for t in c['topics'])
    return (head(title, desc, f'/work/{c["slug"]}/', og, ld(ld_obj)) + header('work') + '\n<main id="main">\n'
            f'<section class="cat-head" style="--c:{c["color"]}"><div class="wrap">\n<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><a href="/work/">Work</a><span aria-hidden="true">/</span><span>{E(c["short"])}</span></nav>\n'
            f'<h1 class="h1">{E(c["name"])}</h1>\n<p class="lead" style="margin-top:18px">{E(c["intro"])}</p>\n<ul class="topics" aria-label="What this covers">{topics}</ul>\n</div></section>\n'
            f'<div class="filterbar"><nav class="wrap" aria-label="Browse categories"><div class="filters">{filters}</div></nav></div>\n'
            f'<section class="wrap section" style="padding-top:8px" aria-label="Projects in {E(c["name"])}">\n<p class="result-line">{n} project{"s" if n != 1 else ""}</p>\n{body}\n</section>\n'
            '<section class="section section--alt"><div class="wrap">\n<div class="section-head"><div><h2 class="h2">Other disciplines</h2></div></div>\n' + other_cats(c['id']) + '\n</div></section>\n'
            + cta_block() + '\n</main>\n' + footer() + '\n' + tail())

def project_page(p):
    c = CAT[p['primary']]
    related = [q for q in PROJECTS if q['id'] != p['id'] and q['primary'] == p['primary']][:3]
    if len(related) < 3: related += [q for q in PROJECTS if q['id'] != p['id'] and q not in related and set(q['cats']) & set(p['cats'])][:3 - len(related)]
    cats_links = ', '.join(f'<a href="/work/{CAT[k]["slug"]}/">{E(CAT[k]["name"])}</a>' for k in p['cats'])
    label, _ = STATUS[p['status']]
    title = f'{p["name"]} | {c["short"]} project | Abdur Studio'
    desc = (p.get('tagline', '') + ' ' + p['desc']).strip()[:158]
    schema_type = 'MobileApplication' if p['cats'][0] in ('apps',) else ('VideoGame' if p['cats'][0] == 'games' else 'CreativeWork')
    ld_obj = {'@context': 'https://schema.org', '@graph': [
        {'@type': schema_type, 'name': p['name'], 'description': p['desc'], 'url': f'{SITE}{p["url"]}', **({'image': SITE + p['img']} if p.get('img') and not p.get('stock') else {}),
         'creator': {'@type': 'Person', 'name': 'Abdur Rehman Arshad', 'url': SITE + '/'}, 'keywords': ', '.join(p['tech']),
         **({'sameAs': [p['store']]} if p.get('store') else {})},
        crumbs_ld([('Home', '/'), ('Work', '/work/'), (c['name'], f'/work/{c["slug"]}/'), (p['name'], p['url'])])]}
    og = p['img'] if p.get('img') and not p.get('stock') else '/assets/img/og.jpg'
    phone = p.get('fit') == 'phone'
    media = (f'<div class="pj__media{" pj__media--phone" if phone else ""}" style="--c:{c["color"]}"><img src="{p["img"]}" alt="{E(p.get("alt", p["name"]))}" width="900" height="{1500 if phone else 560}"></div>' if p.get('img') else '')
    details = ''.join(f'<p>{E(t)}</p>' for t in p.get('details', [])) or f'<p>{E(p["desc"])}</p>'
    hl = ''
    if p.get('highlights'): hl = '<h2 class="h2" style="font-size:28px;margin:8px 0 4px">Highlights</h2>\n<ul class="hl-list">' + ''.join(f'<li>{E(t)}</li>' for t in p['highlights']) + '</ul>'
    stock = '<p class="small">The image is an illustrative stock photo. Real captures will replace it.</p>' if p.get('stock') else ''
    cover = '<p class="small">The image is a cover graphic, not a screenshot.</p>' if p.get('cover') else ''
    gal = ''
    if p.get('gallery'):
        gal = '<section class="section section--alt"><div class="wrap"><div class="section-head"><div><h2 class="h2">Screens</h2></div></div><div class="pj-gallery">' + ''.join(f'<figure><img src="{u}" alt="{E(a)}" loading="lazy" width="560" height="1100"></figure>' for u, a in p['gallery']) + '</div></div></section>'
    store = ''
    if p.get('store'):
        sn = p.get('storeName', 'App Store'); small = 'Download on the' if sn == 'App Store' else 'Get it on'
        store = f'<a class="btn-store btn-store--lg" href="{p["store"]}" rel="noopener"><small>{small}</small><strong>{sn}</strong></a>'
    rel = ''
    if related:
        rel = '<section class="section"><div class="wrap"><div class="section-head"><div><h2 class="h2">More in ' + E(c['short']) + '</h2></div><a href="/work/' + c['slug'] + '/">See all ' + E(c['short']) + ' projects</a></div><div class="grid">' + '\n'.join(card(q) for q in related) + '</div></div></section>'
    return (head(title, desc, p['url'], og, ld(ld_obj)) + header('work') + '\n<main id="main">\n<div class="wrap pj">\n<div class="pj__copy">\n'
            f'<nav class="crumbs" aria-label="Breadcrumb" style="margin-bottom:0"><a href="/">Home</a><span aria-hidden="true">/</span><a href="/work/">Work</a><span aria-hidden="true">/</span><a href="/work/{c["slug"]}/">{E(c["short"])}</a></nav>\n'
            f'<div class="chips">{status_chip(p)}<span class="chip">{OWNER[p["owner"]]}</span></div>\n<h1 class="h1">{E(p["name"])}</h1>\n<p class="lead">{E(p.get("tagline", p["desc"]))}</p>\n'
            f'<div class="btn-row">{store}<a class="btn btn--primary" href="/contact/">Discuss a similar project</a><a class="btn btn--ghost" href="/work/{c["slug"]}/">More {E(c["short"])} work</a></div>\n'
            f'<dl class="facts"><dt>Status</dt><dd>{E(p.get("statusLabel") or label)}</dd><dt>Category</dt><dd>{cats_links}</dd><dt>Platform</dt><dd>{E(", ".join(p["platforms"]))}</dd><dt>Technology</dt><dd>{E(", ".join(p["tech"]))}</dd><dt>My role</dt><dd>{E(p["role"])}</dd><dt>Owner</dt><dd>{OWNER[p["owner"]]}</dd></dl>\n'
            f'<div class="prose">{details}{stock}{cover}</div>\n{hl}\n</div>\n{media}\n</div>\n{gal}\n{rel}\n' + cta_block() + '\n</main>\n' + footer() + '\n' + tail())

# ------------------------------------------------------------------ home
HERO_SVG = open(os.path.join(ROOT, '_src', 'hero.svg.html'), encoding='utf-8').read()

def home_page():
    rows = ''
    for c in CATS:
        n = count(c['id'])
        cnt = f'<span class="disc__count">{n} project{"s" if n != 1 else ""}</span>' if n else '<span class="disc__count disc__count--empty">In preparation</span>'
        rows += (f'<li><a class="disc__row" style="--c:{c["color"]}" href="/work/{c["slug"]}/"><span class="disc__name">{E(c["name"])}</span>'
                 f'<span class="disc__topics">{E(", ".join(c["topics"][:4]))}</span>{cnt}<span class="disc__arrow" aria-hidden="true"></span></a></li>\n')
    feat = [p for p in PROJECTS if p.get('featured')]
    mq = ''.join(f'<span>{E(t)}</span>' for t in ['Game development', 'Mobile apps', 'Virtual reality', 'Augmented reality', 'Mixed reality', 'Interactive experiences', '360° tours', 'AI and emerging tech'])
    desc = 'Abdur Studio builds Unity games, mobile apps and AR, VR and mixed-reality experiences. Real projects, honest status: published, in development and prototypes.'
    ld_obj = {'@context': 'https://schema.org', '@graph': [
        {'@type': 'Person', 'name': 'Abdur Rehman Arshad', 'url': SITE + '/', 'jobTitle': 'Unity, Game and AR/VR Developer', 'email': 'mailto:maani1pk@gmail.com',
         'brand': {'@type': 'Brand', 'name': 'Abdur Studio'}, 'worksFor': {'@type': 'Organization', 'name': 'Vimersive Studio', 'url': 'https://vimersive.studio'},
         'knowsAbout': ['Unity', 'C#', 'Game development', 'Mobile apps', 'Augmented reality', 'Virtual reality', 'Mixed reality', 'Meta Quest', 'OpenXR', 'AR Foundation']},
        {'@type': 'WebSite', 'name': 'Abdur Studio', 'url': SITE + '/'}]}
    out = head('Abdur Studio: Unity games, mobile apps, AR and VR', desc, '/', extra=ld(ld_obj))
    out += header('') + '''
<main id="main">
<div class="band band--dark hero-band">
<section class="wrap hero" aria-labelledby="hero-h" data-hero>
<div class="hero__copy">
<h1 class="h1 hero-title" id="hero-h"><span class="w" style="--w:0"><span>Games,</span></span> <span class="w" style="--w:1"><span>apps</span></span> <span class="w" style="--w:2"><span>and</span></span> <span class="w grad" style="--w:3"><span>immersive</span></span> <span class="w grad" style="--w:4"><span>worlds.</span></span></h1>
<p class="rotator rv" style="--d:.35s"><span class="sr-only">Specialising in game development, mobile apps, AR and VR, mixed reality and interactive experiences.</span><span aria-hidden="true">Specialising in</span> <span class="rotator__words" aria-hidden="true"><span>Game Development</span><span>Mobile Apps</span><span>AR &amp; VR</span><span>Mixed Reality</span><span>Interactive Experiences</span></span></p>
<p class="lead rv" style="--d:.5s">I'm Abdur Rehman Arshad. Abdur Studio builds Unity games, mobile apps and AR, VR and mixed-reality experiences, from the first prototype to a build running on a real device.</p>
<div class="btn-row rv" style="--d:.65s">
<a class="btn btn--primary" href="/work/">Explore the work</a>
<a class="btn btn--ghost" href="/contact/">Start a project</a>
</div>
</div>
''' + HERO_SVG + '''
</section>
<div class="marquee" aria-label="Disciplines">
<div class="marquee__track">
<div class="marquee__group">''' + mq + '''</div>
<div class="marquee__group" aria-hidden="true">''' + mq + '''</div>
</div>
</div>
</div>

<section class="section section--paper" aria-labelledby="disc-h">
<div class="wrap">
<div class="section-head"><div><h2 class="h2" id="disc-h">Eight disciplines, one studio</h2><p class="lead">Pick a discipline to see the projects behind it. Categories with no published work say so.</p></div><a href="/work/">View the full portfolio</a></div>
<ul class="disc">
''' + rows + '''</ul>
</div>
</section>

<section class="section section--tint" aria-labelledby="feat-h">
<div class="wrap">
<div class="section-head"><div><h2 class="h2" id="feat-h">Featured projects</h2><p class="lead">A mix of published apps and work in progress. Each card shows its real status.</p></div><a href="/work/">View all projects</a></div>
<div class="grid">
''' + '\n'.join(card(p) for p in feat) + '''
</div>
</div>
</section>

<section class="section section--paper" id="studio" aria-labelledby="studio-h">
<div class="wrap split">
<div class="stack">
<h2 class="h2" id="studio-h" data-brand="studioName">Abdur Studio</h2>
<p class="muted">My own label for games, mobile apps, AR/VR and interactive experiences. Small by design: you work directly with the developer building your product, from prototype through release.</p>
<p class="muted">I build in Unity and C#, and I work through the whole chain: gameplay and UI, builds for Android and iOS, testing on real phones and headsets, and tracking down the crashes and frame drops that only show up there.</p>
<div class="btn-row"><a class="btn btn--primary" href="/services/">See services</a><a class="btn btn--ghost" href="/contact/">Discuss your project</a></div>
</div>
<ol class="steps">
<li class="panel"><span>Step 1</span><strong>Concept &amp; prototype</strong><p class="small">A playable build early, to test the idea.</p></li>
<li class="panel"><span>Step 2</span><strong>Design &amp; build</strong><p class="small">Gameplay, UI and systems in Unity.</p></li>
<li class="panel"><span>Step 3</span><strong>Test &amp; optimize</strong><p class="small">On real phones and headsets.</p></li>
<li class="panel"><span>Step 4</span><strong>Release</strong><p class="small">Store builds, listings and support pages.</p></li>
</ol>
</div>
</section>

<section class="section section--tint" aria-labelledby="tech-h">
<div class="wrap">
<div class="section-head"><div><h2 class="h2" id="tech-h">Technologies and tools</h2><p class="lead">What the projects above are actually built with.</p></div></div>
<div class="tech">
<div><h3>Engine and code</h3><ul><li>Unity 2022.3 LTS</li><li>C# with assembly definitions</li><li>Universal Render Pipeline</li><li>EditMode and PlayMode tests</li><li>Procedural content and editor tooling</li></ul></div>
<div><h3>AR, VR and mixed reality</h3><ul><li>AR Foundation and ARCore</li><li>ARCore face tracking</li><li>OpenXR and XR Interaction Toolkit</li><li>Meta Quest 3, passthrough</li></ul></div>
<div><h3>Mobile and stores</h3><ul><li>Android (IL2CPP, ARM64) and iOS builds</li><li>Google Mobile Ads with consent</li><li>Unity In-App Purchasing</li><li>Store listings and privacy pages</li></ul></div>
<div><h3>Networking and backend</h3><ul><li>ASP.NET Core WebSocket game servers</li><li>Networked multiplayer in Unity</li><li>Java VpnService and Xray-core</li><li>Git and scripted headless builds</li></ul></div>
</div>
</div>
</section>

<section class="section section--paper" id="vimersive" aria-labelledby="vim-h">
<div class="wrap">
<div class="section-head">
<div>
<p class="eyebrow eyebrow--muted">Experience and work with</p>
<img class="vm-logo" src="/assets/img/vimersive/logo-dark.png" alt="Vimersive" width="1024" height="93">
<h2 class="h2" id="vim-h">Vimersive Studio: where virtual meets real</h2>
<p class="muted" style="margin-top:12px;max-width:42em">A separate studio focused on 3D modelling, virtual reality, 3D exhibition booths and interior visualisation. I lead Vimersive as CEO. Work shown here belongs to Vimersive Studio and its clients.</p>
</div>
<a class="btn btn--ghost" href="https://vimersive.studio">Visit vimersive.studio ↗</a>
</div>
<div class="gallery">
<figure><img src="/assets/img/vimersive/exhibition-booth.jpg" alt="Vimersive 3D exhibition booth render" width="1024" height="559" loading="lazy"><figcaption>3D Exhibition Booths</figcaption></figure>
<figure><img src="/assets/img/vimersive/interior-render.jpg" alt="Vimersive interior room render" width="1024" height="576" loading="lazy"><figcaption>Interior Render 3D</figcaption></figure>
<figure><img src="/assets/img/vimersive/lums.jpg" alt="Vimersive 3D visualisation project" width="1024" height="576" loading="lazy"><figcaption>LUMS VR · LUMS 3D</figcaption></figure>
</div>
<p class="muted" style="margin-top:24px">Vimersive enquiries: <a href="mailto:info@vimersive.studio">info@vimersive.studio</a> · <a href="https://www.instagram.com/vimersive/">Instagram</a> · <a href="https://www.tiktok.com/@vimersive.studio">TikTok</a> · <a href="https://www.youtube.com/@VimersiveStudio">YouTube</a></p>
</div>
</section>

<div class="band band--dark" style="padding-top:88px">
<section class="wrap" style="padding-bottom:96px" aria-labelledby="cta-h">
<div class="cta" style="border:1px solid var(--line-strong)">
<div class="cta__rings" aria-hidden="true"><i></i><i></i><i></i></div>
<div>
<h2 class="h2" id="cta-h">Let's work together</h2>
<p class="muted" style="margin-top:10px">Tell me what you are building. I will reply with honest questions, a rough plan and what it would take.</p>
</div>
<a class="btn btn--primary" href="/contact/">Discuss your project</a>
</div>
<a class="mega" href="/contact/" style="margin-top:56px"><span class="mega__t">Start a project</span><span class="mega__arrow" aria-hidden="true">→</span></a>
</section>
</div>
</main>
''' + footer() + '\n' + tail()
    return out

# ------------------------------------------------------------------ refresh hand-written pages
def refresh(path, current):
    full = os.path.join(ROOT, path)
    t = open(full, encoding='utf-8').read()
    t = re.sub(r'<header class="site-header">.*?</header>', lambda m: header(current), t, flags=re.S)
    t = re.sub(r'<footer class="site-footer">.*?</footer>', lambda m: footer(), t, flags=re.S)
    t = re.sub(r'<link rel="preconnect" href="https://fonts.googleapis.com">\s*<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\s*<link rel="stylesheet" href="https://fonts.googleapis.com/css2[^"]*">', lambda m: FONTS, t)
    t = t.replace('<script src="/assets/js/projects.js"></script>\n', '')
    t = re.sub(r'<meta name="theme-color" content="#[0-9A-Fa-f]{6}">', '<meta name="theme-color" content="#F5F3FA">', t)
    open(full, 'w', encoding='utf-8', newline='\n').write(t)

def sitemap():
    urls = ['/', '/work/', '/services/', '/contact/', '/work/skyfang/', '/bandpulse/', '/bandpulse/privacy-policy.html', '/bandpulse/support.html', '/vpn-super/', '/vpn-super/privacy-policy.html', '/vpn-super/support.html']
    urls += [f'/work/{c["slug"]}/' for c in CATS]
    urls += [p['url'] for p in PROJECTS if p['has_page']]
    seen = []; [seen.append(u) for u in urls if u not in seen]
    today = datetime.date.today().isoformat()
    body = ''.join(f'  <url><loc>{SITE}{u}</loc><lastmod>{today}</lastmod></url>\n' for u in seen)
    return f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{body}</urlset>\n'

def main():
    write('index.html', home_page())
    write('work/index.html', work_page())
    for c in CATS: write(f'work/{c["slug"]}/index.html', category_page(c))
    n = 0
    for p in PROJECTS:
        if p['has_page']: write(f'work/{p["id"]}/index.html', project_page(p)); n += 1
    for path, cur in (('services/index.html', 'services'), ('contact/index.html', 'contact'), ('404.html', ''), ('work/skyfang/index.html', 'work')):
        refresh(path, cur)
    write('sitemap.xml', sitemap())
    print(f'built: home, work, {len(CATS)} category pages, {n} project pages, sitemap')

if __name__ == '__main__':
    main()
