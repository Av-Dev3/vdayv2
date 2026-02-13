export function mountCardOpen(container, ctx) {
  const el = document.createElement("section");
  el.className = "scene card-stage full-card";

  el.innerHTML = `
    <div class="card">
      <div class="card-base">
        <div class="card-inner">
          <div class="card-letter">
            <p>My love,</p>
            <p>
              This Valentine's Day I wanted to give you something a little different.
              Not just a gift but an experience made just for you. I put this together
              with you in my heart because you deserve something thoughtful personal and
              a little magical.
            </p>
            <p>
              Thank you for being my favorite person my comfort and my chaos all at once.
              I'm so lucky I get to love you.
            </p>
            <p>Happy Valentine's Day<br>Yours always</p>
          </div>
          <button class="btn card-begin" type="button">Begin</button>
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
  const beginBtn = el.querySelector(".card-begin");
  const letter = el.querySelector(".card-letter");
  let opened = false;

  function revealInside() {
    letter.classList.add("show");
    beginBtn.classList.add("show");
  }

  function openCard() {
    if (opened) return;
    opened = true;
    if (window.gsap) {
      window.gsap.to(cover, {
        duration: 1.6,
        rotateY: -160,
        ease: "power2.inOut",
        onComplete: revealInside,
      });
    } else {
      cover.style.transform = "rotateY(-160deg)";
      setTimeout(revealInside, 900);
    }
  }

  cover.addEventListener("click", openCard);
  beginBtn.addEventListener("click", () => ctx.goTo("song"));
  container.appendChild(el);

  return () => {
    cover.removeEventListener("click", openCard);
  };
}

