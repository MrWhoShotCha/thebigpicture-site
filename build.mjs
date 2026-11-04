// The Big Picture — static site builder (no dependencies).
// Run: node build.mjs   → writes the finished site to ./dist
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

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

function write(path, html) {
  const file = join(DIST, path, path.endsWith(".html") || path.endsWith(".xml") || path.endsWith(".txt") ? "" : "index.html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

// ---------- layout ----------
const NAV = [
  ["/work/", "Work"],
  ["/services/", "Services"],
  ["/about/", "About"],
  ["/faq/", "FAQ"],
];

function layout({ path, title, description, body, jsonLd = "", scripts = "" }) {
  pages.push(path);
  const url = site.domain + path;
  const fullTitle = path === "/" ? title : `${title} | ${site.name}`;
  const nav = NAV.map(([href, label]) => `<a href="${href}"${path.startsWith(href) ? ' aria-current="page"' : ""}>${label}</a>`).join("");
  const contact = [
    site.email && `<li><a href="mailto:${esc(site.email)}">${esc(site.email)}</a></li>`,
    site.phone && `<li><a href="tel:${esc(site.phone.replace(/[^\d+]/g, ""))}">${esc(site.phone)}</a></li>`,
    igUrl && `<li><a href="${igUrl}" rel="noopener">Instagram @${esc(site.instagram.replace(/^@/, ""))}</a></li>`,
  ].filter(Boolean).join("");
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
<meta name="theme-color" content="#0b0b0a">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800&family=Inter:wght@400;500;600&family=Share+Tech+Mono&display=swap">
<link rel="stylesheet" href="/assets/styles.css">
${jsonLd}
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap">
    <a class="logo" href="/" aria-label="${esc(site.name)} home">
      <span class="logo-main">THE BIG PICTURE</span>
      <span class="logo-sub">FILM / PHOTOGRAPHY</span>
    </a>
    <button class="menu-toggle" aria-expanded="false" aria-controls="site-nav">Menu</button>
    <nav class="nav" id="site-nav" aria-label="Main">
      ${nav}
      <a class="btn btn-primary" href="/book/">Book your project</a>
    </nav>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <div class="logo"><span class="logo-main">THE BIG PICTURE</span><span class="logo-sub">FILM / PHOTOGRAPHY</span></div>
        <p style="margin-top:16px;max-width:420px">${esc(site.travelNote)}</p>
      </div>
      <div><h4>Explore</h4><ul>${NAV.map(([h, l]) => `<li><a href="${h}">${l}</a></li>`).join("")}<li><a href="/book/">Book</a></li></ul></div>
      <div><h4>Contact</h4><ul>${contact || `<li><a href="/book/">Send an inquiry</a></li>`}<li>${esc(site.city)}</li></ul></div>
    </div>
    <div class="foot-bottom">
      <span>© ${YEAR} ${esc(site.legalName)}. ${esc(site.owner)} · ${esc(site.alias)}</span>
      <span><a href="/privacy/">Privacy</a> · <a href="/terms/">Terms &amp; booking policy</a></span>
    </div>
  </div>
</footer>
<script src="/assets/js/site.js" defer></script>
${scripts}
</body>
</html>`;
}

const ctaBand = (title = "Ready when you are.", text = "Tell me about your project. I reply " + site.responseTime + ".") => `
<section class="cta-band rule">
  <div class="wrap">
    <p class="eyebrow" style="justify-content:center">Now booking</p>
    <h2>${esc(title)}</h2>
    <p class="lead" style="margin-inline:auto">${esc(text)}</p>
    <div class="btn-row"><a class="btn btn-primary" href="/book/">Book your project</a><a class="btn" href="/work/">See the work</a></div>
  </div>
</section>`;

function projectTile(p) {
  const cat = catBySlug[p.category] || {};
  const media = p.previewVideo
    ? `<video src="${esc(p.previewVideo)}" muted loop playsinline preload="none" ${p.cover ? `poster="${esc(p.cover)}"` : ""} data-hover-play></video>`
    : p.cover ? `<img src="${esc(p.cover)}" alt="" loading="lazy">` : "";
  return `<a class="tile" href="/projects/${esc(p.slug)}/" style="--tint:${cat.tint || "#333"}">
    ${media}
    <span class="t-arrow">VIEW →</span>
    <div class="t-body"><h3>${esc(p.title)}</h3><div class="t-meta">${esc(p.client || cat.name || "")}</div></div>
  </a>`;
}

function categoryTile(c) {
  const cover = c.lensPoster || (c.lensImages && c.lensImages[0]) || "";
  return `<a class="tile" href="/work/${c.slug}/" style="--tint:${c.tint}">
    ${cover ? `<img src="${esc(cover)}" alt="" loading="lazy">` : ""}
    <span class="t-arrow">→</span>
    <div class="t-body"><h3>${esc(c.name)}</h3><div class="t-meta">${esc(c.startingAt)}</div></div>
  </a>`;
}

function quotes(list) {
  if (!list.length) return "";
  return `<section class="rule"><div class="wrap">
    <p class="eyebrow">Kind words</p><h2>What clients say</h2>
    <div class="quotes">${list.map((t) => `<figure class="quote"><blockquote>“${esc(t.quote)}”</blockquote><figcaption><b>${esc(t.name)}</b>${t.business ? ` · ${esc(t.business)}` : ""}</figcaption></figure>`).join("")}</div>
  </div></section>`;
}

const emptyWork = (catName) => `<div class="empty-work"><strong>New ${esc(catName ? catName.toLowerCase() : "work")} is being added.</strong> ${igUrl ? `See more recent work on <a href="${igUrl}" rel="noopener">Instagram</a>, or ask` : "Ask"} for samples when you <a href="/book/">send an inquiry</a>.</div>`;

// ---------- camera ----------
function cameraSVG() {
  const ridges = Array.from({ length: 60 }, (_, i) => `<rect x="${i * 8}" y="0" width="3" height="26" fill="#2c2c2c"/>`).join("");
  return `<svg class="camera-svg" viewBox="0 0 1000 660" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="bodyG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#232322"/><stop offset=".5" stop-color="#141413"/><stop offset="1" stop-color="#0a0a0a"/></linearGradient>
    <linearGradient id="topG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#303030"/><stop offset="1" stop-color="#181818"/></linearGradient>
    <linearGradient id="gripG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0b0b0b"/><stop offset=".4" stop-color="#1a1a19"/><stop offset="1" stop-color="#0d0d0d"/></linearGradient>
    <pattern id="gripTex" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><rect width="9" height="3" fill="#000" opacity=".5"/></pattern>
    <radialGradient id="ringG" cx=".5" cy=".5" r=".5"><stop offset=".7" stop-color="#151515"/><stop offset="1" stop-color="#050505"/></radialGradient>
    <clipPath id="dialClip"><rect x="756" y="104" width="108" height="26" rx="8"/></clipPath>
    <path id="ringText" d="M 515 380 m -166 0 a 166 166 0 1 1 332 0 a 166 166 0 1 1 -332 0"/>
  </defs>
  <ellipse cx="500" cy="626" rx="420" ry="18" fill="#000" opacity=".6"/>
  <rect x="60" y="212" width="26" height="34" rx="7" fill="#1b1b1b"/>
  <rect x="914" y="212" width="26" height="34" rx="7" fill="#1b1b1b"/>
  <polygon points="92,166 122,98 878,98 908,166" fill="url(#topG)"/>
  <polygon points="232,111 364,111 368,148 226,148" fill="#a9b29c" stroke="#070707" stroke-width="4"/>
  <polygon points="232,111 364,111 365,117 231,117" fill="#fff" opacity=".12"/>
  <g>
    <rect x="756" y="104" width="108" height="26" rx="8" fill="#151515" stroke="#3a3a3a"/>
    <g clip-path="url(#dialClip)"><g class="dial-ticks" transform="translate(756 104)">${ridges}</g></g>
    <ellipse cx="810" cy="104" rx="54" ry="9" fill="#262626" stroke="#3a3a3a"/>
  </g>
  <rect x="80" y="160" width="840" height="400" rx="52" fill="url(#bodyG)" stroke="#2a2a29" stroke-width="2"/>
  <rect x="64" y="166" width="176" height="410" rx="72" fill="url(#gripG)" stroke="#262625"/>
  <rect x="64" y="166" width="176" height="410" rx="72" fill="url(#gripTex)"/>
  <polygon points="372,166 408,52 592,52 628,166" fill="url(#bodyG)" stroke="#2a2a29" stroke-width="2"/>
  <polygon points="408,52 420,34 580,34 592,52" fill="#2d2d2c"/>
  <rect x="440" y="26" width="120" height="10" rx="2" fill="#3b3b3a"/>
  <text x="500" y="134" text-anchor="middle" font-family="Big Shoulders Display, Arial Narrow, sans-serif" font-weight="800" font-size="19" letter-spacing="4" fill="#cfc9be">THE BIG PICTURE</text>
  <g class="shutter-cap">
    <ellipse cx="150" cy="120" rx="44" ry="17" fill="#0c0c0c" stroke="#3b3b3a" stroke-width="2"/>
    <ellipse cx="150" cy="114" rx="31" ry="12" fill="#2f2f2e"/>
    <ellipse cx="146" cy="110" rx="17" ry="5" fill="#4a4a48"/>
  </g>
  <circle class="af-lamp" cx="290" cy="222" r="11" fill="#2a2a29" stroke="#3a3a3a"/>
  <circle cx="322" cy="240" r="4" fill="#050505"/><circle cx="340" cy="240" r="4" fill="#050505"/>
  <circle cx="800" cy="300" r="15" fill="#161616" stroke="#353534" stroke-width="2"/>
  <circle cx="515" cy="380" r="224" fill="#070707" stroke="#2e2e2d" stroke-width="3"/>
  <circle cx="515" cy="380" r="206" fill="url(#ringG)"/>
  <circle cx="515" cy="380" r="196" fill="none" stroke="#1f1f1e" stroke-width="16" stroke-dasharray="3 4"/>
  <circle cx="515" cy="380" r="178" fill="#0a0a0a" stroke="#2a2a29" stroke-width="2"/>
  <text font-family="Share Tech Mono, monospace" font-size="12" letter-spacing="4" fill="#6f6a63"><textPath href="#ringText" startOffset="2%">THE BIG PICTURE · FILM / PHOTOGRAPHY · ATLANTA · MR. WHOSHOTCHA ·</textPath></text>
  <circle cx="515" cy="380" r="154" fill="#000" stroke="#1b1b1a" stroke-width="4"/>
</svg>`;
}

function lensMarkup(c) {
  if (c.lensVideo) return `<video src="${esc(c.lensVideo)}" ${c.lensPoster ? `poster="${esc(c.lensPoster)}"` : ""} muted loop playsinline autoplay preload="auto"></video>`;
  if (c.lensImages && c.lensImages.length) return c.lensImages.map((src, i) => `<img src="${esc(src)}" alt=""${i === 0 ? ' class="on"' : ""}>`).join("");
  return `<div class="lens-placeholder" style="--tint:${c.tint}"><div><span>${esc(c.name)}</span><small>CLIP COMING SOON</small></div></div>`;
}

// ---------- pages ----------
function home() {
  const first = categories[0];
  const camData = categories.map(({ slug, name, dial, tagline, startingAt, tint, lensVideo, lensPoster, lensImages }) => ({ slug, name, dial, tagline, startingAt, tint, lensVideo, lensPoster, lensImages }));
  const featured = projects.filter((p) => p.featured).slice(0, 3);
  const jsonLd = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: site.name,
    description: site.positioning,
    url: site.domain,
    founder: { "@type": "Person", name: site.owner, alternateName: site.alias },
    address: { "@type": "PostalAddress", addressLocality: "Atlanta", addressRegion: "GA", addressCountry: "US" },
    areaServed: "Atlanta, GA",
    ...(site.email ? { email: site.email } : {}),
    ...(site.phone ? { telephone: site.phone } : {}),
    ...(igUrl ? { sameAs: [igUrl] } : {}),
  })}</script>`;

  const body = `
<section class="hero" style="--cam-tint:${first.tint}">
  <div class="wrap">
    <div class="hero-top">
      <p class="eyebrow">Atlanta film &amp; photography</p>
      <div class="cam-tools">
        <button class="chip" id="sound-toggle" aria-pressed="false">Sound off</button>
        <a class="chip" href="/work/">Skip to work</a>
      </div>
    </div>
    <div class="camera-stage">
      <div class="camera hinting" id="camera">
        ${cameraSVG()}
        <div class="lens-screen" id="lens" aria-live="polite">
          <div class="lens-media" id="lens-media">${lensMarkup(first)}</div>
          <div class="lens-glare"></div>
          <div class="lens-iris"></div>
        </div>
        <div class="lcd" id="lcd" aria-hidden="true"><span id="lcd-mode">${esc(first.dial)}</span><span id="lcd-count">01/${String(categories.length).padStart(2, "0")}</span></div>
        <button class="shutter" id="shutter" aria-label="Press the shutter to see the next category" aria-controls="lens"></button>
        <div class="press-hint">Press the shutter</div>
      </div>
    </div>
    <div class="cam-caption">
      <div>
        <p class="cam-price" id="cam-price">${esc(first.startingAt)}</p>
        <h1 id="cam-name">${esc(first.name)}</h1>
        <p class="cam-tag" id="cam-tag">${esc(first.tagline)}</p>
      </div>
      <div class="btn-row">
        <a class="btn" id="cam-see" href="/work/${first.slug}/">See the work</a>
        <a class="btn btn-primary" id="cam-book" href="/book/?service=${first.slug}">Book this</a>
      </div>
      <button class="big-shutter" id="big-shutter" aria-label="Next category"><i></i>Next category</button>
      <div class="cam-dots" role="group" aria-label="Categories">
        ${categories.map((c, i) => `<button class="cam-dot" data-i="${i}" aria-label="${esc(c.name)}"${i === 0 ? ' aria-current="true"' : ""}></button>`).join("")}
        <span class="cam-count" id="cam-count">01 / ${String(categories.length).padStart(2, "0")}</span>
      </div>
    </div>
  </div>
  <script type="application/json" id="camera-data">${JSON.stringify(camData).replace(/</g, "\\u003c")}</script>
</section>

<section class="statement rule">
  <div class="wrap">
    <p>Cinematic work for <em>artists</em>, <em>brands</em> and <em>couples</em>. 14 years behind the lens in Atlanta.</p>
    <a class="btn btn-primary" href="/book/">Book your project</a>
  </div>
</section>

${featured.length ? `<section class="rule"><div class="wrap">
  <div class="section-head"><div><p class="eyebrow">Featured</p><h2>Recent work</h2></div><a class="btn" href="/work/">All work</a></div>
  <div class="grid grid-3">${featured.map(projectTile).join("")}</div>
</div></section>` : ""}

<section class="rule">
  <div class="wrap">
    <div class="section-head"><div><p class="eyebrow">What I shoot</p><h2>Pick your shot</h2></div><a class="btn" href="/services/">Services &amp; investment</a></div>
    <div class="grid grid-3">${categories.map(categoryTile).join("")}</div>
  </div>
</section>

${quotes(testimonials.slice(0, 3))}

<section class="rule">
  <div class="wrap">
    <p class="eyebrow">How booking works</p>
    <h2>Three steps to your date</h2>
    <div class="steps" style="margin-top:36px">
      <div class="step"><h3>Inquire</h3><p>Tell me about your project, date and budget. It takes two minutes.</p></div>
      <div class="step"><h3>Quick call</h3><p>We talk through your vision for 15 minutes, then you get a proposal within 24 hours.</p></div>
      <div class="step"><h3>Lock your date</h3><p>Sign the contract and pay a 50% deposit online. Your date is booked.</p></div>
    </div>
  </div>
</section>
${ctaBand()}`;
  write("/", layout({
    path: "/",
    title: "The Big Picture | Atlanta Film & Photography",
    description: "Atlanta film and photography studio led by Austin J. Best (Mr. WhoShotCha). Music videos, commercials, weddings, portraits, headshots and events.",
    body, jsonLd,
    scripts: `<script src="/assets/js/camera.js" defer></script>`,
  }));
}

function workIndex() {
  const body = `
<section class="page-hero"><div class="wrap">
  <p class="eyebrow">Portfolio</p><h1>The work</h1>
  <p class="lead">Selected projects across film and photography.</p>
</div></section>
<section style="padding-top:0"><div class="wrap">
  <nav class="filters" aria-label="Filter by category">
    <a class="chip" href="/work/" aria-current="page">All</a>
    ${categories.map((c) => `<a class="chip" href="/work/${c.slug}/">${esc(c.name)}</a>`).join("")}
  </nav>
  ${projects.length ? `<div class="grid grid-3">${projects.map(projectTile).join("")}</div>` : `<div class="grid grid-3">${categories.map(categoryTile).join("")}</div>`}
</div></section>
${ctaBand()}`;
  write("/work/", layout({ path: "/work/", title: "Work", description: "Portfolio of The Big Picture: music videos, commercials, weddings, portraits, headshots, events and short films in Atlanta.", body, scripts: `<script src="/assets/js/hover.js" defer></script>` }));
}

function categoryPage(c) {
  const list = projects.filter((p) => p.category === c.slug);
  const qs = testimonials.filter((t) => t.category === c.slug).slice(0, 1);
  const svc = services.filter((s) => s.category === c.slug);
  const body = `
<section class="page-hero cat-hero" style="--tint:${c.tint}"><div class="wrap">
  <p class="eyebrow">${esc(c.name)}</p>
  <h1>${esc(c.headline)}</h1>
  <p class="lead">${esc(c.intro)}</p>
  <span class="price-tag">${esc(c.startingAt)}</span>
  <div class="btn-row"><a class="btn btn-primary" href="/book/?service=${c.slug}">Book ${esc(c.name.toLowerCase())}</a><a class="btn" href="/services/#${svc[0] ? svc[0].id : ""}">See packages</a></div>
</div></section>
<section style="padding-top:0"><div class="wrap">
  <nav class="filters" aria-label="Filter by category">
    <a class="chip" href="/work/">All</a>
    ${categories.map((x) => `<a class="chip" href="/work/${x.slug}/"${x.slug === c.slug ? ' aria-current="page"' : ""}>${esc(x.name)}</a>`).join("")}
  </nav>
  ${list.length ? `<div class="grid grid-3">${list.map(projectTile).join("")}</div>` : emptyWork(c.name)}
</div></section>
<section class="rule"><div class="wrap">
  <p class="eyebrow">What you get</p><h2>Every ${esc(c.name.toLowerCase())} booking includes</h2>
  <ul class="includes" style="margin-top:28px">${c.includes.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
</div></section>
${quotes(qs)}
<section class="rule"><div class="wrap faq">
  <p class="eyebrow">Questions</p><h2>Good to know</h2>
  ${faq.slice(0, 4).map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}
</div></section>
${ctaBand(`Let's make your ${c.name.toLowerCase()}.`)}`;
  write(`/work/${c.slug}/`, layout({ path: `/work/${c.slug}/`, title: `${c.headline}`, description: `${c.intro} ${c.startingAt}. Book The Big Picture in Atlanta.`, body, scripts: `<script src="/assets/js/hover.js" defer></script>` }));
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
  ${p.videoUrl ? `<div class="video-frame"><iframe src="${esc(p.videoUrl)}" title="${esc(p.title)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>` : p.cover ? `<img src="${esc(p.cover)}" alt="${esc(p.title)}" style="border-radius:14px">` : ""}
  ${p.gallery && p.gallery.length ? `<div class="gallery">${p.gallery.map((g) => `<img src="${esc(g)}" alt="${esc(p.title)}" loading="lazy">`).join("")}</div>` : ""}
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
  <div class="portrait-ph">Your photo here</div>
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
  write("/about/", layout({ path: "/about/", title: "About Austin J. Best (Mr. WhoShotCha)", description: "Meet Austin J. Best, aka Mr. WhoShotCha: 14 years filming and photographing in Atlanta, and the founder of The Big Picture.", body }));
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
  <p class="eyebrow">Book</p><h1>Book your project</h1>
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
