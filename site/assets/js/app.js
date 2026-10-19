// Minimal progressive enhancement for local click-through only.
// Every state required for Figma import already exists as its own static route;
// this script only makes local browsing feel a little more alive.
document.querySelectorAll(".field-select").forEach((el) => {
  el.addEventListener("click", () => el.classList.toggle("is-open"));
});
