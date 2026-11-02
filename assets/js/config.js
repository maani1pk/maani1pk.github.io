/*
 * Brand settings — change these to rebrand the whole site.
 * Every element with data-brand="<key>" shows the value; data-brand-href="email" etc. fill links.
 * The studio name is also written into page titles, meta tags and no-JavaScript fallbacks;
 * to rename, find/replace "Abdur Studio" across the repo too.
 */
window.SITE = {
  personName: 'Abdur Rehman Arshad',
  studioName: 'Abdur Studio',
  studioEmail: 'maani1pk@gmail.com',

  // >>> WHATSAPP NUMBER: set this one value <<<
  // Used by the Contact page button ("Send Inquiry on WhatsApp") and the floating WhatsApp button on every page.
  // International format, digits only: country code + number, with no "+", spaces, dashes or leading zeros.
  // Example format (not a real number): '15551234567'
  // While this is empty, the WhatsApp buttons stay hidden and the email button becomes the main one.
  whatsappNumber: '',

  accent: '#FF8A4C', // also --r1 / --accent in assets/css/site.css

  vimersive: {
    name: 'Vimersive Studio',
    url: 'https://vimersive.studio',
    emails: ['info@vimersive.studio', 'vimersivestudio@gmail.com'],
    instagram: 'https://www.instagram.com/vimersive/',
    tiktok: 'https://www.tiktok.com/@vimersive.studio',
    youtube: 'https://www.youtube.com/@VimersiveStudio'
  }
};
