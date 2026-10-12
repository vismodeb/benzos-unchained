// Coaching checkout links (systeme.io order forms, paid through Stripe).
// Paste each package's order form URL here. The price is set on the order
// form in systeme.io, so Stripe charges the right amount for each package.
// Buttons whose URL is still empty keep their placeholder link.
var CHECKOUT_LINKS = {
  "1-session": "", // $297
  "4-sessions": "", // $1,010
  "10-sessions": "", // $2,376
};

document.addEventListener("DOMContentLoaded", function () {
  // Footer copyright year
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  // Point coaching package buttons at their checkout page
  document.querySelectorAll("[data-checkout]").forEach(function (el) {
    var url = CHECKOUT_LINKS[el.dataset.checkout];
    if (url) el.href = url;
  });
});
