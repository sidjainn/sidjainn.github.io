(function () {
  var carousel = document.querySelector('.auroville-carousel');
  if (!carousel) return;

  var quotes = Array.prototype.slice.call(carousel.querySelectorAll('.auroville-quote'));
  var dots = Array.prototype.slice.call(carousel.querySelectorAll('.auroville-dot'));
  if (quotes.length === 0) return;

  var current = 0;
  var AUTO_MS = 7000;
  var RESUME_MS = 15000;
  var autoTimer = null;
  var resumeTimer = null;
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setActive(next) {
    if (next === current) return;
    var prev = current;
    quotes[prev].classList.remove('is-active');
    quotes[prev].classList.add('is-prev');
    quotes[next].classList.remove('is-prev');
    quotes[next].classList.add('is-active');

    if (dots[prev]) dots[prev].classList.remove('is-active');
    if (dots[next]) dots[next].classList.add('is-active');

    setTimeout(function () {
      quotes[prev].classList.remove('is-prev');
    }, 700);

    current = next;
  }

  function next() {
    setActive((current + 1) % quotes.length);
  }

  function startAuto() {
    stopAuto();
    if (reducedMotion) return;
    autoTimer = setInterval(next, AUTO_MS);
  }

  function stopAuto() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  }

  function pauseThenResume() {
    stopAuto();
    if (resumeTimer) clearTimeout(resumeTimer);
    resumeTimer = setTimeout(function () {
      resumeTimer = null;
      startAuto();
    }, RESUME_MS);
  }

  dots.forEach(function (dot) {
    dot.addEventListener('click', function () {
      var idx = parseInt(dot.getAttribute('data-idx'), 10);
      if (isNaN(idx)) return;
      setActive(idx);
      pauseThenResume();
    });
  });

  carousel.addEventListener('mouseenter', stopAuto);
  carousel.addEventListener('mouseleave', function () {
    if (!resumeTimer) startAuto();
  });

  startAuto();
})();
