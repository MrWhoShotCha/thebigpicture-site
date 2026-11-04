# The Big Picture — website

Site for The Big Picture (Austin J. Best, aka Mr. WhoShotCha), Atlanta film & photography.
Live at https://thebigpicturevisuals.com

## How it works

- `content/` holds everything you'd change day to day (no code):
  - `site.json` — email, phone, Instagram handle, booking form endpoint, call link
  - `categories.json` — the camera's categories (order = order in the shutter cycle), lens clips, starting prices
  - `services.json` — packages shown on /services
  - `projects.json` — portfolio projects
  - `testimonials.json` — client quotes (sections stay hidden until this has entries)
  - `faq.json` — questions and answers
- `src/` — styles and scripts. `src/js/camera.js` runs the home page camera.
- `public/` — files copied as-is. Put media in `public/media/` (served at `/media/...`).
- `build.mjs` — builds the site into `dist/`. No dependencies: `node build.mjs`.

## Hosting (Cloudflare Pages)

- Build command: `node build.mjs`
- Build output directory: `dist`
- Every push to `main` deploys automatically.

## Common updates

**Add a project** — add an entry to `content/projects.json`:

```json
{
  "slug": "artist-name-song-title",
  "title": "Song Title — Artist Name",
  "client": "Artist Name",
  "category": "music-videos",
  "date": "2026",
  "role": "Director, DP, Editor",
  "brief": "Two sentences about the idea.",
  "result": "One line about the result.",
  "cover": "/media/projects/song-title.webp",
  "previewVideo": "/media/projects/song-title-preview.mp4",
  "videoUrl": "https://player.vimeo.com/video/123456789",
  "gallery": [],
  "credits": [],
  "featured": true
}
```

**Change a price** — edit `startingAt` in `content/categories.json` and the matching entry in `content/services.json`.

**Add a lens clip** — export a graded 5–8 second silent loop (MP4, under 2 MB, square crop works best), save it in `public/media/lens/`, and set `lensVideo` (and a `lensPoster` still) on that category. For photo categories, list 3–4 images in `lensImages` instead.

**Reorder the camera** — reorder the entries in `content/categories.json`.
