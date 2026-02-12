export function createPocketInteraction(clue, onFound) {
  const el = document.createElement("div");
  el.className = "pocket";
  el.innerHTML = `
    <div class="pocket-flap">Tap to open</div>
    <div class="pocket-base">
      <div class="pocket-content">
        <h3>${clue.title}</h3>
        <p>${clue.content}</p>
      </div>
    </div>
  `;

  const flap = el.querySelector(".pocket-flap");
  const content = el.querySelector(".pocket-content");
  let opened = false;

  function open() {
    if (opened) return;
    opened = true;
    if (window.gsap) {
      window.gsap.to(flap, {
        duration: 0.8,
        rotationX: -160,
        ease: "power2.out",
      });
      window.gsap.fromTo(
        content,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.6, delay: 0.2, ease: "power2.out" }
      );
    } else {
      flap.style.transform = "rotateX(-160deg)";
      content.style.opacity = "1";
    }
    onFound(clue.id);
  }

  flap.addEventListener("click", open);

  return el;
}
