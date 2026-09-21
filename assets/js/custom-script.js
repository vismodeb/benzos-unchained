document.addEventListener("DOMContentLoaded", function () {
  // Footer copyright year
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
});
