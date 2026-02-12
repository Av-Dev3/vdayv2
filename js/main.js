import { getProgress, resetProgress, setState } from "./state.js";
import { mountPassword } from "./scenes/password.js";
import { mountIntro } from "./scenes/intro.js";
import { mountClickOpen } from "./scenes/clickopen.js";
import { mountCardOpen } from "./scenes/cardopen.js";
import { mountSong } from "./scenes/song.js";
import { mountEnvelope } from "./scenes/envelope.js";
import { mountReveal } from "./scenes/reveal.js";
import { mountFinal } from "./scenes/final.js";
import { mountGift } from "./scenes/gift.js";
import { initMediaMap, resolveMedia } from "./media.js";

const CONFIG = {
  PASSWORD: "snowflake",
  FINAL_ANSWER: "rose moon spark",
};

const LOCKED_STATES = new Set([
  "password",
  "intro",
  "clickopen",
  "cardopen",
  "song",
  "envelope",
  "final",
  "gift",
]);

const scenes = {
  password: mountPassword,
  intro: mountIntro,
  clickopen: mountClickOpen,
  cardopen: mountCardOpen,
  song: mountSong,
  envelope: mountEnvelope,
  reveal: mountReveal,
  final: mountFinal,
  gift: mountGift,
};

const app = document.getElementById("app");
let cleanup = null;

function setBodyLock(state) {
  document.body.classList.toggle("no-scroll", LOCKED_STATES.has(state));
}

function goTo(state) {
  setState(state);
  mount(state);
}

function mount(state) {
  if (cleanup) cleanup();
  app.innerHTML = "";
  setBodyLock(state);
  const scene = scenes[state] || scenes.password;

  const shell = document.createElement("div");
  shell.className = "app-shell";
  const reset = document.createElement("button");
  reset.className = "btn secondary reset-btn";
  reset.textContent = "Reset";
  reset.addEventListener("click", () => {
    resetProgress();
    goTo("password");
  });
  shell.appendChild(reset);
  app.appendChild(shell);

  cleanup = scene(app, { goTo, config: CONFIG, resolveMedia });
}

window.addEventListener("DOMContentLoaded", async () => {
  await initMediaMap();
  const progress = getProgress();
  mount(progress.state || "password");
});
