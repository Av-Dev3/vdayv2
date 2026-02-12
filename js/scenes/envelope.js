export function mountEnvelope(container, ctx) {
  const el = document.createElement("section");
  el.className = "scene";
  el.innerHTML = `
    <div class="panel">
      <h2>Click to open</h2>
      <div class="envlope-wrapper">
        <div id="envelope" class="close">
          <div class="front flap"></div>
          <div class="front pocket"></div>
          <div class="letter">
            <div class="words line1"></div>
            <div class="words line2"></div>
            <div class="words line3"></div>
            <div class="words line4"></div>
            <p>Just a little note to say…</p>
            <p><strong>You are my favorite person.</strong></p>
          </div>
        </div>
      </div>
      <button class="btn" data-role="continue" style="display:none; margin-top:16px;">Continue</button>
    </div>
  `;

  const envelope = el.querySelector("#envelope");
  const button = el.querySelector('[data-role="continue"]');
  let opened = false;

  function open() {
    if (opened) return;
    opened = true;
    envelope.classList.add("open");
    envelope.classList.remove("close");
    button.style.display = "inline-flex";
  }

  envelope.addEventListener("click", open);
  button.addEventListener("click", () => ctx.goTo("reveal"));

  container.appendChild(el);

  return () => {
    envelope.removeEventListener("click", open);
  };
}
