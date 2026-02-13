export function mountCardOpen(container, ctx) {
  const el = document.createElement("section");
  el.className = "scene card-stage full-card";

  el.innerHTML = `
    <div class="card">
      <div class="card-base">
        <div class="card-inner">
          <div class="card-letter"></div>
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
  const lines = [
    "Hey my love,",
    "I know this isn't the usual kind of Valentine's gift but I wanted to make you something a little different this year. I put this together just for you and I hope its a fun little experience.",
    "Thank you for being you. For the laughs the comfort the chaos all of it. I'm really lucky I get to love you.",
    "Happy Valentine's Day ❤️",
    "Always yours",
  ];
  let opened = false;

  function buildLetter() {
    letter.innerHTML = "";
    lines.forEach((line, idx) => {
      const p = document.createElement("p");
      if (idx === 0) p.classList.add("card-line-lead");
      if (idx === lines.length - 1) p.classList.add("card-line-signoff");
      line.split(/\s+/).filter(Boolean).forEach((word, wIdx, arr) => {
        const span = document.createElement("span");
        span.className = "card-word";
        span.textContent = word + (wIdx < arr.length - 1 ? " " : "");
        p.appendChild(span);
      });
      letter.appendChild(p);
    });
  }

  function animateWords() {
    const words = Array.from(letter.querySelectorAll(".card-word"));
    if (!words.length) {
      beginBtn.classList.add("show");
      return;
    }
    if (window.gsap) {
      window.gsap.to(words, {
        opacity: 1,
        y: 0,
        duration: 0.28,
        ease: "power2.out",
        stagger: 0.035,
        onComplete: () => beginBtn.classList.add("show"),
      });
      return;
    }
    words.forEach((word, idx) => {
      window.setTimeout(() => {
        word.classList.add("show");
        if (idx === words.length - 1) beginBtn.classList.add("show");
      }, idx * 42);
    });
  }

  function revealInside() {
    buildLetter();
    letter.classList.add("show");
    animateWords();
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
