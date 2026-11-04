// The Big Picture — static site builder (no dependencies).
// Run: node build.mjs   → writes the finished site to ./dist
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";

const ROOT = dirname(new URL(import.meta.url).pathname);
const DIST = join(ROOT, "dist");
const load = (f) => JSON.parse(readFileSync(join(ROOT, "content", f), "utf8"));

const site = load("site.json");
const categories = load("categories.json");
const services = load("services.json");
const faq = load("faq.json");
const projects = load("projects.json");
const testimonials = load("testimonials.json");
const YEAR = new Date().getFullYear();

const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const catBySlug = Object.fromEntries(categories.map((c) => [c.slug, c]));
const igUrl = site.instagram ? `https://instagram.com/${site.instagram.replace(/^@/, "")}` : "";
const pages = [];

// Cache-busting: every asset URL gets ?v=<hash of the code>, so browsers always load the latest styles and scripts.
const VER = createHash("sha1").update(["styles.css", "js/camera.js", "js/gallery.js", "js/book.js", "js/site.js"].map((f) => readFileSync(join(ROOT, "src", f))).join("")).digest("hex").slice(0, 8);

function write(path, html) {
  html = html.replace(/(\/assets\/[\w\/.-]+\.(?:css|js))(?=["'])/g, `$1?v=${VER}`);
  const file = join(DIST, path, path.endsWith(".html") || path.endsWith(".xml") || path.endsWith(".txt") ? "" : "index.html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

// ---------- brand ----------
// "Big" in The Big Picture is always crimson. Applied to visible text only (never inside tags or scripts).
const BRAND_HTML = 'The <span class="big">Big</span> Picture';
const brandify = (html) => html.replace(/>([^<]+)</g, (m, t) => ">" + t.replace(/The Big Picture/g, BRAND_HTML) + "<");

// ---------- layout ----------
const NAV = [
  ["/work/", "Work"],
  ["/services/", "Services"],
  ["/about/", "About"],
  ["/faq/", "FAQ"],
];

const viewerMarkup = `
<div class="viewer" id="viewer" role="dialog" aria-label="Full view">
  <button class="btn close-btn" id="vClose" type="button">Close</button>
  <button class="step prev" id="vPrev" type="button" aria-label="Previous">‹</button>
  <div id="vStage"></div>
  <button class="step next" id="vNext" type="button" aria-label="Next">›</button>
</div>`;

function header(path) {
  const nav = NAV.map(([href, label]) => `<a href="${href}"${path.startsWith(href) ? ' aria-current="page"' : ""}>${label}</a>`).join("");
  return `<header class="site-header">
  <div class="bar">
    <a class="brand" href="/" aria-label="The Big Picture film/photography, home">
      <img class="brand-mark" src="/brand/mark-light.png" alt="" width="194" height="320">
      <img class="brand-word" src="/brand/wordmark-light.png" alt="The Big Picture film/photography" width="516" height="160">
    </a>
    <button class="menu-toggle" aria-expanded="false" aria-controls="site-nav">Menu</button>
    <nav class="nav" id="site-nav" aria-label="Main">${nav}<a class="book" href="/book/">Book a shoot</a></nav>
  </div>
</header>`;
}

function footer() {
  const contact = [
    site.email && `<li><a href="mailto:${esc(site.email)}">${esc(site.email)}</a></li>`,
    site.phone && `<li><a href="tel:${esc(site.phone.replace(/[^\d+]/g, ""))}">${esc(site.phone)}</a></li>`,
    igUrl && `<li><a href="${igUrl}" rel="noopener">Instagram @${esc(site.instagram.replace(/^@/, ""))}</a></li>`,
  ].filter(Boolean).join("");
  return `<footer class="site-footer">
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <div class="brand brand-foot"><img class="brand-mark" src="/brand/mark-light.png" alt="" width="194" height="320" loading="lazy"><img class="brand-word" src="/brand/wordmark-light.png" alt="The Big Picture film/photography" width="516" height="160" loading="lazy"></div>
        <p style="margin-top:16px;max-width:420px">${esc(site.travelNote)}</p>
      </div>
      <div><h4>Explore</h4><ul>${NAV.map(([h, l]) => `<li><a href="${h}">${l}</a></li>`).join("")}<li><a href="/book/">Book a shoot</a></li></ul></div>
      <div><h4>Contact</h4><ul>${contact || `<li><a href="/book/">Send an inquiry</a></li>`}<li>${esc(site.city)}</li></ul></div>
    </div>
    <div class="foot-bottom">
      <span>© ${YEAR} ${esc(site.legalName)} · ${esc(site.owner)}, ${esc(site.alias)}</span>
      <span><a href="/privacy/">Privacy</a> · <a href="/terms/">Terms &amp; booking policy</a></span>
    </div>
  </div>
</footer>`;
}

function layout({ path, title, description, body, jsonLd = "", scripts = "", home = false, data = "", ogImage = "" }) {
  pages.push(path);
  const url = site.domain + path;
  const fullTitle = path === "/" ? title : `${title} | ${site.name}`;
  const page = home
    ? `<div class="home-app">${header(path)}${body}</div>`
    : `${header(path)}<main id="main">${body}</main>${footer()}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${site.domain}${ogImage || "/brand/og-image.jpg"}">
<meta name="theme-color" content="#070d13">
<link rel="icon" href="/favicon-64.png" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,500;0,6..96,700;1,6..96,500&family=Barlow+Condensed:wght@400;500;600&display=swap">
<link rel="stylesheet" href="/assets/styles.css">
${jsonLd}
</head>
<body${home ? ' class="home"' : ""}>
<div class="studio" aria-hidden="true"></div>
<a class="skip-link" href="#main">Skip to content</a>
${brandify(page)}
${data}
<script src="/assets/js/site.js" defer></script>
${scripts}
</body>
</html>`;
}

const ctaBand = (title = "Ready when you are.", text = "Tell me about your project. I reply " + site.responseTime + ".") => `
<section class="cta-band rule">
  <div class="wrap">
    <p class="eyebrow">Now booking</p>
    <h2>${esc(title)}</h2>
    <p class="lead">${esc(text)}</p>
    <div class="btn-row"><a class="btn btn-primary" href="/book/">Book a shoot</a><a class="btn" href="/work/">See the work</a></div>
  </div>
</section>`;

const coverOf = (c) => {
  const it = c.items && c.items[0];
  return it ? (it.video ? it.poster : it.src) : "";
};

function categoryTile(c) {
  const cover = coverOf(c);
  const n = c.items.length;
  return `<a class="tile" href="/work/${c.slug}/">
    ${cover ? `<img src="${esc(cover)}" alt="" loading="lazy" style="object-position:${esc(c.items[0].pos || "50% 50%")}">` : ""}
    <span class="t-arrow">${n ? `${n} ${n === 1 ? "PIECE" : "PIECES"}` : "COMING SOON"}</span>
    <div class="t-body"><h3>${esc(c.name)}</h3><div class="t-meta">${esc(c.startingAt)}</div></div>
  </a>`;
}

function projectTile(p) {
  const cat = catBySlug[p.category] || {};
  return `<a class="tile" href="/projects/${esc(p.slug)}/">
    ${p.cover ? `<img src="${esc(p.cover)}" alt="" loading="lazy">` : ""}
    <span class="t-arrow">VIEW →</span>
    <div class="t-body"><h3>${esc(p.title)}</h3><div class="t-meta">${esc(p.client || cat.name || "")}</div></div>
  </a>`;
}

function quotes(list) {
  if (!list.length) return "";
  return `<section class="rule"><div class="wrap">
    <p class="eyebrow">Kind words</p><h2>What clients say</h2>
    <div class="quotes">${list.map((t) => `<figure class="quote"><blockquote>“${esc(t.quote)}”</blockquote><figcaption><b>${esc(t.name)}</b>${t.business ? ` · ${esc(t.business)}` : ""}</figcaption></figure>`).join("")}</div>
  </div></section>`;
}

const emptyWork = (catName) => `<div class="empty-work"><strong>New ${esc(catName.toLowerCase())} work is being added.</strong> ${igUrl ? `See recent work on <a href="${igUrl}" rel="noopener">Instagram</a>, or ask` : "Ask"} for samples when you <a href="/book/">send an inquiry</a>.</div>`;

const jsonScript = (id, obj) => `<script type="application/json" id="${id}">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`;

// ---------- camera ----------
// An original mirrorless-camera illustration modeled on Austin's camera (no real brand on it).
// 800 × 520 drawing area. Lens glass: centre (480, 322), radius 112. Shutter: top of the grip at (190, 124).
// Top LCD: on the left shoulder between the shutter and the viewfinder hump.
function cameraSVG() {
  const knurl = Array.from({ length: 14 }, (_, i) => `M${602 + i * 5}.5 178V190`).join("");
  return `<svg class="body" viewBox="0 0 800 520" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="skin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4f55"/><stop offset=".12" stop-color="#2b2e32"/><stop offset=".55" stop-color="#1a1c1f"/><stop offset="1" stop-color="#0a0b0c"/></linearGradient>
    <linearGradient id="gripBulge" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".38"/><stop offset=".25" stop-color="#000" stop-opacity="0"/><stop offset=".55" stop-color="#d9e4ee" stop-opacity=".1"/><stop offset=".85" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient>
    <linearGradient id="rimLight" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".3" stop-color="#dfe9f3" stop-opacity=".55"/><stop offset=".7" stop-color="#dfe9f3" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".05"/><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".42"/></linearGradient>
    <linearGradient id="humpSheen" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".45" stop-color="#cfe0ef" stop-opacity=".09"/><stop offset=".55" stop-color="#cfe0ef" stop-opacity=".09"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <linearGradient id="cylDark" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#08090a"/><stop offset=".3" stop-color="#3b4148"/><stop offset=".55" stop-color="#1c2024"/><stop offset="1" stop-color="#060708"/></linearGradient>
    <linearGradient id="topPlate" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3f45"/><stop offset="1" stop-color="#1a1d20"/></linearGradient>
    <linearGradient id="lcdG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b7c1a8"/><stop offset="1" stop-color="#97a28a"/></linearGradient>
    <linearGradient id="chromeLow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5d666e"/><stop offset=".18" stop-color="#c3cad0"/><stop offset=".45" stop-color="#eef1f3"/><stop offset=".7" stop-color="#9aa3ab"/><stop offset="1" stop-color="#3e454c"/></linearGradient>
    <radialGradient id="btnBlack" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#6b737b"/><stop offset=".5" stop-color="#2a2f34"/><stop offset="1" stop-color="#0b0c0e"/></radialGradient>
    <radialGradient id="hole" cx=".5" cy=".55" r=".55"><stop offset="0" stop-color="#020203"/><stop offset=".75" stop-color="#0b0c0d"/><stop offset="1" stop-color="#2a2d31"/></radialGradient>
    <radialGradient id="barrel" cx=".5" cy=".5" r=".5"><stop offset=".7" stop-color="#0c0d0f"/><stop offset=".93" stop-color="#202428"/><stop offset="1" stop-color="#08090a"/></radialGradient>
    <radialGradient id="bezel" cx=".5" cy=".5" r=".5"><stop offset=".8" stop-color="#090b0d"/><stop offset=".95" stop-color="#15181b"/><stop offset="1" stop-color="#262b30"/></radialGradient>
    <pattern id="ribs" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)"><rect width="9" height="9" fill="none"/><rect x="0" y="0" width="9" height="3.6" fill="#000" opacity=".7"/><rect x="0" y="3.6" width="9" height="1.2" fill="#c9d4de" opacity=".12"/></pattern>
    <filter id="silicone" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="2" seed="11" result="t"/><feDiffuseLighting in="t" surfaceScale=".9" lighting-color="#ffffff" result="lit"><feDistantLight azimuth="250" elevation="62"/></feDiffuseLighting><feComposite in="lit" in2="SourceAlpha" operator="in" result="lc"/><feBlend in="lc" in2="SourceGraphic" mode="multiply"/></filter>
    <filter id="soft" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>
    <filter id="emboss"><feOffset dy="-.8"/><feGaussianBlur stdDeviation=".3" result="o"/><feFlood flood-color="#c9d4de" flood-opacity=".22"/><feComposite in2="o" operator="in" result="h"/><feMerge><feMergeNode in="h"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <clipPath id="bodyClip"><path d="M 140 146 Q 200 132 262 146 Q 286 152 290 190 H 392 Q 404 120 420 86 Q 427 74 444 74 H 516 Q 533 74 540 86 Q 556 120 568 190 H 670 Q 700 190 702 222 L 704 430 Q 704 466 668 466 H 150 Q 106 466 102 426 L 98 208 Q 98 152 140 146 Z"/></clipPath>
    <clipPath id="gripClip"><path d="M 98 280 H 272 Q 286 380 268 466 H 98 Z"/></clipPath>
    <path id="engrave" d="M 480 322 m -128 0 a 128 128 0 1 1 256 0 a 128 128 0 1 1 -256 0"/>
  </defs>

  <ellipse cx="402" cy="494" rx="330" ry="16" fill="#000" opacity=".75" filter="url(#soft)"/>

  <!-- shutter button on top of the grip -->
  <rect x="166" y="130" width="48" height="16" rx="5" fill="#0c0d0f"/>
  <ellipse cx="190" cy="131" rx="24" ry="6" fill="#1d2023"/>
  <ellipse cx="190" cy="130.5" rx="20" ry="5" fill="none" stroke="#e9a24c" stroke-width="2.6"/>
  <g id="btnGroup">
    <rect x="176" y="108" width="28" height="22" rx="5" fill="url(#cylDark)"/>
    <ellipse cx="190" cy="108" rx="14" ry="4.6" fill="url(#btnBlack)" stroke="#9aa3ab" stroke-width="1.1"/>
    <ellipse cx="186" cy="106.8" rx="6" ry="1.4" fill="#fff" opacity=".18"/>
  </g>

  <!-- raised top deck with the LCD, between the shutter and the viewfinder hump -->
  <path d="M 284 196 L 286 160 Q 287 154 294 154 H 402 L 392 196 Z" fill="url(#skin)" filter="url(#silicone)"/>
  <path d="M 288 156 Q 290 154.5 295 154.5 H 401" fill="none" stroke="#dfe9f3" stroke-width="1.4" opacity=".4"/>
  <path d="M 299 182 L 302 160 H 354 L 355 182 Z" fill="#050607"/>
  <path d="M 301.5 180 L 304 162 H 352.5 L 353 180 Z" fill="url(#lcdG)"/>
  <path d="M 304 162 H 352.5 L 352.7 164.5 H 303.6 Z" fill="#fff" opacity=".22"/>

  <!-- dial edge on the right shoulder -->
  <rect x="598" y="176" width="70" height="16" rx="5" fill="url(#cylDark)"/>
  <g stroke="#5a626a" stroke-width="1.2" opacity=".7"><path d="${knurl}"/></g>

  <!-- body -->
  <path d="M 140 146 Q 200 132 262 146 Q 286 152 290 190 H 392 Q 404 120 420 86 Q 427 74 444 74 H 516 Q 533 74 540 86 Q 556 120 568 190 H 670 Q 700 190 702 222 L 704 430 Q 704 466 668 466 H 150 Q 106 466 102 426 L 98 208 Q 98 152 140 146 Z" fill="url(#skin)" filter="url(#silicone)"/>
  <g clip-path="url(#bodyClip)">
    <rect x="98" y="140" width="200" height="330" fill="url(#gripBulge)"/>
    <path d="M 292 196 Q 304 330 288 466" fill="none" stroke="#000" stroke-width="5" opacity=".6"/>
    <path d="M 286 196 Q 297 330 282 466" fill="none" stroke="#c9d4de" stroke-width="1.4" opacity=".18"/>
    <g clip-path="url(#gripClip)"><rect x="90" y="270" width="200" height="200" fill="url(#ribs)"/></g>
    <path d="M 98 280 H 272 Q 286 380 268 466" fill="none" stroke="#000" stroke-width="1.6" opacity=".6"/>
    <rect x="400" y="74" width="160" height="120" fill="url(#humpSheen)"/>
    <rect x="0" y="0" width="800" height="520" fill="url(#shade)"/>
  </g>
  <path d="M 98 208 Q 98 152 140 146 Q 200 132 262 146 Q 286 152 290 190 H 392 Q 404 120 420 86 Q 427 74 444 74 H 516 Q 533 74 540 86 Q 556 120 568 190 H 670 Q 700 190 702 222" fill="none" stroke="url(#rimLight)" stroke-width="2.4"/>
  <path d="M 140 146 Q 200 132 262 146 Q 286 152 290 190 H 392 Q 404 120 420 86 Q 427 74 444 74 H 516 Q 533 74 540 86 Q 556 120 568 190 H 670 Q 700 190 702 222 L 704 430 Q 704 466 668 466 H 150 Q 106 466 102 426 L 98 208 Q 98 152 140 146 Z" fill="none" stroke="#020203" stroke-width="1.6"/>

  <!-- hot-shoe cover and name plate -->
  <path d="M 446 74 L 450 60 Q 451 56 456 56 H 504 Q 509 56 510 60 L 514 74 Z" fill="#202327" filter="url(#silicone)"/>
  <path d="M 452 59 H 508" stroke="#c9d4de" stroke-width="1" opacity=".35"/>
  <rect x="418" y="96" width="124" height="27" rx="3" fill="#060607" stroke="#3a3f45" stroke-width="1"/>
  <image href="/brand/wordmark-light.png" x="423" y="98.5" width="114" height="22" preserveAspectRatio="xMidYMid meet"/>

  <!-- front details -->
  <circle cx="168" cy="206" r="20" fill="url(#hole)"/>
  <circle cx="168" cy="206" r="20" fill="none" stroke="#c9d4de" stroke-width="1" opacity=".18"/>
  <ellipse cx="162" cy="199" rx="6" ry="3.5" fill="#fff" opacity=".1"/>
  <circle cx="318" cy="222" r="9" fill="url(#hole)"/>
  <circle cx="348" cy="218" r="6" fill="url(#hole)"/>
  <path d="M 90 196 l 10 -6 l 4 12 l -10 6 z" fill="url(#cylDark)"/>
  <path d="M 712 214 l -10 -6 l -4 12 l 10 6 z" fill="url(#cylDark)"/>
  <text x="688" y="232" text-anchor="end" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-size="17" font-weight="600" fill="#26292d" letter-spacing="1" filter="url(#emboss)">TBP</text>
  <text x="688" y="252" text-anchor="end" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-size="17" font-weight="600" fill="#26292d" letter-spacing="1" filter="url(#emboss)">R</text>

  <!-- lens -->
  <circle cx="480" cy="328" r="192" fill="#000" opacity=".6" filter="url(#soft)"/>
  <circle cx="480" cy="322" r="190" fill="url(#chromeLow)" opacity=".85"/>
  <circle cx="480" cy="322" r="186" fill="#070809"/>
  <circle cx="480" cy="322" r="183" fill="url(#barrel)"/>
  <circle cx="480" cy="322" r="169" fill="none" stroke="#2b3036" stroke-width="20" stroke-dasharray="1.6 2.2"/>
  <circle cx="480" cy="322" r="169" fill="none" stroke="#000" stroke-width="20" stroke-dasharray="1.6 2.2" stroke-dashoffset="1.6" opacity=".5"/>
  <circle cx="480" cy="322" r="179.5" fill="none" stroke="#0a0b0c" stroke-width="2"/>
  <path d="M 330 230 A 176 176 0 0 1 550 160" fill="none" stroke="#e8eef4" stroke-width="2" opacity=".28"/>
  <circle cx="480" cy="322" r="156" fill="none" stroke="#9aa3ab" stroke-width="1.2" opacity=".8"/>
  <circle cx="480" cy="322" r="150" fill="none" stroke="#25292e" stroke-width="9" stroke-dasharray="3 3"/>
  <circle cx="480" cy="322" r="144" fill="none" stroke="#0a0b0c" stroke-width="1.4"/>
  <circle cx="480" cy="322" r="142.5" fill="url(#bezel)"/>
  <text font-family="Barlow Condensed, Arial Narrow, sans-serif" font-size="11" fill="#dfe4e8" letter-spacing="2.3"><textPath href="#engrave" startOffset="1%">THE <tspan fill="#d0142f">BIG</tspan> PICTURE LENS · 24–105mm 1:4 · ∅77 · STABILIZED · ATLANTA, GA · FILM / PHOTOGRAPHY ·</textPath></text>
  <circle cx="480" cy="322" r="119" fill="url(#chromeLow)"/>
  <circle cx="480" cy="322" r="116.5" fill="#030405"/>
  <circle cx="480" cy="322" r="113.5" fill="none" stroke="#1b1f23" stroke-width="2"/>
</svg>`;
}

// ---------- pages ----------
function home() {
  const live = categories.filter((c) => c.items.length);
  const camData = live.map(({ slug, name, dial, what, startingAt, items }) => ({ slug, name, dial, what, startingAt, items }));
  const first = live[0];
  const pad = (n) => String(n).padStart(2, "0");
  const jsonLd = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: site.name,
    description: site.positioning,
    url: site.domain,
    image: site.domain + "/brand/og-image.jpg",
    logo: site.domain + "/icon-512.png",
    founder: { "@type": "Person", name: site.owner, alternateName: site.alias },
    address: { "@type": "PostalAddress", addressLocality: "Atlanta", addressRegion: "GA", addressCountry: "US" },
    areaServed: "Atlanta, GA",
    ...(site.email ? { email: site.email } : {}),
    ...(site.phone ? { telephone: site.phone } : {}),
    ...(igUrl ? { sameAs: [igUrl] } : {}),
  })}</script>`;

  const body = `
<main id="main" class="stage">
  <h1 class="visually-hidden">The Big Picture: Atlanta film and photography by Austin J. Best</h1>
  <div class="camera" id="camera">
    ${cameraSVG()}
    <button class="glass" id="glass" type="button" aria-label="Open the ${esc(first.name)} gallery">
      <div class="coat"></div>
      <div class="arc"></div>
      <svg class="iris" id="iris" viewBox="-1 -1 2 2" aria-hidden="true">
        <defs>
          <linearGradient id="bladeG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1a2028"/><stop offset=".55" stop-color="#0b0f13"/><stop offset="1" stop-color="#050709"/></linearGradient>
        </defs>
        <g id="blades"></g>
      </svg>
    </button>
    <div class="lcd" id="lcd" aria-hidden="true"><span id="lcdMode">${esc(first.dial)}</span><span id="lcdCount">${pad(1)}</span></div>
    <span class="hint-ring" aria-hidden="true"></span>
    <button class="shutter" id="shutter" type="button" aria-label="Shutter: show the next category"></button>
    <span class="callout" aria-hidden="true">Shutter = next</span>
  </div>
</main>
<div class="home-foot">
  <div class="now" aria-live="polite">
    <span class="count" id="count">${pad(1)} / ${pad(live.length)}</span>
    <h2 class="name" id="catName">${esc(first.name)}</h2>
    <span class="what" id="catWhat">${esc(first.what)} · ${esc(first.startingAt)}</span>
  </div>
  <div class="dial" id="dial" role="group" aria-label="Categories">
    ${live.map((c, i) => `<button type="button" data-i="${i}" aria-current="${i === 0}">${esc(c.short)}</button>`).join("")}
  </div>
  <div class="how">Press the <strong>shutter button</strong> to change category · Tap the <strong>lens</strong> to step inside</div>
</div>
<div class="flash" id="flash"></div>
<section class="lensgal" id="lensgal" aria-label="Gallery" aria-hidden="true">
  <div class="gal-head">
    <div><div class="gal-meta" id="gMeta"></div><h2 id="gTitle"></h2></div>
    <div class="gal-actions">
      <a class="btn" id="gPage" href="/work/">Full page</a>
      <a class="btn btn-outline" id="gBook" href="/book/">Book this</a>
      <button class="btn" id="gClose" type="button">Back to the camera</button>
    </div>
  </div>
  <div class="media-grid" id="grid"></div>
</section>
${viewerMarkup}`;
  write("/", layout({
    path: "/",
    title: "The Big Picture | Atlanta Film & Photography",
    description: "Atlanta film and photography studio led by Austin J. Best (Mr. WhoShotCha). Music videos, commercials, weddings, portraits, headshots and events.",
    body, jsonLd, home: true,
    data: jsonScript("camera-data", camData),
    scripts: `<script src="/assets/js/gallery.js" defer></script><script src="/assets/js/camera.js" defer></script>`,
  }));
}

function workIndex() {
  const body = `
<section class="page-hero"><div class="wrap">
  <p class="eyebrow">Portfolio</p><h1>The <em>work</em></h1>
  <p class="lead">Film and photography by The Big Picture. Pick a category.</p>
</div></section>
<section style="padding-top:0"><div class="wrap">
  <nav class="filters" aria-label="Categories">
    <a class="chip" href="/work/" aria-current="page">All</a>
    ${categories.map((c) => `<a class="chip" href="/work/${c.slug}/">${esc(c.short)}</a>`).join("")}
  </nav>
  <div class="grid-3">${categories.map(categoryTile).join("")}</div>
  ${projects.length ? `<h2 style="margin-top:64px">Projects</h2><div class="grid-3">${projects.map(projectTile).join("")}</div>` : ""}
</div></section>
${ctaBand()}`;
  write("/work/", layout({ path: "/work/", title: "Work", description: "Portfolio of The Big Picture: portraits, weddings, travel, events, films, music videos and commercials in Atlanta.", body }));
}

function mediaTiles(items, label) {
  return items.map((it, i) => `<button class="tile-m${it.tall ? "" : " wide"}" type="button" data-i="${i}" aria-label="View ${esc(label)} ${i + 1}">
    ${it.video
      ? `<video src="${esc(it.src)}" poster="${esc(it.poster || "")}" muted loop playsinline autoplay preload="metadata" style="object-position:${esc(it.pos || "50% 50%")}"></video><span class="tag">Play with sound</span>`
      : `<img src="${esc(it.src)}" alt="${esc(it.alt || "")}" loading="lazy" style="object-position:${esc(it.pos || "50% 50%")}">`}
  </button>`).join("");
}

function categoryPage(c) {
  const list = projects.filter((p) => p.category === c.slug);
  const qs = testimonials.filter((t) => t.category === c.slug).slice(0, 1);
  const svc = services.find((s) => s.category === c.slug);
  const body = `
<section class="page-hero"><div class="wrap">
  <p class="eyebrow">${esc(c.name)}</p>
  <h1>${esc(c.headline)}</h1>
  <p class="lead">${esc(c.intro)}</p>
  <span class="price-tag">${esc(c.startingAt)}</span>
  <div class="btn-row"><a class="btn btn-primary" href="/book/?service=${c.slug}">Book ${esc(c.short.toLowerCase())}</a>${svc ? `<a class="btn" href="/services/#${svc.id}">See packages</a>` : ""}</div>
</div></section>
<section style="padding-top:0"><div class="wrap">
  <nav class="filters" aria-label="Categories">
    <a class="chip" href="/work/">All</a>
    ${categories.map((x) => `<a class="chip" href="/work/${x.slug}/"${x.slug === c.slug ? ' aria-current="page"' : ""}>${esc(x.short)}</a>`).join("")}
  </nav>
  ${c.items.length ? `<div class="media-grid${c.items.length === 1 ? " solo" : ""}" data-gallery="cat-items">${mediaTiles(c.items, c.name)}</div>` : emptyWork(c.name)}
  ${list.length ? `<div class="grid-3" style="margin-top:24px">${list.map(projectTile).join("")}</div>` : ""}
</div></section>
<section class="rule"><div class="wrap">
  <p class="eyebrow">What you get</p><h2>Every booking <em>includes</em></h2>
  <ul class="includes" style="margin-top:26px">${c.includes.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
</div></section>
${quotes(qs)}
<section class="rule"><div class="wrap faq">
  <p class="eyebrow">Questions</p><h2>Good to know</h2>
  ${faq.slice(0, 4).map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}
</div></section>
${ctaBand(`Let's make it happen.`)}
${c.items.length ? viewerMarkup : ""}`;
  write(`/work/${c.slug}/`, layout({
    path: `/work/${c.slug}/`, title: c.headline,
    description: `${c.intro} ${c.startingAt}. Book The Big Picture in Atlanta.`,
    body, ogImage: coverOf(c),
    data: c.items.length ? jsonScript("cat-items", c.items) : "",
    scripts: c.items.length ? `<script src="/assets/js/gallery.js" defer></script>` : "",
  }));
}

function projectPage(p) {
  const c = catBySlug[p.category] || { name: "", slug: "" };
  const body = `
<section class="page-hero"><div class="wrap">
  <p class="eyebrow"><a href="/work/${c.slug}/" style="text-decoration:none">${esc(c.name)}</a></p>
  <h1>${esc(p.title)}</h1>
  ${p.brief ? `<p class="lead">${esc(p.brief)}</p>` : ""}
</div></section>
<section style="padding-top:0"><div class="wrap">
  ${p.videoUrl ? `<div class="video-frame"><iframe src="${esc(p.videoUrl)}" title="${esc(p.title)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>` : p.cover ? `<img src="${esc(p.cover)}" alt="${esc(p.title)}" style="border-radius:10px">` : ""}
  <dl class="meta-list">
    ${p.client ? `<div><dt>Client</dt><dd>${esc(p.client)}</dd></div>` : ""}
    ${p.date ? `<div><dt>Date</dt><dd>${esc(p.date)}</dd></div>` : ""}
    ${p.role ? `<div><dt>Role</dt><dd>${esc(p.role)}</dd></div>` : ""}
    ${p.result ? `<div><dt>Result</dt><dd>${esc(p.result)}</dd></div>` : ""}
  </dl>
  ${p.credits && p.credits.length ? `<p class="muted"><b>Credits:</b> ${p.credits.map(esc).join(" · ")}</p>` : ""}
</div></section>
${ctaBand("Want something like this?")}`;
  write(`/projects/${p.slug}/`, layout({ path: `/projects/${p.slug}/`, title: p.title, description: p.brief || `${p.title} by The Big Picture, Atlanta.`, body }));
}

function servicesPage() {
  const body = `
<section class="page-hero"><div class="wrap">
  <p class="eyebrow">Services &amp; investment</p><h1>Packages built to fit</h1>
  <p class="lead">Every service has clear options. Your exact quote comes after a quick call, so it fits what you actually need.</p>
</div></section>
<section style="padding-top:0"><div class="wrap">
  ${services.map((s) => `<article class="service" id="${s.id}">
    <div>
      <h2>${esc(s.name)}</h2>
      <span class="price-tag">${esc(s.startingAt)}</span>
      <p class="muted">${esc(s.blurb)}</p>
      <div class="btn-row"><a class="btn btn-primary" href="/book/?service=${s.category}">Book</a>${catBySlug[s.category] ? `<a class="btn" href="/work/${s.category}/">See the work</a>` : ""}</div>
    </div>
    ${s.tiers.length ? `<div class="tiers">${s.tiers.map((t, i) => `<div class="tier${s.tiers.length === 3 && i === 1 ? " featured" : ""}"><h3>${esc(t.name)}</h3><p>${esc(t.includes)}</p></div>`).join("")}</div>` : `<div class="tier"><h3>Custom quote</h3><p>Tell me about the project and I'll put together a proposal that fits it.</p></div>`}
  </article>`).join("")}
</div></section>
<section class="rule"><div class="wrap">
  <p class="eyebrow">The fine print</p><h2>Good to know</h2>
  <div class="notes" style="margin-top:28px">
    <div class="note"><h3>Add-ons</h3><p>Rush delivery, extra revisions, extra locations, usage rights and raw footage are priced separately. Weddings can add extra hours and albums.</p></div>
    <div class="note"><h3>Travel</h3><p>Outside Atlanta, travel, lodging and meals are billed on top of your package, plus a travel day rate for time in transit.</p></div>
    <div class="note"><h3>Payment</h3><p>50% deposit to book your date. The balance is due before final delivery.</p></div>
  </div>
</div></section>
${ctaBand()}`;
  write("/services/", layout({ path: "/services/", title: "Services & Pricing", description: "Packages and starting prices for music videos, commercials, monthly content retainers, weddings, portraits, headshots and events in Atlanta.", body }));
}

function aboutPage() {
  const body = `
<section class="page-hero"><div class="wrap about-grid">
  <div class="portrait-ph"><img src="/media/austin-best.jpg" alt="Austin J. Best, Mr. WhoShotCha, reaching toward the camera" width="1120" height="1400"></div>
  <div>
    <p class="eyebrow">About</p>
    <h1>Austin J. Best, aka Mr. WhoShotCha</h1>
    <p class="lead">I've spent 14 years behind the lens in Atlanta, filming music videos, commercials and weddings, and photographing the people and moments that matter.</p>
    <p class="muted">The Big Picture is my studio. I shoot most projects myself, so you work directly with the person behind the camera. When a project needs more, like a concept music video, a commercial or a wedding with film and photo, I bring in a trusted crew.</p>
    <p class="muted">I shoot film on a Canon C70 cinema camera and photos on a Canon EOS R, and every project is edited and color graded by hand.</p>
    <ul class="facts">
      <li><b>14</b><span>years behind the lens</span></li>
      <li><b>ATL</b><span>based, available to travel</span></li>
    </ul>
    <div class="btn-row"><a class="btn btn-primary" href="/book/">Work with me</a><a class="btn" href="/work/">See the work</a></div>
  </div>
</div></section>
${ctaBand()}`;
  write("/about/", layout({ path: "/about/", title: "About Austin J. Best (Mr. WhoShotCha)", description: "Meet Austin J. Best, aka Mr. WhoShotCha: 14 years filming and photographing in Atlanta, and the founder of The Big Picture.", body, ogImage: "/media/austin-best.jpg" }));
}

function faqPage() {
  const body = `
<section class="page-hero"><div class="wrap">
  <p class="eyebrow">FAQ</p><h1>Questions, answered</h1>
  <p class="lead">Don't see yours? Ask it in your inquiry.</p>
</div></section>
<section style="padding-top:0"><div class="wrap faq">
  ${faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}
</div></section>
${ctaBand()}`;
  const jsonLd = `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) })}</script>`;
  write("/faq/", layout({ path: "/faq/", title: "FAQ", description: "Deposits, travel, turnaround, raw footage, usage rights and how to prepare for your shoot with The Big Picture.", body, jsonLd }));
}

function bookPage() {
  const opts = categories.map((c) => `<option value="${c.slug}">${esc(c.name)}</option>`).join("") + `<option value="retainer">Monthly content retainer</option><option value="other">Something else</option>`;
  const body = `
<section class="page-hero"><div class="wrap">
  <p class="eyebrow">Book</p><h1>Book a shoot</h1>
  <p class="lead">Tell me what you're planning. I reply ${esc(site.responseTime)}.</p>
</div></section>
<section style="padding-top:0"><div class="wrap book-grid">
  <div>
    <form class="form" id="inquiry" novalidate
      data-endpoint="${esc(site.formEndpoint)}" data-email="${esc(site.email)}"
      data-call="${esc(site.callBookingUrl)}" data-min="${site.callMinimum}">
      <div class="row-2">
        <div class="field"><label for="f-name">Name</label><input id="f-name" name="name" autocomplete="name" required></div>
        <div class="field"><label for="f-email">Email</label><input id="f-email" name="email" type="email" autocomplete="email" required></div>
      </div>
      <div class="row-2">
        <div class="field"><label for="f-phone">Phone</label><input id="f-phone" name="phone" type="tel" autocomplete="tel" required></div>
        <div class="field"><label for="f-service">What are you booking?</label><select id="f-service" name="service" required><option value="">Choose one</option>${opts}</select></div>
      </div>
      <div class="field"><label for="f-brand">Business, brand or artist name <small>(plus Instagram or website)</small></label><input id="f-brand" name="brand"></div>
      <div class="row-2">
        <div class="field"><label for="f-date">Date <small>(or "flexible")</small></label><input id="f-date" name="date" placeholder="e.g. June 14, 2027 or flexible"></div>
        <div class="field"><label for="f-location">Location</label><select id="f-location" name="location"><option>Atlanta area</option><option>Outside Atlanta</option></select></div>
      </div>
      <div class="field"><label for="f-project">Tell me about the project</label><textarea id="f-project" name="project" required></textarea></div>
      <div class="row-2">
        <div class="field"><label for="f-budget">Budget</label><select id="f-budget" name="budget" required>
          <option value="">Choose a range</option>
          <option value="0">Under $800</option>
          <option value="800">$800 – $1,500</option>
          <option value="1500">$1,500 – $3,000</option>
          <option value="3000">$3,000 – $5,000</option>
          <option value="5000">$5,000 – $10,000</option>
          <option value="10000">$10,000+</option>
        </select></div>
        <div class="field"><label for="f-source">How did you hear about me?</label><select id="f-source" name="source"><option value="">Choose one</option><option>Instagram</option><option>Referral / word of mouth</option><option>Google</option><option>Saw my work</option><option>Other</option></select></div>
      </div>
      <input type="text" name="_gotcha" tabindex="-1" autocomplete="off" style="display:none">
      <p class="form-error muted" id="form-error" role="alert"></p>
      <button class="btn btn-primary" type="submit">Send inquiry</button>
    </form>
    <div class="form-status" id="form-status" hidden tabindex="-1"></div>
  </div>
  <aside class="side-card">
    <h3>What happens next</h3>
    <ol>
      <li><b>You'll hear back ${esc(site.responseTime)}</b> with next steps.</li>
      <li><b>A 15-minute call</b> to talk through your vision, timeline and budget.</li>
      <li><b>Your proposal</b> with package options, contract and invoice in one link.</li>
      <li><b>Lock your date</b> with a 50% deposit.</li>
    </ol>
    <p class="muted" style="margin:0">Photo sessions and headshots can skip the call. I'll send your proposal by email.</p>
  </aside>
</div></section>`;
  write("/book/", layout({ path: "/book/", title: "Book Your Project", description: "Book The Big Picture for music videos, commercials, weddings, portraits, headshots and events in Atlanta. Reply within 24 hours.", body, scripts: `<script src="/assets/js/book.js" defer></script>` }));
}

function legalPages() {
  const privacy = `
<section class="page-hero"><div class="wrap prose">
  <p class="eyebrow">Legal</p><h1>Privacy policy</h1>
  <p>Last updated ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}.</p>
  <h2>What I collect</h2>
  <p>When you send an inquiry, I collect what you enter in the form: your name, email, phone, project details, date, location and budget. The site may also use basic, privacy-friendly analytics to count visits.</p>
  <h2>How I use it</h2>
  <p>I use your details only to reply to your inquiry, prepare a proposal and run your booking. I don't sell your information.</p>
  <h2>Services I use</h2>
  <p>Inquiries may be processed by the booking and email tools I use to run the business. Videos may be hosted on third-party players such as Vimeo or YouTube, which have their own privacy policies.</p>
  <h2>Your choices</h2>
  <p>You can ask me to update or delete your information at any time through the <a href="/book/">contact form</a>${site.email ? ` or at <a href="mailto:${esc(site.email)}">${esc(site.email)}</a>` : ""}.</p>
</div></section>`;
  write("/privacy/", layout({ path: "/privacy/", title: "Privacy Policy", description: "How The Big Picture handles the information you share through this website.", body: privacy }));
  const terms = `
<section class="page-hero"><div class="wrap prose">
  <p class="eyebrow">Legal</p><h1>Terms &amp; booking policy</h1>
  <h2>Booking</h2>
  <p>A date is reserved only after a signed contract and a 50% deposit. The remaining balance is due before final delivery.</p>
  <h2>Pricing</h2>
  <p>Prices on this site are starting prices. Your final price is set in your proposal and contract. Add-ons such as rush delivery, extra revisions, extra locations, usage rights and raw footage are priced separately.</p>
  <h2>Travel</h2>
  <p>For shoots outside the Atlanta area, travel, lodging and meals are billed in addition to the package, plus a travel day rate.</p>
  <h2>Rescheduling and cancellation</h2>
  <p>Rescheduling and cancellation terms are set out in your contract.</p>
  <h2>Use of work</h2>
  <p>Unless your contract says otherwise, The Big Picture may show work from your project in its portfolio and on social media.</p>
  <h2>Website content</h2>
  <p>All photos and videos on this site are © The Big Picture and may not be reused without permission.</p>
</div></section>`;
  write("/terms/", layout({ path: "/terms/", title: "Terms & Booking Policy", description: "Booking, payment, travel and usage terms for The Big Picture.", body: terms }));
}

function notFound() {
  const html = layout({ path: "/404/", title: "Page not found", description: "This page could not be found.", body: `
<section class="page-hero"><div class="wrap">
  <p class="eyebrow">Error 404</p><h1>Out of frame</h1>
  <p class="lead">This page doesn't exist. Let's get you back in focus.</p>
  <div class="btn-row" style="margin-top:24px"><a class="btn btn-primary" href="/">Home</a><a class="btn" href="/work/">See the work</a></div>
</div></section>` });
  pages.pop();
  writeFileSync(join(DIST, "404.html"), html);
}

// ---------- run ----------
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
cpSync(join(ROOT, "public"), DIST, { recursive: true });
mkdirSync(join(DIST, "assets"), { recursive: true });
cpSync(join(ROOT, "src", "styles.css"), join(DIST, "assets", "styles.css"));
cpSync(join(ROOT, "src", "js"), join(DIST, "assets", "js"), { recursive: true });

home();
workIndex();
categories.forEach(categoryPage);
projects.forEach(projectPage);
servicesPage();
aboutPage();
faqPage();
bookPage();
legalPages();
notFound();

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${site.domain}${p}</loc></url>`).join("\n")}
</urlset>`;
writeFileSync(join(DIST, "sitemap.xml"), sitemap);
writeFileSync(join(DIST, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${site.domain}/sitemap.xml\n`);
console.log(`Built ${pages.length} pages into dist/`);
