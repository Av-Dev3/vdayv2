export function mountClickOpen(container, ctx) {
  const el = document.createElement("section");
  el.className = "scene";
  container.appendChild(el);
  ctx.goTo("cardopen");
  return () => {};
}
