const STORAGE_KEY = "vday_progress_v1";

const defaultProgress = {
  state: "password",
  foundClues: [],
  attempts: 0,
};

let progress = load();

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { ...defaultProgress };
  try {
    const parsed = JSON.parse(raw);
    return {
      ...defaultProgress,
      ...parsed,
      foundClues: Array.isArray(parsed.foundClues) ? parsed.foundClues : [],
    };
  } catch (err) {
    return { ...defaultProgress };
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function getProgress() {
  return {
    ...progress,
    foundClues: [...progress.foundClues],
  };
}

export function setState(newState) {
  progress.state = newState;
  save();
}

export function markClueFound(id) {
  if (!progress.foundClues.includes(id)) {
    progress.foundClues.push(id);
    save();
  }
}

export function incrementAttempts() {
  progress.attempts = (progress.attempts || 0) + 1;
  save();
}

export function resetProgress() {
  progress = { ...defaultProgress };
  save();
}

export function hydrateProgress(next) {
  progress = {
    ...defaultProgress,
    ...next,
    foundClues: Array.isArray(next.foundClues) ? next.foundClues : [],
  };
  save();
}
