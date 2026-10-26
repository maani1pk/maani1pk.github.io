/*
 * Project data — add a project by adding an object here.
 * status: 'released' | 'soon' | 'dev' | 'prototype' | 'client'
 * owner:  'personal' | 'vimersive'
 * cats:   games, kids, ar, vr, training, i3d, client, proto
 * imgFit: 'cover' (landscape art) | 'phone' (portrait capture, shown whole)
 * stock:  true when the image is an illustrative stock photo, not a capture
 */
window.PROJECTS = [
  {
    id: 'skyfang', name: 'Skyfang: Airplane Games', featured: true,
    cats: ['games'], status: 'soon', statusLabel: 'Coming soon · App Store', owner: 'personal',
    platform: 'iPhone & iPad', tech: 'Unity · C#', role: 'Solo developer',
    desc: '38 arcade air-combat missions across 8 worlds, multi-phase bosses and 6 upgradable jets.',
    img: '/assets/img/skyfang/boss.jpg', imgFit: 'cover', alt: 'Skyfang boss aircraft battle',
    link: '/skyfang/', linkLabel: 'Official game site'
  },
  {
    id: 'bandpulse', name: 'BandPulse: Piano Rhythm Game', featured: true,
    cats: ['games'], status: 'soon', statusLabel: 'Coming soon · Google Play & App Store', owner: 'personal',
    platform: 'Android & iPhone', tech: 'Unity · C# · DSP-clock rhythm engine', role: 'Solo developer',
    desc: 'One song, every instrument: piano, guitar, drums and DJ, 12 original songs and a 60-level World Tour.',
    img: '/bandpulse/assets/img/shot-piano.jpg', imgFit: 'phone', alt: 'BandPulse Piano Rush gameplay',
    link: '/bandpulse/', linkLabel: 'Official game site'
  },
  {
    id: 'punchverse', name: 'PunchVerse VR', featured: true,
    cats: ['vr'], status: 'dev', owner: 'personal',
    platform: 'Meta Quest 3', tech: 'Unity · mixed reality', role: 'Solo developer',
    desc: 'Boxing and fitness for Quest 3, including a mixed-reality mode.',
    img: '/assets/img/projects/stock-vr-fitness.jpg', imgFit: 'cover', stock: true,
    alt: 'Illustrative photo: a player in a VR headset with hands raised'
  },
  {
    id: 'tinyzoo', name: 'TinyZoo Colors',
    cats: ['kids'], status: 'dev', owner: 'personal',
    platform: 'iOS & Android', tech: 'Unity · procedural art · child-directed ads setup', role: 'Solo developer',
    desc: 'Toddler animal coloring with smoothed Catmull-Rom brush paths.',
    img: '/assets/img/projects/tinyzoo-colors.jpg', imgFit: 'phone', alt: 'TinyZoo Colors app icon designs'
  },
  {
    id: 'colorsprout', name: 'ColorSprout Kids',
    cats: ['kids'], status: 'dev', owner: 'personal',
    platform: 'Android', tech: 'Unity 2022.3', role: 'Solo developer',
    desc: 'A coloring game for kids with its own design system.',
    img: '/assets/img/projects/colorsprout-kids.jpg', imgFit: 'phone', alt: 'ColorSprout Kids coloring studio screen'
  },
  {
    id: 'tinytrace', name: 'TinyTrace Kids',
    cats: ['kids'], status: 'dev', owner: 'personal',
    platform: 'Android', tech: 'Unity · data-driven level generation', role: 'Solo developer',
    desc: 'Tracing and drawing mini-games for young kids, with 870 generated levels.',
    img: '/assets/img/projects/tinytrace-kids.jpg', imgFit: 'phone', alt: 'TinyTrace Kids letter tracing screen'
  },
  {
    id: 'pocketpet', name: 'Pocket Pet Glow',
    cats: ['games', 'kids'], status: 'dev', owner: 'personal',
    platform: 'Android', tech: 'Unity · in-app purchases', role: 'Solo developer',
    desc: 'A virtual pet game: feed, bathe and care for animals across habitats.',
    img: '/assets/img/projects/pocket-pet-glow.jpg', imgFit: 'phone', alt: 'Pocket Pet Glow pet care screen'
  },
  {
    id: 'vrart', name: 'VR Art Studio',
    cats: ['vr', 'i3d'], status: 'dev', owner: 'personal',
    platform: 'Meta Quest', tech: 'Unity · URP · OpenXR · XR Interaction Toolkit', role: 'Solo developer',
    desc: 'Painting and creating in virtual reality.',
    img: '/assets/img/projects/stock-vr-create.jpg', imgFit: 'cover', stock: true,
    alt: 'Illustrative photo: a person in a VR headset reaching out'
  },
  {
    id: 'hearthly', name: 'Hearthly',
    cats: ['ar', 'i3d'], status: 'dev', owner: 'personal',
    platform: 'Android', tech: 'Unity · AR Foundation', role: 'Solo developer',
    desc: 'Place home décor in your own room with AR.',
    img: '/assets/img/projects/hearthly.jpg', imgFit: 'phone', alt: 'Hearthly design hub screen'
  },
  {
    id: 'darkroom', name: 'DarkRoom AR',
    cats: ['ar', 'proto'], status: 'prototype', owner: 'personal',
    platform: 'Android (ARM64)', tech: 'Unity · AR Foundation · ARCore face tracking', role: 'Solo developer',
    desc: 'An AR face-filter app, tested on a Galaxy S21.',
    img: '/assets/img/projects/darkroom-ar.jpg', imgFit: 'phone', alt: 'DarkRoom AR explore screen'
  },
  {
    id: 'boat', name: 'Boat racing prototype',
    cats: ['games', 'proto'], status: 'prototype', owner: 'personal',
    platform: 'Android', tech: 'Unity · built on Unity’s Boat Attack sample', role: 'Gameplay & mobile build',
    desc: 'A racing mode built on top of Unity’s open Boat Attack sample.',
    img: '/assets/img/projects/stock-speedboat.jpg', imgFit: 'cover', stock: true,
    alt: 'Illustrative photo: a speedboat on open water'
  },
  {
    id: 'vm-booths', name: '3D Exhibition Booths',
    cats: ['client', 'i3d'], status: 'client', owner: 'vimersive',
    platform: 'Web · renders', tech: '3D modelling', role: 'CEO · studio lead',
    desc: 'Exhibition booth design and visualisation.',
    img: '/assets/img/vimersive/exhibition-booth.jpg', imgFit: 'cover', alt: 'Vimersive 3D exhibition booth render',
    link: 'https://vimersive.studio', linkLabel: 'On vimersive.studio'
  },
  {
    id: 'vm-interior', name: 'Interior Render 3D',
    cats: ['client', 'i3d'], status: 'client', owner: 'vimersive',
    platform: 'Renders', tech: '3D modelling · rendering', role: 'CEO · studio lead',
    desc: 'Interior visualisation.',
    img: '/assets/img/vimersive/interior-render.jpg', imgFit: 'cover', alt: 'Vimersive interior room render',
    link: 'https://vimersive.studio', linkLabel: 'On vimersive.studio'
  },
  {
    id: 'vm-lums', name: 'LUMS VR · LUMS 3D',
    cats: ['client', 'vr', 'i3d'], status: 'client', owner: 'vimersive',
    platform: 'VR · 3D', tech: 'Details coming soon', role: 'CEO · studio lead',
    desc: 'Virtual reality and 3D campus work from Vimersive’s portfolio.',
    img: '/assets/img/vimersive/lums.jpg', imgFit: 'cover', alt: 'Vimersive 3D visualisation project',
    link: 'https://vimersive.studio', linkLabel: 'On vimersive.studio'
  },
  {
    id: 'vm-spaces', name: 'Cabin 3D · 3D Round Art Gallery',
    cats: ['client', 'i3d'], status: 'client', owner: 'vimersive',
    platform: '3D', tech: 'Details coming soon', role: 'CEO · studio lead',
    desc: 'Further 3D spaces from Vimersive’s portfolio.',
    link: 'https://vimersive.studio', linkLabel: 'On vimersive.studio'
  }
];

window.PROJECT_FILTERS = [
  ['all', 'All'], ['games', 'Mobile Games'], ['kids', 'Kids’ Apps'], ['ar', 'AR Applications'],
  ['vr', 'VR & Meta Quest'], ['training', 'Training & Simulation'], ['i3d', 'Interactive 3D'],
  ['client', 'Client Projects'], ['proto', 'Prototypes & Experiments']
];
