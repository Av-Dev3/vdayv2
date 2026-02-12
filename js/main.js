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
  SITE_PASSWORD: "vdaybaby",
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
const SITE_GATE_KEY = "vday_site_gate_v1";

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

function mountSiteGate(onPass) {
  if (cleanup) cleanup();
  app.innerHTML = "";
  setBodyLock("password");

  const el = document.createElement("section");
  el.className = "scene";
  el.innerHTML = `
    <div class="panel password-panel">
      <h1>Enter Site Password</h1>
      <p>One more lock before we begin.</p>
      <input class="input" type="password" placeholder="Site password" />
      <div class="password-actions">
        <button class="btn">Enter</button>
      </div>
      <div class="error"></div>
    </div>
  `;

  const input = el.querySelector(".input");
  const button = el.querySelector(".btn");
  const error = el.querySelector(".error");
  const panel = el.querySelector(".panel");

  function submit() {
    const value = input.value.trim();
    if (value.toLowerCase() === CONFIG.SITE_PASSWORD.toLowerCase()) {
      sessionStorage.setItem(SITE_GATE_KEY, "ok");
      onPass();
      return;
    }
    error.textContent = "Incorrect password.";
    panel.classList.remove("shake");
    void panel.offsetWidth;
    panel.classList.add("shake");
  }

  button.addEventListener("click", submit);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") submit();
  });

  app.appendChild(el);
}

function mountPreStartScreen(onStart) {
  if (cleanup) cleanup();
  app.innerHTML = "";
  setBodyLock("password");

  const el = document.createElement("section");
  el.className = "scene prestart-screen";
  el.innerHTML = `
    <div class="panel prestart-panel">
      <h1>Before We Start</h1>
      <p class="prestart-instruction">Please turn your volume up for the full experience.</p>
      <button class="btn secondary prestart-fullscreen" type="button">Go Fullscreen</button>
      <p class="prestart-note">I love you. Enjoy every little moment.</p>
      <div class="prestart-actions">
        <button class="btn prestart-start" type="button">Start</button>
      </div>
    </div>
  `;

  const fullscreenBtn = el.querySelector(".prestart-fullscreen");
  const startBtn = el.querySelector(".prestart-start");

  function goFullscreen() {
    const root = document.documentElement;
    if (document.fullscreenElement) return;
    if (root.requestFullscreen) {
      root.requestFullscreen().catch(() => {});
      return;
    }
    if (root.webkitRequestFullscreen) {
      root.webkitRequestFullscreen();
    }
  }

  fullscreenBtn.addEventListener("click", goFullscreen);
  startBtn.addEventListener("click", onStart);

  app.appendChild(el);
}

window.addEventListener("DOMContentLoaded", async () => {
  await initMediaMap();
  const startApp = () => {
    const progress = getProgress();
    mount(progress.state || "password");
  };
  const startWithPreScreen = () => mountPreStartScreen(startApp);
  if (sessionStorage.getItem(SITE_GATE_KEY) === "ok") {
    startWithPreScreen();
    return;
  }
  mountSiteGate(startWithPreScreen);
});
