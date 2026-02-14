async function loadText(path, fallback = "", resolve = (v) => v) {
  try {
    const res = await fetch(resolve(path));
    if (!res.ok) throw new Error("load failed");
    return await res.text();
  } catch (err) {
    return fallback;
  }
}

async function loadJson(path, fallback = [], resolve = (v) => v) {
  try {
    const res = await fetch(resolve(path));
    if (!res.ok) throw new Error("load failed");
    return await res.json();
  } catch (err) {
    return fallback;
  }
}

function parseLrc(text) {
  const lines = text.split(/\r?\n/);
  const entries = [];
  const timeRe = /\[(\d{2}):(\d{2})(?:\.(\d{2}))?\]/g;
  const inlineTimeRe = /<\d{2}:\d{2}\.\d{2}>/g;
  const inlineTimeCapture = /<(\d{2}):(\d{2})\.(\d{2})>/g;

  lines.forEach((line) => {
    if (!line.trim()) return;
    if (/\[(ti|ar|al|length):/i.test(line)) return;
    const times = [...line.matchAll(timeRe)];
    if (!times.length) return;
    const textPart = line.replace(timeRe, "").trim();
    const words = [];
    let lastIndex = 0;
    let lastTime = null;

    textPart.replace(inlineTimeCapture, (full, mm, ss, ff, offset) => {
      if (lastTime !== null) {
        const word = textPart.slice(lastIndex, offset).trim();
        if (word) words.push({ t: lastTime, text: word });
      }
      lastIndex = offset + full.length;
      lastTime = Number(mm) * 60 + Number(ss) + Number(ff) / 100;
      return full;
    });

    if (lastTime !== null) {
      const tail = textPart.slice(lastIndex).trim();
      if (tail) words.push({ t: lastTime, text: tail });
    }

    const cleanLine = textPart.replace(inlineTimeRe, "").trim();

    times.forEach((match) => {
      const mm = Number(match[1]);
      const ss = Number(match[2]);
      const ff = Number(match[3] || 0);
      const t = mm * 60 + ss + ff / 100;
      entries.push({ t, line: cleanLine, words });
    });
  });

  return entries.sort((a, b) => a.t - b.t);
}

export function mountSong(container, ctx) {
  const media = typeof ctx.resolveMedia === "function" ? ctx.resolveMedia : (v) => v;
  const el = document.createElement("section");
  el.className = "scene song-scene";

  el.innerHTML = `
    <div class="slideshow">
      <div class="slide-layer slide-a"></div>
      <div class="slide-layer slide-b"></div>
    </div>
    <div class="lyrics-overlay">
      <div class="lyrics-line current" data-role="current"></div>
    </div>
  `;

  const currentLine = el.querySelector('[data-role="current"]');
  const slideshow = el.querySelector(".slideshow");
  const slideA = el.querySelector(".slide-a");
  const slideB = el.querySelector(".slide-b");

  const audio = new Audio(media("assets/song.mp3"));
  audio.preload = "auto";
  audio.loop = false;

  let lyrics = [];
  let lyricIndex = -1;
  let activeWords = [];
  let rafId = null;
  let slideTimer = null;
  let slideIndex = 0;
  let isSlideA = true;
  const END_TIME = 174;
  let finished = false;

  function updateLines(index) {
    const current = lyrics[index] ? lyrics[index].line : "";
    activeWords = lyrics[index] && lyrics[index].words ? lyrics[index].words : [];

    if (window.gsap) {
      window.gsap.fromTo(
        currentLine,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.7 }
      );
    }

    renderCurrentWords(currentLine, current, activeWords);
  }

  function renderCurrentWords(target, fallbackText, words) {
    target.innerHTML = "";
    if (!words.length) {
      target.textContent = fallbackText;
      return;
    }
    words.forEach((word, idx) => {
      const span = document.createElement("span");
      span.className = "lyric-word";
      span.dataset.t = String(word.t);
      span.textContent = word.text + (idx < words.length - 1 ? " " : "");
      target.appendChild(span);
    });
  }

  function updateWordHighlight(currentTime) {
    if (!activeWords.length) return;
    const spans = currentLine.querySelectorAll(".lyric-word");
    spans.forEach((span, idx) => {
      const t = Number(span.dataset.t || 0);
      const nextT = idx < spans.length - 1 ? Number(spans[idx + 1].dataset.t || 1e9) : 1e9;
      const active = currentTime >= t && currentTime < nextT;
      span.classList.toggle("active", active);
    });
  }

  function tick() {
    if (audio.currentTime >= END_TIME && !finished) {
      finished = true;
      audio.pause();
      audio.currentTime = END_TIME;
      cleanupSlides();
      ctx.goTo("envelope");
      return;
    }

    const t = audio.currentTime;

    for (let i = 0; i < lyrics.length; i += 1) {
      const line = lyrics[i];
      const next = lyrics[i + 1];
      if (t >= line.t && (!next || t < next.t)) {
        if (lyricIndex !== i) {
          lyricIndex = i;
          updateLines(i);
        }
        break;
      }
    }
    updateWordHighlight(t);
    rafId = requestAnimationFrame(tick);
  }

  function cleanupSlides() {
    if (slideTimer) clearInterval(slideTimer);
    [slideA, slideB].forEach((layer) => {
      layer.innerHTML = "";
    });
  }

  function buildMediaNode(src) {
    const isVideo = src.toLowerCase().endsWith(".mp4");
    if (isVideo) {
      const vid = document.createElement("video");
      vid.src = media(src);
      vid.muted = true;
      vid.playsInline = true;
      vid.preload = "metadata";
      return vid;
    }
    const img = document.createElement("img");
    img.src = media(src);
    img.alt = "Memory";
    return img;
  }

  function shuffleItems(items) {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function startSlideshow(items) {
    if (!items.length) return;
    const playlist = shuffleItems(items);
    const first = buildMediaNode(playlist[0]);
    slideA.appendChild(first);
    slideA.classList.add("active");
    if (first.tagName === "VIDEO") {
      first.currentTime = 0;
      first.play().catch(() => {});
    }

    slideIndex = 1;
    slideTimer = setInterval(() => {
      const nextSrc = playlist[slideIndex % playlist.length];
      const active = isSlideA ? slideA : slideB;
      const idle = isSlideA ? slideB : slideA;

      active.classList.remove("active");
      idle.classList.add("active");
      idle.innerHTML = "";

      const node = buildMediaNode(nextSrc);
      idle.appendChild(node);
      if (node.tagName === "VIDEO") {
        node.currentTime = 0;
        node.play().catch(() => {});
      }

      isSlideA = !isSlideA;
      slideIndex += 1;
    }, 5200);
  }

  function showAudioOverlay() {
    const overlay = document.createElement("div");
    overlay.className = "audio-overlay";
    overlay.innerHTML = `
      <button class="btn">Tap to start music</button>
    `;
    const button = overlay.querySelector(".btn");
    button.addEventListener("click", () => {
      audio.play();
      overlay.remove();
    });
    slideshow.appendChild(overlay);
  }

  audio.addEventListener("ended", () => {
    if (finished) return;
    finished = true;
    cleanupSlides();
    ctx.goTo("envelope");
  });

  container.appendChild(el);

  Promise.all([
    loadText("data/lyrics.lrc", "", media),
    loadJson("data/photos.json", [], media),
  ]).then(([lrcText, photos]) => {
    lyrics = parseLrc(lrcText);
    currentLine.textContent = "";
    startSlideshow(Array.isArray(photos) ? photos : []);
    audio.play().catch(showAudioOverlay);
    tick();
  });

  return () => {
    audio.pause();
    audio.src = "";
    if (rafId) cancelAnimationFrame(rafId);
    cleanupSlides();
  };
}


