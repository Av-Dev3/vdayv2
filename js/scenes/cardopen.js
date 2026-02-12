export function mountCardOpen(container, ctx) {
  const el = document.createElement("section");
  el.className = "scene card-stage full-card";

  el.innerHTML = `
    <div class="card">
      <div class="card-base">
        <div class="card-inner">
          <h2>For you</h2>
          <p>Ready for a little surprise?</p>
        </div>
      </div>
      <div class="card-cover">
        <div class="card-front">
          <h2>Tap to open</h2>
        </div>
      </div>
    </div>
  `;

  const cover = el.querySelector(".card-cover");
  let opened = false;

  function openCard() {
    if (opened) return;
    opened = true;
    if (window.gsap) {
      window.gsap.to(cover, {
        duration: 1.6,
        rotateY: -160,
        ease: "power2.inOut",
        onComplete: () => ctx.goTo("song"),
      });
    } else {
      cover.style.transform = "rotateY(-160deg)";
      setTimeout(() => ctx.goTo("song"), 900);
    }
  }

  el.addEventListener("click", openCard);
  container.appendChild(el);

  return () => {
    el.removeEventListener("click", openCard);
  };
}
