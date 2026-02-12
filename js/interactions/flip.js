export function createFlipInteraction(clue, onFound) {
  const el = document.createElement("div");
  el.className = "flip-card";
  el.innerHTML = `
    <div class="flip-inner">
      <div class="flip-face front">${clue.front || "Tap to flip"}</div>
      <div class="flip-face back">
        <div>
          <h3>${clue.title}</h3>
          <p>${clue.content}</p>
        </div>
      </div>
    </div>
  `;

  const inner = el.querySelector(".flip-inner");
  let flipped = false;

  function flip() {
    if (flipped) return;
    flipped = true;
    if (window.gsap) {
      window.gsap.to(inner, {
        duration: 0.8,
        rotateY: 180,
        ease: "power2.out",
      });
      window.gsap.fromTo(
        inner,
        { scale: 0.98 },
        { scale: 1, duration: 0.6, ease: "power2.out" }
      );
    } else {
      inner.style.transform = "rotateY(180deg)";
    }
    onFound(clue.id);
  }

  inner.addEventListener("click", flip);

  return el;
}
