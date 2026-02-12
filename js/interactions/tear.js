export function createTearInteraction(clue, onFound) {
  const el = document.createElement("div");
  el.className = "tear";
  el.innerHTML = `
    <div class="tear-reveal">
      <h3>${clue.title}</h3>
      <p>${clue.content}</p>
    </div>
    <div class="tear-cover">
      <div class="tear-edge"></div>
      <div class="tear-handle">Tear</div>
      <div>
        <strong>Pull to reveal</strong>
        <div style="font-size: 0.9rem; opacity: 0.7;">${clue.prompt || "Drag the tab"}</div>
      </div>
    </div>
  `;

  const cover = el.querySelector(".tear-cover");
  const handle = el.querySelector(".tear-handle");
  const edge = el.querySelector(".tear-edge");
  let dragging = false;
  let completed = false;

  function onPointerDown(event) {
    if (completed) return;
    dragging = true;
    handle.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event) {
    if (!dragging || completed) return;
    const bounds = el.getBoundingClientRect();
    const percent = Math.min(Math.max((event.clientX - bounds.left) / bounds.width, 0), 1);
    const remaining = Math.max(0, 1 - percent);
    cover.style.width = `${remaining * 100}%`;
    cover.style.transform = `translateX(${percent * 20}px)`;
    if (edge) {
      edge.style.transform = `translateX(${percent * 6}px)`;
    }

    if (percent >= 0.7) {
      complete();
    }
  }

  function onPointerUp(event) {
    dragging = false;
    handle.releasePointerCapture(event.pointerId);
  }

  function complete() {
    if (completed) return;
    completed = true;
    if (window.gsap) {
      window.gsap.to(cover, {
        duration: 0.8,
        x: 80,
        opacity: 0,
        ease: "power2.out",
        onComplete: () => cover.remove(),
      });
    } else {
      cover.remove();
    }
    onFound(clue.id);
  }

  handle.addEventListener("pointerdown", onPointerDown);
  handle.addEventListener("pointermove", onPointerMove);
  handle.addEventListener("pointerup", onPointerUp);
  handle.addEventListener("pointercancel", onPointerUp);

  return el;
}
