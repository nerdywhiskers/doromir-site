// Landing-page motion: scroll reveals, and panning the tall screenshots inside
// their device frames.
//
// Both effects are decoration, and the page is authored so that neither one is
// load-bearing. Nothing here hides content — the CSS resting state is the visible
// state, and this file's first job is to *opt in* to the hidden state. If the file
// fails to parse, fails to run, or the visitor has asked for reduced motion, the
// page paints in full and simply does not move. See the "Motion" section of
// site.css for the other half of the contract.
(function () {
  'use strict';

  var root = document.documentElement;

  var reduceMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Arm before hide. `.reveal-armed` is what scopes `opacity: 0` onto `.reveal`
  // in the stylesheet, so until this line runs there is nothing to un-hide, and
  // there is no state a later failure can strand the page in.
  //
  // IntersectionObserver is the one API this depends on; without it every section
  // would stay hidden, so treat its absence the same as reduced motion.
  var canReveal = !reduceMotion && typeof IntersectionObserver === 'function';

  if (canReveal) {
    root.classList.add('reveal-armed');

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          // One-way. A section that has been read should not re-animate when the
          // visitor scrolls back up past it.
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.15,
        // Fire a little before the element is properly on screen, so the rise has
        // finished by the time it is in comfortable reading position.
        rootMargin: '0px 0px -10% 0px',
      }
    );

    var revealables = document.querySelectorAll('.reveal');
    for (var i = 0; i < revealables.length; i++) {
      observer.observe(revealables[i]);
    }
  }

  // ── Scroll-linked screenshot pan ──────────────────────────────────────────
  // Two of the four captures are full-scroll shots several times taller than the
  // 780:1688 window they sit in. Mapping the frame's travel across the viewport
  // onto the image's overflow makes the app appear to scroll itself, which shows
  // far more of the journal and insights screens than a crop could.
  //
  // Skipped entirely under reduced motion, leaving each image parked at its top —
  // which is exactly what the CSS already renders, so there is nothing to undo.
  if (reduceMotion) return;

  var shots = [].slice.call(document.querySelectorAll('[data-scrollshot]'));
  if (!shots.length) return;

  var frames = shots
    .map(function (frame) {
      var img = frame.querySelector('.phone-screen img');
      return img ? { screen: frame.querySelector('.phone-screen'), img: img } : null;
    })
    .filter(Boolean);

  var ticking = false;

  function update() {
    ticking = false;
    var viewport = window.innerHeight;

    frames.forEach(function (frame) {
      var box = frame.screen.getBoundingClientRect();
      // The image is width-constrained by the frame, so its rendered height comes
      // from the layout rather than the intrinsic attributes. Read it live —
      // it changes with viewport width.
      var overflow = frame.img.offsetHeight - box.height;
      if (overflow <= 0) return;

      // 0 when the frame's top edge first touches the bottom of the viewport,
      // 1 when its bottom edge leaves the top. Clamped, so a frame taller than
      // the viewport still resolves to a sane value at both ends.
      var travel = viewport + box.height;
      var progress = (viewport - box.top) / travel;
      progress = progress < 0 ? 0 : progress > 1 ? 1 : progress;

      // Ease the ends so the pan settles rather than stopping dead at the edges
      // of the section.
      var eased = progress * progress * (3 - 2 * progress);

      frame.img.style.transform = 'translateY(' + -(eased * overflow).toFixed(2) + 'px)';
    });
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  // The images are lazy-loaded; offsetHeight is 0 until each one decodes, so the
  // first correct measurement can only happen after load.
  window.addEventListener('load', update);
  update();
})();
