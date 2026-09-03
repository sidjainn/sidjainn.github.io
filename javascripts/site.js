(function () {
  var media = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');

  function hasOverride() {
    try { return !!localStorage.getItem('theme'); } catch (e) { return false; }
  }

  if (media && media.addEventListener) {
    media.addEventListener('change', function (e) {
      if (hasOverride()) return;
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    });
  }

  var toggle = document.getElementById('theme-toggle');
  if (!toggle) return;
  toggle.addEventListener('click', function () {
    var current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    var next = current === 'dark' ? 'light' : 'dark';
    var systemDark = media && media.matches;
    var systemTheme = systemDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try {
      if (next === systemTheme) {
        localStorage.removeItem('theme');
      } else {
        localStorage.setItem('theme', next);
      }
    } catch (e) {}
  });
})();

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

(function () {
  // Stories data lives in /javascripts/stories.js (window.STORIES).
  var STORIES = (typeof window !== 'undefined' && Array.isArray(window.STORIES)) ? window.STORIES : [];

  var trigger = document.getElementById('profile-story-trigger');
  var viewer = document.getElementById('stories-viewer');
  if (!trigger || !viewer) return;
  if (STORIES.length === 0) {
    trigger.classList.add('is-empty');
    trigger.setAttribute('aria-disabled', 'true');
    trigger.setAttribute('tabindex', '-1');
    return;
  }

  var stage = document.getElementById('stories-stage');
  var progress = document.getElementById('stories-progress');
  var timeEl = document.getElementById('stories-time');
  var slides = [];
  var idx = 0;
  var paused = false;
  var advanceTimer = null;
  // Seen is keyed by content fingerprint so editing the array doesn't carry stale "seen" marks.
  var SEEN_KEY = 'stories.seen.v2';

  function emit(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
  }

  function fingerprint(story) {
    return story.type + '|' + (story.src || story.embed || story.url || story.question || '');
  }

  function getSeen() {
    try {
      var raw = localStorage.getItem(SEEN_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }

  function setSeen(list) {
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(list)); } catch (e) {}
  }

  function markSeen(i) {
    var fp = fingerprint(STORIES[i]);
    var seen = getSeen();
    if (seen.indexOf(fp) === -1) {
      seen.push(fp);
      setSeen(seen);
    }
    refreshSeenClass();
  }

  function refreshSeenClass() {
    var seen = getSeen();
    var allSeen = STORIES.every(function (s) { return seen.indexOf(fingerprint(s)) !== -1; });
    trigger.classList.toggle('is-seen', allSeen);
  }

  refreshSeenClass();

  function buildSlide(story) {
    var slide = document.createElement('div');
    slide.className = 'stories-slide kind-' + story.type;

    if (story.type === 'image') {
      var img = document.createElement('img');
      img.src = story.src;
      img.alt = story.caption || '';
      slide.appendChild(img);
      if (story.caption) {
        var cap = document.createElement('div');
        cap.className = 'caption';
        cap.textContent = story.caption;
        slide.appendChild(cap);
      }
    } else if (story.type === 'video') {
      if (story.embed) {
        var iframe = document.createElement('iframe');
        iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
        iframe.allowFullscreen = true;
        iframe.dataset.embed = story.embed;
        slide.appendChild(iframe);
      } else if (story.src) {
        var video = document.createElement('video');
        video.src = story.src;
        video.muted = true;
        video.playsInline = true;
        video.preload = 'metadata';
        slide.appendChild(video);
      }

      var unmuteBtn = document.createElement('button');
      unmuteBtn.type = 'button';
      unmuteBtn.className = 'stories-unmute is-muted';
      unmuteBtn.setAttribute('aria-label', 'Unmute');
      unmuteBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" class="ic-muted" d="M3 9v6h4l5 5V4L7 9H3zm13.59 3L19 14.41 17.59 16 15 13.41 12.41 16 11 14.59 13.59 12 11 9.41 12.41 8 15 10.59 17.59 8 19 9.41 16.59 12z"/><path fill="currentColor" class="ic-on" d="M3 9v6h4l5 5V4L7 9H3zm11.5 3a4.5 4.5 0 0 0-2.5-4.03v8.05A4.5 4.5 0 0 0 14.5 12zM12 3.23v2.06A6.99 6.99 0 0 1 17 12a6.99 6.99 0 0 1-5 6.71v2.06A9 9 0 0 0 21 12 9 9 0 0 0 12 3.23z"/></svg><span class="label">Tap for sound</span>';
      unmuteBtn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var on = unmuteBtn.classList.toggle('is-muted') === false;
        var v = slide.querySelector('video');
        var f = slide.querySelector('iframe');
        if (v) { v.muted = !on; }
        if (f && f.contentWindow) {
          f.contentWindow.postMessage(JSON.stringify({ event: 'command', func: on ? 'unMute' : 'mute', args: [] }), '*');
        }
        unmuteBtn.setAttribute('aria-label', on ? 'Mute' : 'Unmute');
        if (on) {
          paused = true;
          pauseProgress();
        } else {
          paused = false;
          resumeProgress();
        }
      });
      slide.appendChild(unmuteBtn);
    } else if (story.type === 'link') {
      var a = document.createElement('a');
      a.className = 'stories-link-card';
      a.href = story.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      if (story.image) {
        var li = document.createElement('img');
        li.src = story.image;
        li.alt = '';
        a.appendChild(li);
      }
      if (story.eyebrow) {
        var e = document.createElement('span');
        e.className = 'stories-link-eyebrow';
        e.textContent = story.eyebrow;
        a.appendChild(e);
      }
      var t = document.createElement('h3');
      t.className = 'stories-link-title';
      t.textContent = story.title || '';
      a.appendChild(t);
      if (story.desc) {
        var d = document.createElement('p');
        d.className = 'stories-link-desc';
        d.textContent = story.desc;
        a.appendChild(d);
      }
      var cta = document.createElement('span');
      cta.className = 'stories-link-cta';
      cta.textContent = (story.cta || 'Open') + ' →';
      a.appendChild(cta);
      // Click on the card should not advance to next; stop propagation.
      a.addEventListener('click', function (ev) { ev.stopPropagation(); });
      slide.appendChild(a);
    } else if (story.type === 'interactive') {
      var q = document.createElement('h3');
      q.className = 'stories-poll-question';
      q.textContent = story.question || '';
      slide.appendChild(q);

      var opts = document.createElement('div');
      opts.className = 'stories-poll-options';
      var pollKey = 'stories.poll.' + (story.question || Math.random());
      var votes = {};
      try {
        var raw = localStorage.getItem(pollKey);
        if (raw) votes = JSON.parse(raw);
      } catch (e2) {}

      function renderVotes(pickedIdx) {
        var total = 0;
        (story.options || []).forEach(function (_, i) { total += (votes[i] || 0); });
        Array.prototype.slice.call(opts.children).forEach(function (btn, i) {
          var count = votes[i] || 0;
          var pct = total > 0 ? Math.round((count / total) * 100) : 0;
          btn.style.setProperty('--pct', pct + '%');
          btn.classList.toggle('is-voted', total > 0);
          if (i === pickedIdx) btn.classList.add('is-picked');
          var pctEl = btn.querySelector('.pct');
          if (pctEl) pctEl.textContent = pct + '%';
        });
      }

      (story.options || []).forEach(function (label, i) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'stories-poll-option';
        btn.innerHTML = '<span class="bar"></span><span class="label"></span><span class="pct"></span>';
        btn.querySelector('.label').textContent = label;
        btn.addEventListener('click', function (ev) {
          ev.stopPropagation();
          votes[i] = (votes[i] || 0) + 1;
          try { localStorage.setItem(pollKey, JSON.stringify(votes)); } catch (e3) {}
          renderVotes(i);
          emit('site:story-poll-vote', {
            question: story.question || '',
            option: label,
            optionIndex: i
          });
          paused = true;
          pauseProgress();
        });
        opts.appendChild(btn);
      });
      slide.appendChild(opts);
      renderVotes(-1);

      if (story.hint) {
        var h = document.createElement('div');
        h.className = 'stories-poll-hint';
        h.textContent = story.hint;
        slide.appendChild(h);
      }
    }

    return slide;
  }

  function buildProgress() {
    progress.innerHTML = '';
    STORIES.forEach(function () {
      var bar = document.createElement('div');
      bar.className = 'stories-progress-bar';
      bar.innerHTML = '<span class="fill"></span>';
      progress.appendChild(bar);
    });
  }

  function clearTimers() {
    if (advanceTimer) {
      clearTimeout(advanceTimer);
      advanceTimer = null;
    }
  }

  function pauseProgress() {
    var bar = progress.children[idx];
    if (bar) bar.classList.add('is-paused');
    if (!pausedAt) pausedAt = Date.now();
    clearTimers();
  }

  function resumeProgress() {
    var bar = progress.children[idx];
    if (bar) bar.classList.remove('is-paused');
    if (pausedAt) {
      slideStartedAt += Date.now() - pausedAt;
      pausedAt = 0;
    }
    scheduleAdvance(remainingMs());
  }

  var slideStartedAt = 0;
  var currentDuration = 0;
  var pausedAt = 0;

  function remainingMs() {
    var ref = pausedAt || Date.now();
    var elapsed = ref - slideStartedAt;
    return Math.max(200, currentDuration - elapsed);
  }

  function scheduleAdvance(ms) {
    clearTimers();
    advanceTimer = setTimeout(function () { go(idx + 1); }, ms);
  }

  function go(nextIdx) {
    if (nextIdx >= STORIES.length) { close('completed'); return; }
    if (nextIdx < 0) nextIdx = 0;
    markSeen(nextIdx);

    clearTimers();

    // Stop any video from previous slide.
    Array.prototype.slice.call(stage.querySelectorAll('video')).forEach(function (v) { try { v.pause(); v.currentTime = 0; } catch (e) {} });
    Array.prototype.slice.call(stage.querySelectorAll('iframe')).forEach(function (f) { f.src = 'about:blank'; });

    // Progress bars: mark prior done, reset later, animate current.
    Array.prototype.slice.call(progress.children).forEach(function (bar, i) {
      bar.classList.remove('is-active', 'is-paused', 'is-done');
      var fill = bar.querySelector('.fill');
      if (fill) { fill.style.animation = 'none'; fill.offsetWidth; fill.style.animation = ''; }
      if (i < nextIdx) bar.classList.add('is-done');
    });

    // Show slide.
    slides.forEach(function (s, i) { s.classList.toggle('is-active', i === nextIdx); });
    var story = STORIES[nextIdx];
    var slide = slides[nextIdx];

    // Hydrate iframe (so it doesn't preload all videos at once).
    var pendingIframe = slide.querySelector('iframe[data-embed]');
    if (pendingIframe) {
      pendingIframe.src = pendingIframe.dataset.embed;
    }
    var v = slide.querySelector('video');
    if (v) { try { v.currentTime = 0; v.play(); } catch (e) {} }

    var bar = progress.children[nextIdx];
    var dur = story.duration || 5000;
    currentDuration = dur;
    slideStartedAt = Date.now();
    pausedAt = 0;
    if (bar) {
      bar.style.setProperty('--dur', dur + 'ms');
      bar.classList.add('is-active');
    }
    if (timeEl) timeEl.textContent = story.time ? '· ' + story.time : '';

    idx = nextIdx;
    paused = false;
    scheduleAdvance(dur);

    emit('site:story-slide', {
      index: nextIdx,
      total: STORIES.length,
      type: story.type,
      key: fingerprint(story),
      slide: slide
    });
  }

  function open(startAt) {
    if (slides.length === 0) {
      buildProgress();
      STORIES.forEach(function (s) {
        var slide = buildSlide(s);
        slides.push(slide);
        stage.appendChild(slide);
      });
    }
    viewer.hidden = false;
    document.body.style.overflow = 'hidden';
    emit('site:story-open', { total: STORIES.length });
    go(typeof startAt === 'number' ? startAt : 0);
  }

  function close(reason) {
    emit('site:story-close', {
      index: idx,
      total: STORIES.length,
      reason: reason === 'completed' ? 'completed' : 'dismissed'
    });
    clearTimers();
    viewer.hidden = true;
    document.body.style.overflow = '';
    Array.prototype.slice.call(stage.querySelectorAll('video')).forEach(function (v) { try { v.pause(); } catch (e) {} });
    Array.prototype.slice.call(stage.querySelectorAll('iframe')).forEach(function (f) { f.src = 'about:blank'; });
    Array.prototype.slice.call(progress.children).forEach(function (bar) {
      bar.classList.remove('is-active', 'is-paused');
    });
  }

  trigger.addEventListener('click', function () { open(0); });

  viewer.addEventListener('click', function (ev) {
    var target = ev.target;
    if (!target) return;
    if (target.closest('[data-story-close]')) { close(); return; }
    if (target.closest('[data-story-prev]')) { go(idx - 1); return; }
    if (target.closest('[data-story-next]')) { go(idx + 1); return; }
  });

  // Hold to pause (pointer down on the frame, but not on close/nav buttons).
  var frame = viewer.querySelector('.stories-frame');
  function holdStart(ev) {
    if (ev.target.closest('[data-story-close]')) return;
    paused = true;
    pauseProgress();
  }
  function holdEnd() {
    if (!paused) return;
    paused = false;
    resumeProgress();
  }
  frame.addEventListener('pointerdown', holdStart);
  frame.addEventListener('pointerup', holdEnd);
  frame.addEventListener('pointercancel', holdEnd);
  frame.addEventListener('pointerleave', holdEnd);

  document.addEventListener('keydown', function (ev) {
    if (viewer.hidden) return;
    if (ev.key === 'Escape') { close(); }
    else if (ev.key === 'ArrowRight') { go(idx + 1); }
    else if (ev.key === 'ArrowLeft') { go(idx - 1); }
  });
})();

(function () {
  var links = Array.prototype.slice.call(document.querySelectorAll('.video-link[data-video]'));
  if (links.length === 0) return;

  var canHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!canHover) return;

  var card = null;
  var hideTimer = null;

  function build(id) {
    var el = document.createElement('div');
    el.className = 'video-preview';
    el.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + id +
      '?autoplay=1&mute=1&rel=0&modestbranding=1" title="Video preview" frameborder="0" ' +
      'allow="autoplay; encrypted-media" allowfullscreen></iframe>';
    el.addEventListener('mouseenter', function () { clearTimeout(hideTimer); });
    el.addEventListener('mouseleave', hide);
    return el;
  }

  function place(link) {
    var rect = link.getBoundingClientRect();
    var width = card.offsetWidth;
    var height = card.offsetHeight;
    var left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    var top = rect.top - height - 10;
    if (top < 8) top = rect.bottom + 10;
    card.style.left = left + 'px';
    card.style.top = top + 'px';
  }

  function show(link) {
    clearTimeout(hideTimer);
    hide();
    card = build(link.getAttribute('data-video'));
    document.body.appendChild(card);
    place(link);
    requestAnimationFrame(function () { if (card) card.classList.add('is-visible'); });
  }

  function hide() {
    if (!card) return;
    card.parentNode.removeChild(card);
    card = null;
  }

  links.forEach(function (link) {
    link.addEventListener('mouseenter', function () { show(link); });
    link.addEventListener('mouseleave', function () {
      hideTimer = setTimeout(hide, 200);
    });
    link.addEventListener('focus', function () { show(link); });
    link.addEventListener('blur', hide);
  });

  window.addEventListener('scroll', hide, true);
  window.addEventListener('resize', hide);
})();

/* Shareable links. #how-i-ai and #shape-of-work scroll on their own.
   #resume downloads the PDF and leaves the visitor on the homepage. */
(function () {
  var RESUME_URL = 'https://drive.google.com/uc?export=download&id=1fMnTC6_p7BLP6cyzfP2PfacA3K_P1hFA';
  if (window.location.hash !== '#resume') return;

  // Drop the hash so the URL reads as the plain homepage and a reload does not download again.
  history.replaceState(null, '', window.location.pathname + window.location.search);

  // The file is served as an attachment, so loading it in a hidden frame
  // starts the download and never navigates the homepage away.
  var frame = document.createElement('iframe');
  frame.hidden = true;
  frame.src = RESUME_URL;
  document.body.appendChild(frame);
})();
