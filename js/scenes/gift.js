export function mountGift(container) {
  const el = document.createElement("section");
  el.className = "scene";
  el.innerHTML = `
    <div class="panel final-card">
      <h1>For You</h1>
      <p>Thank you for every laugh, every adventure, every quiet moment.</p>
      <p><strong>Your gift is waiting:</strong></p>
      <p>Inside the top drawer of the nightstand, wrapped in a ribbon.</p>
    </div>
  `;

  container.appendChild(el);
  return () => {};
}
