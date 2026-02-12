import { incrementAttempts } from "../state.js";

export function mountPassword(container, ctx) {
  const el = document.createElement("section");
  el.className = "scene";

  el.innerHTML = `
    <div class="panel password-panel">
      <h1>Welcome, love</h1>
      <p>Enter the password to begin.</p>
      <input class="input" type="password" placeholder="Secret word" />
      <div class="password-actions">
        <button class="btn">Unlock</button>
        <button class="btn secondary" data-role="hint">Hint</button>
      </div>
      <div class="error"></div>
    </div>
  `;

  const input = el.querySelector(".input");
  const button = el.querySelector(".btn");
  const hintBtn = el.querySelector('[data-role="hint"]');
  const error = el.querySelector(".error");
  const panel = el.querySelector(".panel");

  function submit() {
    const value = input.value.trim();
    if (value.toLowerCase() === ctx.config.PASSWORD.toLowerCase()) {
      ctx.goTo("intro");
      return;
    }
    incrementAttempts();
    error.textContent = "That is not quite right.";
    panel.classList.remove("shake");
    void panel.offsetWidth;
    panel.classList.add("shake");
  }

  button.addEventListener("click", submit);
  hintBtn.addEventListener("click", () => {
    spawnSnowflakes(el);
    error.textContent = "Think cozy, quiet, and winter.";
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") submit();
  });

  container.appendChild(el);

  return () => {
    button.removeEventListener("click", submit);
  };
}

function spawnSnowflakes(scene) {
  const count = 24;
  for (let i = 0; i < count; i += 1) {
    const flake = document.createElement("div");
    flake.className = "snowflake";
    flake.textContent = "❄";
    flake.style.left = `${Math.random() * 100}vw`;
    flake.style.animationDelay = `${Math.random() * 0.8}s`;
    flake.style.animationDuration = `${2.8 + Math.random() * 2.2}s`;
    flake.style.opacity = `${0.5 + Math.random() * 0.5}`;
    scene.appendChild(flake);
    flake.addEventListener("animationend", () => flake.remove());
  }
}
