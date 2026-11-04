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

**Add work to a category** — drop the file in `public/media/` and add an item to that category's `items` in `content/categories.json`:

```json
{ "src": "/media/wedding-2.jpg", "pos": "50% 35%", "tall": true, "alt": "Bride and groom at sunset" }
```

- `pos` is the focus point (left% top%) so faces land in the middle of the round lens.
- `tall: true` for portrait-orientation photos.
- Videos: `{ "src": "/media/clip.mp4", "poster": "/media/clip.jpg", "video": true }`. Keep lens clips short, silent and under ~3 MB.
- YouTube videos: `{ "youtube": "VIDEO_ID", "title": "Song — Artist", "src": "https://i.ytimg.com/vi/VIDEO_ID/maxresdefault.jpg", "pos": "50% 50%" }`. The thumbnail shows in the lens and galleries; the video plays in the viewer. Add `"lb": true` if the thumbnail has black bars (older uploads).
- A category only appears in the home page camera once it has at least one item. Order in the file = order of the shutter cycle.

**Add a project** (a single video with its own page) — add an entry to `content/projects.json`:

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
  "cover": "/media/song-title.jpg",
  "videoUrl": "https://player.vimeo.com/video/123456789",
  "credits": []
}
```

**Change a price** — edit `startingAt` in `content/categories.json` and the matching entry in `content/services.json`.

**Brand rule** — "Big" in The Big Picture is always crimson. The build does this automatically for any visible text.
