/* =====================================================================
   "Wait for Green" — script.js
   A calm go/stop game. The traffic light cycles red <-> green.
   On GREEN the child taps GO and the world scrolls (driving).
   On RED the child taps STOP and the world freezes.
   A missed stop is gentle: the car coasts to a stop by itself.

   Everything tunable lives in the CONSTANTS block right below.
   ===================================================================== */

/* ------------------------------------------------------------------
   1. TUNABLE CONSTANTS  (make the game easier/harder as he grows)
   ------------------------------------------------------------------ */
const INITIAL_GREEN_DELAY = 5000;              // first green, after Start tap
const DRIVE_MIN = 5000, DRIVE_MAX = 12000;     // how long he drives before red
const STOP_WINDOW = 5000;                      // time to press STOP before the car coasts
const STOPPED_MIN = 5000, STOPPED_MAX = 10000; // pause before next green
const GO_REPROMPT = 4000;                      // re-say "Go!" if GO not pressed
const COAST_MS = 1800;                         // gentle roll-to-stop on a miss

/* ------------------------------------------------------------------
   2. GRAB THE ELEMENTS WE NEED
   ------------------------------------------------------------------ */
const lampRed     = document.querySelector('.lamp-red');
const lampGreen   = document.querySelector('.lamp-green');
const car         = document.getElementById('car');
const road        = document.getElementById('road-dashes');
const btnGo       = document.getElementById('btn-go');
const btnStop     = document.getElementById('btn-stop');
const startOverlay  = document.getElementById('start-overlay');
const rotateOverlay = document.getElementById('rotate-overlay');
const scene       = document.getElementById('scene');

/* ------------------------------------------------------------------
   3. AUDIO  (fails silently if the mp3 files aren't there yet)
   ------------------------------------------------------------------ */
const SOUND_NAMES = ['go', 'stop', 'engine', 'brake', 'miss'];
const sounds = {};
for (const name of SOUND_NAMES) {
  const a = new Audio('audio/' + name + '.mp3');
  a.preload = 'auto';
  sounds[name] = a;
}

// Unlock audio on the first tap (mobile blocks sound until a user gesture).
let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  for (const name of SOUND_NAMES) {
    const a = sounds[name];
    a.play().then(() => { a.pause(); a.currentTime = 0; }).catch(() => {});
  }
}

// Play a clip from the start; never let a missing file break the game.
function playSound(name) {
  const a = sounds[name];
  if (!a) return;
  try {
    a.currentTime = 0;
    a.play().catch(() => {});
  } catch (e) { /* ignore */ }
}

/* ------------------------------------------------------------------
   4. TIMER HYGIENE  (the #1 bug source)
   Store every pending timeout; clear them ALL on every transition.
   ------------------------------------------------------------------ */
let timers = [];
function later(fn, ms) {
  const id = setTimeout(fn, ms);
  timers.push(id);
  return id;
}
function clearTimers() {
  for (const id of timers) clearTimeout(id);
  timers = [];
}

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/* ------------------------------------------------------------------
   5. SMALL VISUAL HELPERS
   ------------------------------------------------------------------ */
function showRed()   { lampRed.classList.add('on');    lampGreen.classList.remove('on'); }
function showGreen() { lampGreen.classList.add('on');  lampRed.classList.remove('on');   }

function worldMoving(on) {
  // Run or freeze the road scroll + car bob together.
  const state = on ? 'running' : 'paused';
  road.style.animationPlayState = state;
  car.classList.toggle('driving', on);
}

function pulse(btn) {
  btnGo.classList.remove('pulse');
  btnStop.classList.remove('pulse');
  if (btn) btn.classList.add('pulse');
}

/* ------------------------------------------------------------------
   6. THE STATE MACHINE
   States: WAIT -> GREEN -> DRIVING -> RED -> (STOPPED or MISSED->STOPPED) -> GREEN ...
   ------------------------------------------------------------------ */
let state = 'START';

function toWait() {
  clearTimers();
  state = 'WAIT';
  showRed();
  worldMoving(false);   // frozen
  pulse(null);
  later(toGreen, INITIAL_GREEN_DELAY);
}

function toGreen() {
  clearTimers();
  state = 'GREEN';
  showGreen();
  worldMoving(false);   // still stopped until he presses GO
  playSound('go');
  pulse(btnGo);         // gently hint the GO button
  // No deadline on the easy side — just keep re-prompting "Go!".
  scheduleGoReprompt();
}

function scheduleGoReprompt() {
  later(() => {
    if (state === 'GREEN') {
      playSound('go');
      scheduleGoReprompt();
    }
  }, GO_REPROMPT);
}

function toDriving() {
  clearTimers();
  state = 'DRIVING';
  showGreen();
  pulse(null);
  worldMoving(true);    // world scrolls, car bobs
  playSound('engine');
  later(toRed, rand(DRIVE_MIN, DRIVE_MAX));
}

function toRed() {
  clearTimers();
  state = 'RED';
  showRed();
  // World KEEPS scrolling — he's still driving and must brake!
  worldMoving(true);
  playSound('stop');
  pulse(btnStop);       // hint the STOP button
  later(toMissed, STOP_WINDOW);
}

function toStopped() {
  clearTimers();
  state = 'STOPPED';
  showRed();
  worldMoving(false);   // frozen
  pulse(null);
  later(toGreen, rand(STOPPED_MIN, STOPPED_MAX));
}

function toMissed() {
  clearTimers();
  state = 'MISSED';
  pulse(null);
  playSound('miss');    // gentle "aw", never a buzzer
  // Car coasts slowly to a stop by itself, then we settle into STOPPED.
  road.style.transition = 'none';
  // Ease the scroll to a halt by slowing the animation, then freeze.
  road.style.animationDuration = '2.4s';
  later(() => {
    worldMoving(false);
    road.style.animationDuration = '';   // restore normal speed for next drive
    toStopped();
  }, COAST_MS);
}

/* ------------------------------------------------------------------
   7. BUTTON HANDLERS
   The non-active button does nothing (no error, no sound, no penalty).
   ------------------------------------------------------------------ */
function onGo() {
  if (state === 'GREEN') {
    clearTimers();       // stop the go-reprompt loop
    toDriving();
  }
}
function onStop() {
  if (state === 'RED') {
    clearTimers();       // cancel the miss timer
    state = 'STOPPED';
    showRed();
    playSound('brake');
    pulse(null);
    worldMoving(false);  // quick, clean freeze
    later(toGreen, rand(STOPPED_MIN, STOPPED_MAX));
  }
}

btnGo.addEventListener('click', onGo);
btnStop.addEventListener('click', onStop);

/* ------------------------------------------------------------------
   8. START / FULLSCREEN / ORIENTATION
   ------------------------------------------------------------------ */
function startGame() {
  unlockAudio();

  // Fullscreen hides browser chrome (no accidental edge gestures),
  // then try to lock landscape. All wrapped so failures are harmless.
  const el = document.documentElement;
  const fs = el.requestFullscreen ? el.requestFullscreen() : Promise.reject();
  Promise.resolve(fs)
    .then(() => {
      if (screen.orientation && screen.orientation.lock) {
        return screen.orientation.lock('landscape');
      }
    })
    .catch(() => { /* rotate overlay fallback handles portrait */ });

  startOverlay.classList.add('hidden');
  checkOrientation();
  toWait();
}

startOverlay.addEventListener('click', startGame);

// Show the rotate prompt only when the phone is in portrait.
function checkOrientation() {
  const portrait = window.matchMedia('(orientation: portrait)').matches;
  rotateOverlay.classList.toggle('show', portrait);
}
window.addEventListener('resize', checkOrientation);
window.addEventListener('orientationchange', checkOrientation);

/* ------------------------------------------------------------------
   9. TODDLER-PROOFING
   ------------------------------------------------------------------ */
// No right-click / long-press context menu.
document.addEventListener('contextmenu', (e) => e.preventDefault());
// Belt-and-braces: block pinch-zoom gestures.
document.addEventListener('gesturestart', (e) => e.preventDefault());

/* ------------------------------------------------------------------
   10. INITIAL PAINT (before Start is tapped)
   ------------------------------------------------------------------ */
showRed();
worldMoving(false);
checkOrientation();
