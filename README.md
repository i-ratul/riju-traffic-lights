# Wait for Green

A calm, single-purpose web game for a young child. A traffic light cycles
red ↔ green. On **green** the child taps **GO** and the car drives (the world
scrolls past it); on **red** he taps **STOP** and the car stops. It trains
stopping-on-signal (inhibitory control) and rule-switching, in a familiar
real-world scene.

## Run it locally
It's plain static files — no build step. Just open `index.html`, or serve the
folder:

```
python -m http.server 5050
```

then visit `http://localhost:5050`.

## Files
- `index.html`, `style.css`, `script.js` — the whole game (vanilla HTML/CSS/JS).
- `manifest.json` — lets it launch full-screen from the phone home screen.
- `assets/` — `car.png`, `light.png`, `go.png`, `stop.png`.
- `audio/` — drop in `go.mp3`, `stop.mp3`, `engine.mp3`, `brake.mp3`,
  `miss.mp3` to enable sound. Missing files fail silently; the game runs fine
  without them.

## Tuning
All adjustable numbers (timings, sizes, glow positions) are named constants at
the top of `script.js` and `style.css`, with comments — so difficulty can grow
with the child.

## Deploy
Static hosting (e.g. Cloudflare Pages): framework preset **None**, build
command **empty**, output directory **/** (root). Every push auto-redeploys.
