import { incrementAttempts } from "../state.js";

export function mountFinal(container, ctx) {
  const el = document.createElement("section");
  el.className = "scene";
  el.innerHTML = `
    <div class="panel final-card">
      <h2>Final Answer</h2>
      <p>Use your clues to unlock the last surprise.</p>
      <input class="input" type="text" placeholder="Final answer" />
      <button class="btn">Unlock</button>
      <div class="error"></div>
    </div>
  `;

  const input = el.querySelector(".input");
  const button = el.querySelector(".btn");
  const error = el.querySelector(".error");
  const panel = el.querySelector(".panel");

  function submit() {
    const value = input.value.trim();
    if (value.toLowerCase() === ctx.config.FINAL_ANSWER.toLowerCase()) {
      ctx.goTo("gift");
      return;
    }
    incrementAttempts();
    error.textContent = "Try again, sweetheart.";
    panel.classList.remove("shake");
    void panel.offsetWidth;
    panel.classList.add("shake");
  }

  button.addEventListener("click", submit);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") submit();
  });

  container.appendChild(el);

  return () => {
    button.removeEventListener("click", submit);
  };
}
