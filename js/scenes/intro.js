export function mountIntro(container, ctx) {
  const media = typeof ctx.resolveMedia === "function" ? ctx.resolveMedia : (v) => v;
  const el = document.createElement("section");
  el.className = "scene intro-scene";

  el.innerHTML = `
    <video class="panel" playsinline muted autoplay>
      <source src="${media("assets/intro.mp4")}" type="video/mp4" />
      Your browser does not support the intro video.
    </video>
  `;

  const video = el.querySelector("video");

  function handleEnd() {
    ctx.goTo("cardopen");
  }

  video.addEventListener("ended", handleEnd);

  container.appendChild(el);
  video.play().catch(() => {
    video.muted = true;
  });

  return () => {
    video.removeEventListener("ended", handleEnd);
    video.pause();
  };
}


