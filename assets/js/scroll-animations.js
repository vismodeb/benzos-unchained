// Scroll animations + parallax.
// Kept separate from custom-script.js and loaded BEFORE jQuery in index.html:
// DOMContentLoaded only fires after the CDN jQuery has downloaded, and until
// this script runs every [data-animate] element is hidden.
(function () {
  var root = document.documentElement;

  // ==========================================================================
  // Scroll animations
  // Elements marked data-animate get .is-visible when they scroll into view
  // (CSS in input.css does the actual motion) and lose it again once they are
  // completely off-screen, so the entrance plays every time you scroll to them.
  // ==========================================================================
  clearTimeout(window.__motionTimer); // main script is running: cancel the fail-safe

  // .motion-ok is only set when JS runs and the visitor allows motion
  if (!root.classList.contains("motion-ok")) return;
  if (!("IntersectionObserver" in window)) {
    root.classList.remove("motion-ok"); // show everything instead of hiding it
    return;
  }

  var REPLAY = true; // false = animate each element only the first time
  var STAGGER = 80; // ms between elements of one section that enter together
  var MAX_STEPS = 8; // cap so a big group never waits too long

  var items = document.querySelectorAll("[data-animate]");

  var reveal = new IntersectionObserver(
    function (entries) {
      // rows top-to-bottom, then left-to-right, so the stagger reads naturally
      var entering = entries
        .filter(function (entry) {
          return entry.isIntersecting;
        })
        .sort(function (a, b) {
          return (
            a.boundingClientRect.top - b.boundingClientRect.top ||
            a.boundingClientRect.left - b.boundingClientRect.left
          );
        });

      // The stagger restarts in every section, so after a big jump the content
      // you are looking at never waits behind items entering elsewhere.
      var counts = new Map();

      entering.forEach(function (entry) {
        var el = entry.target;
        var group = el.closest("section, footer") || document.body;
        var index = counts.get(group) || 0;
        counts.set(group, index + 1);

        var fixed = parseInt(el.getAttribute("data-delay"), 10);
        var delay = isNaN(fixed) ? Math.min(index, MAX_STEPS) * STAGGER : fixed;
        el.style.setProperty("--reveal-delay", delay + "ms");
        el.classList.add("is-visible");
        if (!REPLAY) reveal.unobserve(el);
      });
    },
    // fire a little after the element enters, so you actually see it happen
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
  );

  // Reset only when an element is fully out of view, so the reset is never seen.
  var reset = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) entry.target.classList.remove("is-visible");
      });
    },
    { threshold: 0 },
  );

  items.forEach(function (el) {
    reveal.observe(el);
    if (REPLAY) reset.observe(el);
  });

  // ==========================================================================
  // Parallax: [data-parallax="0.15"] drifts slower than the page while its
  // section is on screen. The element must be taller than its parent (see the
  // hero photo: h-[124%] -top-[12%]) so the extra height covers the movement.
  // ==========================================================================
  var layers = Array.prototype.slice.call(
    document.querySelectorAll("[data-parallax]"),
  );
  if (layers.length) {
    var ticking = false;

    var update = function () {
      ticking = false;
      var vh = window.innerHeight;
      layers.forEach(function (el) {
        var box = el.parentElement.getBoundingClientRect();
        if (box.bottom < 0 || box.top > vh) return; // not on screen
        var speed = parseFloat(el.getAttribute("data-parallax")) || 0.15;
        var room = Math.max(0, (el.offsetHeight - box.height) / 2);
        var offset = (vh / 2 - (box.top + box.height / 2)) * speed;
        var y = Math.max(-room, Math.min(room, offset));
        el.style.transform = "translate3d(0," + y.toFixed(1) + "px,0)";
      });
    };

    var onScroll = function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  }
})();
