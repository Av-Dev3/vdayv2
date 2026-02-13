async function loadJson(path, fallback = []) {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error("load failed");
    return await res.json();
  } catch (err) {
    return fallback;
  }
}

export function mountReveal(container, ctx) {
  const media = typeof ctx.resolveMedia === "function" ? ctx.resolveMedia : (v) => v;
  const el = document.createElement("section");
  el.className = "scene reveal-scene";
  el.innerHTML = `
    <div class="reveal">
      <div class="section note-section">
        <div class="love-note top-note">
          <div class="note-holes">
            <span></span><span></span><span></span>
          </div>
          <div class="note-margin"></div>
          <div class="note-text" data-role="note"></div>
        </div>
      </div>
      <div class="section memory-divider-section">
        <div class="memory-divider">
          <img class="memory-divider-img" alt="Memory" />
        </div>
      </div>
      <div class="section note-section poems-section">
        <div class="poems"></div>
      </div>
      <div class="section memory-divider-section">
        <div class="memory-divider">
          <img class="memory-divider-img memory-divider-img-2" alt="Memory" />
        </div>
      </div>
      <div class="section note-section notes-section">
        <div class="notes"></div>
      </div>
      <div class="section memory-divider-section">
        <div class="memory-divider puzzle-divider">
          <div class="photo-puzzle" data-role="photo-puzzle"></div>
          <p class="puzzle-status" data-role="puzzle-status"></p>
        </div>
      </div>
    </div>
  `;

  const poemsWrap = el.querySelector(".poems");
  const notesWrap = el.querySelector(".notes");
  const noteTarget = el.querySelector('[data-role="note"]');
  const dividerImg = el.querySelector(".memory-divider-img");
  const dividerImg2 = el.querySelector(".memory-divider-img-2");
  const puzzleRoot = el.querySelector('[data-role="photo-puzzle"]');
  const puzzleStatus = el.querySelector('[data-role="puzzle-status"]');
  let eerieStarted = false;

  function renderPoems() {
    poemsWrap.innerHTML = "";
    const poemText = `You whip up a cake with such flair,
With flour all over your hair.
You're good at it all,
Whatever the call,
Nothing else can even compare.`;

    const block = document.createElement("article");
    block.className = "poem-note";
    block.innerHTML = `
      <div class="note-holes"><span></span><span></span><span></span></div>
      <div class="note-margin"></div>
      <p class="note-text poem-note-text"></p>
    `;
    block.querySelector(".poem-note-text").textContent = poemText;
    poemsWrap.appendChild(block);
  }

  function renderNotes() {
    notesWrap.innerHTML = "";
    const fixedNotes = [
      "Happy Valentine's Day to the only person I'd share my fries with",
      "You are the red velvet to my cupcake and the blood splatter to my crime scene. I love you, Snowflake",
      "Nine years down. Forever to go. Let's make this year the best sequel yet",
    ];

    fixedNotes.forEach((note, idx) => {
      const block = document.createElement("article");
      block.className = "notes-note";
      block.dataset.side = idx % 2 === 0 ? "right" : "left";
      block.innerHTML = `
        <div class="note-holes"><span></span><span></span><span></span></div>
        <div class="note-margin"></div>
        <p class="note-text poem-note-text notes-note-text"></p>
      `;
      block.querySelector(".notes-note-text").textContent = note;
      notesWrap.appendChild(block);
    });
  }

  container.appendChild(el);

  const noteText =
    "Chucky said it best friends til the end. But we are so much more. " +
    "You possess my soul more than any doll ever could. " +
    "Happy Valentine's Day to my partner in crime.";

  splitWordsInto(noteTarget, noteText, "note-word");

  let stopScrollFlow = () => {};

  Promise.all([
    loadJson("data/poems.json"),
    loadJson("data/notes.json"),
    loadJson("data/photos.json"),
  ]).then(([, , photos]) => {
    renderPoems();
    renderNotes();

    const pool = Array.isArray(photos) ? photos : [];
    const firstImage = setDividerImage(dividerImg, pool, media);
    const secondImage = setDividerImage(dividerImg2, pool, media, [firstImage]);
    const thirdImage = pickRandomImage(pool, [firstImage, secondImage]);
    initPhotoPuzzle(puzzleRoot, puzzleStatus, thirdImage, media, 3, () => {
      if (eerieStarted) return;
      eerieStarted = true;
      startEerieSequence(el, () => {
        window.location.assign("end.html");
      });
    });

    preparePaperWords(el);
    stopScrollFlow = setupScrollFlow(el);
  });

  return () => {
    stopScrollFlow();
  };
}

function splitWordsInto(target, text, cls) {
  if (!target) return;
  target.innerHTML = "";
  const words = String(text || "")
    .split(" ")
    .filter((w) => w.trim().length > 0);
  words.forEach((word, idx) => {
    const span = document.createElement("span");
    span.className = cls;
    span.textContent = word + (idx < words.length - 1 ? " " : "");
    target.appendChild(span);
  });
}

function preparePaperWords(root) {
  const paragraphs = root.querySelectorAll(".paper-text");
  paragraphs.forEach((p) => {
    const text = p.textContent || "";
    splitWordsInto(p, text, "paper-word");
  });

  const poemLines = root.querySelectorAll(".poem-note-text");
  poemLines.forEach((p) => splitPoemWords(p, "note-word"));
}

function splitPoemWords(target, cls) {
  const lines = String(target.textContent || "").split("\n");
  target.innerHTML = "";
  lines.forEach((line, lineIdx) => {
    const words = line.split(" ").filter((w) => w.trim().length > 0);
    words.forEach((word, idx) => {
      const span = document.createElement("span");
      span.className = cls;
      span.textContent = word + (idx < words.length - 1 ? " " : "");
      target.appendChild(span);
    });
    if (lineIdx < lines.length - 1) target.appendChild(document.createElement("br"));
  });
}

function setDividerImage(target, photos, media, exclude = []) {
  if (!target) return "";
  const randomSrc = pickRandomImage(photos, exclude);
  if (!randomSrc) {
    target.parentElement.style.display = "none";
    return "";
  }
  target.src = typeof media === "function" ? media(randomSrc) : randomSrc;
  return randomSrc;
}

function pickRandomImage(photos, exclude = []) {
  const candidates = photos.filter((src) => /\.(jpg|jpeg|png|webp)$/i.test(src));
  if (!candidates.length) return "";
  const excludeSet = new Set(Array.isArray(exclude) ? exclude : [exclude]);
  const filtered = candidates.filter((src) => !excludeSet.has(src));
  const pool = filtered.length ? filtered : candidates;
  return pool[Math.floor(Math.random() * pool.length)];
}

function initPhotoPuzzle(root, statusNode, imageSrc, media, size, onSolved) {
  if (!root) return;
  if (!imageSrc) {
    root.innerHTML = "";
    if (statusNode) statusNode.textContent = "";
    return;
  }

  const total = size * size;
  const solved = Array.from({ length: total }, (_, i) => i);
  const order = [...solved];
  shuffleArray(order);
  if (isSolved(order)) {
    [order[0], order[1]] = [order[1], order[0]];
  }

  let selected = -1;
  let solvedTriggered = false;

  function render() {
    root.innerHTML = "";
    order.forEach((tileId, idx) => {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "puzzle-tile";
      if (idx === selected) tile.classList.add("selected");
      const resolved = typeof media === "function" ? media(imageSrc) : imageSrc;
      tile.style.backgroundImage = `url('${resolved}')`;
      tile.style.setProperty("--p-size", String(size));
      tile.style.setProperty("--p-col", String(tileId % size));
      tile.style.setProperty("--p-row", String(Math.floor(tileId / size)));
      tile.addEventListener("click", () => {
        if (selected === -1) {
          selected = idx;
          render();
          return;
        }
        if (selected === idx) {
          selected = -1;
          render();
          return;
        }
        [order[selected], order[idx]] = [order[idx], order[selected]];
        selected = -1;
        render();
      });
      root.appendChild(tile);
    });

    if (!statusNode) return;
    if (isSolved(order)) {
      statusNode.textContent = "Puzzle solved.";
      root.classList.add("solved");
      if (!solvedTriggered && typeof onSolved === "function") {
        solvedTriggered = true;
        onSolved();
      }
    } else {
      statusNode.textContent = "Tap two pieces to swap and rebuild the photo.";
      root.classList.remove("solved");
    }
  }

  render();
}

function startEerieSequence(sceneRoot, onDone) {
  sceneRoot.classList.add("eerie-sequence");
  const staticOverlay = document.createElement("div");
  staticOverlay.className = "tv-static-overlay";
  sceneRoot.appendChild(staticOverlay);
  const bloodOverlay = document.createElement("div");
  bloodOverlay.className = "blood-overlay";
  const bloodContent = document.createElement("div");
  bloodContent.className = "blood-content";
  const columns = 30;
  let longestBloodMs = 0;
  for (let i = 0; i < columns; i += 1) {
    const col = document.createElement("div");
    col.className = "blood-col";
    const delay = Number((Math.random() * 1.1).toFixed(2));
    const dur = Number((3.7 + Math.random() * 2.6).toFixed(2));
    col.style.setProperty("--delay", `${delay}s`);
    col.style.setProperty("--dur", `${dur}s`);
    col.style.setProperty("--w", `${(2.6 + Math.random() * 1.6).toFixed(2)}vmax`);
    bloodContent.appendChild(col);
    const total = (delay + dur) * 1000;
    if (total > longestBloodMs) longestBloodMs = total;
  }
  bloodOverlay.appendChild(bloodContent);
  sceneRoot.appendChild(bloodOverlay);

  // Start deleting text progressively during the 15s sequence.
  const words = Array.from(sceneRoot.querySelectorAll(".note-word, .paper-word"));
  const eraseQueue = words
    .filter((w) => (w.textContent || "").trim().length > 0)
    .sort(() => Math.random() - 0.5);
  const eraseIntervalMs = Math.max(55, Math.floor((15000 - 1200) / Math.max(1, eraseQueue.length)));
  const eraser = window.setInterval(() => {
    const word = eraseQueue.shift();
    if (!word) {
      window.clearInterval(eraser);
      return;
    }
    word.classList.add("erasing");
    window.setTimeout(() => {
      word.textContent = "";
      word.style.opacity = "0";
    }, 260);
  }, eraseIntervalMs);

  const puzzle = sceneRoot.querySelector(".photo-puzzle");
  if (puzzle) {
    const tiles = puzzle.querySelectorAll(".puzzle-tile");
    tiles.forEach((tile) => {
      const tx = `${Math.round((Math.random() - 0.5) * 260)}px`;
      const ty = `${Math.round(140 + Math.random() * 380)}px`;
      const rot = `${Math.round((Math.random() - 0.5) * 120)}deg`;
      tile.style.setProperty("--tx", tx);
      tile.style.setProperty("--ty", ty);
      tile.style.setProperty("--rot", rot);
    });
    puzzle.classList.add("collapse");
  }

  const bloodStartMs = 13000;
  window.setTimeout(() => {
    bloodOverlay.classList.add("fall");
  }, bloodStartMs);

  window.setTimeout(() => {
    window.clearInterval(eraser);
    if (typeof onDone === "function") onDone();
  }, bloodStartMs + longestBloodMs + 250);
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function isSolved(arr) {
  for (let i = 0; i < arr.length; i += 1) {
    if (arr[i] !== i) return false;
  }
  return true;
}

function setupScrollFlow(root) {
  return setupObserverFlow(root, window.gsap || null);
}

function setupObserverFlow(root, gsap) {
  const targets = root.querySelectorAll(
    ".top-note, .poem-note, .notes-note, .memory-divider, .paper-card"
  );

  targets.forEach((node) => {
    if (node.classList.contains("paper-card")) {
      const side = node.dataset.side === "right" ? 1 : -1;
      node.style.opacity = "0";
      node.style.transform = `translateX(${140 * side}px) rotate(${1.6 * side}deg)`;
      return;
    }
    if (
      node.classList.contains("top-note") ||
      node.classList.contains("poem-note") ||
      node.classList.contains("notes-note")
    ) {
      node.style.opacity = "0";
      if (node.classList.contains("poem-note")) {
        node.style.transform = "translateX(140px) rotate(1.6deg)";
      } else if (node.classList.contains("notes-note")) {
        const side = node.dataset.side === "right" ? 1 : -1;
        node.style.transform = `translateX(${140 * side}px) rotate(${1.6 * side}deg)`;
      } else {
        node.style.transform = "translateX(-140px) rotate(-1.6deg)";
      }
      return;
    }
    if (node.classList.contains("memory-divider")) {
      node.style.opacity = "0";
      node.style.transform = "translateY(-120px) scale(0.98)";
      return;
    }
    node.style.opacity = "0";
    node.style.transform = "translateY(16px)";
  });

  const playCard = (node) => {
    if (node.dataset.animated === "1") return;
    node.dataset.animated = "1";

    if (node.classList.contains("paper-card")) {
      const words = node.querySelectorAll(".paper-word");
      const heading = node.querySelector("h3");
      const side = node.dataset.side === "right" ? 1 : -1;
      const isPoem = node.classList.contains("poem-paper");

      if (gsap) {
        const tl = gsap.timeline();
        tl.fromTo(
          node,
          { opacity: 0, x: 180 * side, rotate: 2.4 * side },
          { opacity: 1, x: 0, rotate: 0, duration: isPoem ? 1.05 : 0.9, ease: "power3.out" }
        );
        tl.to(
          node,
          { "--paper-reveal": "100%", duration: isPoem ? 0.55 : 0.42, ease: "power1.out" },
          "-=0.14"
        );
        if (heading) tl.to(heading, { opacity: 1, y: 0, duration: isPoem ? 0.32 : 0.24 }, "-=0.2");
        tl.to(
          words,
          {
            opacity: 1,
            y: 0,
            duration: isPoem ? 0.3 : 0.24,
            stagger: isPoem ? 0.05 : 0.028,
            ease: "power2.out",
          },
          "-=0.1"
        );
      } else {
        node.classList.add("show");
        node.style.transform = "none";
        node.style.setProperty("--paper-reveal", "100%");
        if (heading) {
          heading.style.opacity = "1";
          heading.style.transform = "none";
        }
        words.forEach((w) => w.classList.add("visible"));
      }
      return;
    }

    if (
      node.classList.contains("top-note") ||
      node.classList.contains("poem-note") ||
      node.classList.contains("notes-note")
    ) {
      const words = node.querySelectorAll(".note-word");
      const fromRight = node.classList.contains("poem-note") || node.dataset.side === "right";
      if (gsap) {
        const tl = gsap.timeline();
        tl.fromTo(
          node,
          { opacity: 0, x: fromRight ? 180 : -180, rotate: fromRight ? 2.4 : -2.4 },
          { opacity: 1, x: 0, rotate: 0, duration: 0.95, ease: "power3.out" }
        );
        tl.to(node, { "--note-reveal": "100%", duration: 0.5, ease: "power1.out" }, "-=0.14");
        tl.to(words, { opacity: 1, y: 0, duration: 0.28, stagger: 0.05, ease: "power2.out" }, "-=0.03");
      } else {
        node.style.opacity = "1";
        node.style.transform = "none";
        node.style.setProperty("--note-reveal", "100%");
        words.forEach((w) => {
          w.style.opacity = "1";
          w.style.transform = "none";
        });
      }
      return;
    }

    if (node.classList.contains("memory-divider")) {
      if (gsap) {
        gsap.fromTo(
          node,
          { opacity: 0, y: -130, scale: 0.98 },
          { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: "power3.out" }
        );
      } else {
        node.style.opacity = "1";
        node.style.transform = "none";
      }
      return;
    }

    if (gsap) {
      gsap.to(node, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "power2.out" });
    } else {
      node.style.opacity = "1";
      node.style.transform = "none";
    }
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) playCard(entry.target);
      });
    },
    {
      threshold: 0.55,
      rootMargin: "0px 0px -8% 0px",
    }
  );

  targets.forEach((t) => observer.observe(t));

  return () => observer.disconnect();
}
