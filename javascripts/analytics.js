/* PostHog custom events.

   The snippet in index.html already covers autocapture, heatmaps, scrollmaps,
   session replay, web vitals and exceptions. This file adds only what
   autocapture cannot see: how far down the page people actually read, what
   they do inside the stories player, and which clicks carry real intent.

   Loaded before site.js on purpose. The `#resume` share link has to be read
   here, because site.js strips that hash the moment it runs. */
(function () {
  'use strict';

  function track(name, props) {
    if (window.posthog && typeof window.posthog.capture === 'function') {
      window.posthog.capture(name, props || {});
    }
  }

  function text(el, max) {
    var limit = max || 80;
    var t = (el.textContent || '').replace(/\s+/g, ' ').trim();
    return t.length > limit ? t.slice(0, limit) : t;
  }

  function sectionOf(el) {
    if (!el || !el.closest) return 'Intro';
    var sec = el.closest('section.section, .footer-cta, .profile');
    if (!sec) return 'Intro';
    if (sec.classList.contains('profile')) return 'Profile';
    if (sec.classList.contains('footer-cta')) return 'Footer';
    var title = sec.querySelector('.section-title');
    return title ? text(title, 60) : 'Intro';
  }

  /* ---- How far people read ------------------------------------------- */

  (function () {
    if (!('IntersectionObserver' in window)) return;
    var sections = Array.prototype.slice.call(document.querySelectorAll('section.section'));
    if (sections.length === 0) return;

    var seen = {};
    // Counts as read when half the section is on screen, or when at least
    // 200px of a tall section is. No bottom rootMargin on purpose: the page
    // stops scrolling before the last sections could ever cross an offset
    // line, so a margin-based rule would never fire for them.
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var visible = entry.intersectionRect ? entry.intersectionRect.height : 0;
        if (entry.intersectionRatio < 0.5 && visible < 200) return;
        var el = entry.target;
        var titleEl = el.querySelector('.section-title');
        var name = titleEl ? text(titleEl, 60) : (el.id || 'untitled');
        if (seen[name]) return;
        seen[name] = true;
        track('section_viewed', { section: name, section_id: el.id || null });
        obs.unobserve(el);
      });
    }, { threshold: [0, 0.25, 0.5, 0.75, 1] });

    sections.forEach(function (s) { obs.observe(s); });
  })();

  /* ---- Which share link brought them ---------------------------------- */

  (function () {
    var hash = (window.location.hash || '').replace('#', '');
    if (!hash) return;
    var known = {
      'how-i-ai': 'How I AI',
      'shape-of-work': 'The shape of work I am built for',
      'resume': 'Resume'
    };
    if (!known[hash]) return;

    track('share_link_opened', { target: hash, target_label: known[hash] });
    if (window.posthog && typeof window.posthog.setPersonProperties === 'function') {
      window.posthog.setPersonProperties({}, { initial_share_link: hash });
    }
    if (hash === 'resume') {
      track('resume_downloaded', { source: 'share_link' });
    }
  })();

  /* ---- Clicks that matter --------------------------------------------- */

  // Capture phase, because a few handlers in site.js stop propagation.
  document.addEventListener('click', function (ev) {
    var target = ev.target;
    if (!target || !target.closest) return;
    var a = target.closest('a[href]');
    if (!a) return;

    var href = a.getAttribute('href') || '';
    var section = sectionOf(a);
    var label = text(a, 80);

    if (href.indexOf('drive.google.com') !== -1) {
      track('resume_downloaded', { source: 'footer_link', section: section });
      return;
    }

    var channel = null;
    if (href.indexOf('mailto:') === 0) channel = 'email';
    else if (href.indexOf('tel:') === 0) channel = 'phone';
    else if (href.indexOf('wa.me') !== -1) channel = 'whatsapp';
    else if (a.closest('.social-media')) {
      if (href.indexOf('linkedin.com') !== -1) channel = 'linkedin';
      else if (href.indexOf('github.com') !== -1) channel = 'github';
      else if (href.indexOf('x.com') !== -1) channel = 'x';
    } else if (a.closest('.footer-cta') && href.indexOf('linkedin.com') !== -1) {
      channel = 'linkedin';
    }
    if (channel) {
      track('contact_clicked', { channel: channel, section: section });
      return;
    }

    var videoId = a.getAttribute('data-video');
    if (videoId) {
      track('video_link_clicked', { video_id: videoId, section: section, link_text: label });
      return;
    }

    if (a.classList.contains('stories-link-card') || a.closest('.stories-link-card')) {
      track('story_link_clicked', { href: href, link_text: label });
      return;
    }

    if (/^https?:\/\//i.test(href)) {
      var host = '';
      try { host = new URL(href, window.location.href).hostname; } catch (e) {}
      if (host && host !== window.location.hostname) {
        track('outbound_link_clicked', {
          href: href, host: host, link_text: label, section: section
        });
      }
    }
  }, true);

  /* ---- Hover intent ---------------------------------------------------- */

  (function () {
    var canHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!canHover) return;

    var links = Array.prototype.slice.call(document.querySelectorAll('.video-link[data-video]'));
    var timer = null;
    links.forEach(function (link) {
      link.addEventListener('mouseenter', function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          track('video_preview_opened', {
            video_id: link.getAttribute('data-video'),
            section: sectionOf(link)
          });
        }, 600);
      });
      link.addEventListener('mouseleave', function () { clearTimeout(timer); });
    });
  })();

  (function () {
    // The WAU/MAU tooltip opens on pure CSS hover, so autocapture never sees it.
    var tip = document.querySelector('.sticky-tooltip');
    if (!tip) return;
    var fired = false;
    var timer = null;
    function start() {
      if (fired) return;
      timer = setTimeout(function () {
        fired = true;
        track('stickiness_chart_viewed', {});
      }, 400);
    }
    function stop() { clearTimeout(timer); }
    tip.addEventListener('mouseenter', start);
    tip.addEventListener('mouseleave', stop);
    tip.addEventListener('focus', start);
    tip.addEventListener('blur', stop);
  })();

  /* ---- Theme ----------------------------------------------------------- */

  (function () {
    var toggle = document.getElementById('theme-toggle');
    if (!toggle) return;
    toggle.addEventListener('click', function () {
      // Read after site.js has flipped the attribute.
      setTimeout(function () {
        track('theme_toggled', { theme: document.documentElement.getAttribute('data-theme') });
      }, 0);
    });
  })();

  /* ---- Real reading time ----------------------------------------------- */

  (function () {
    var THRESHOLD_MS = 30000;
    var visibleMs = 0;
    var since = document.visibilityState === 'visible' ? Date.now() : 0;
    var done = false;
    var timer = setInterval(function () {
      if (done) return;
      if (document.visibilityState === 'visible' && since) {
        visibleMs += Date.now() - since;
        since = Date.now();
        if (visibleMs >= THRESHOLD_MS) {
          done = true;
          clearInterval(timer);
          track('page_engaged', { seconds: Math.round(THRESHOLD_MS / 1000) });
        }
      }
    }, 1000);

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') {
        since = Date.now();
      } else {
        if (since) visibleMs += Date.now() - since;
        since = 0;
      }
    });
  })();

  /* ---- Stories --------------------------------------------------------- */

  // site.js dispatches these. The whole player is built in JS inside a modal,
  // so none of it reaches autocapture.

  document.addEventListener('site:story-open', function (ev) {
    track('story_opened', { total: ev.detail.total });
  });

  document.addEventListener('site:story-slide', function (ev) {
    var d = ev.detail;
    track('story_slide_viewed', {
      index: d.index,
      position: d.index + 1,
      total: d.total,
      story_type: d.type,
      story_key: d.key
    });
    wireStoryVideo(d.slide, d.key);
  });

  document.addEventListener('site:story-close', function (ev) {
    var d = ev.detail;
    var completed = d.reason === 'completed';
    track(completed ? 'story_completed' : 'story_closed', {
      index: d.index,
      position: d.index + 1,
      total: d.total,
      reason: d.reason
    });
    stopMilestones();
  });

  document.addEventListener('site:story-poll-vote', function (ev) {
    var d = ev.detail;
    track('story_poll_voted', {
      question: d.question,
      option: d.option,
      option_index: d.optionIndex
    });
  });

  document.addEventListener('click', function (ev) {
    if (!ev.target || !ev.target.closest) return;
    var btn = ev.target.closest('.stories-unmute');
    if (!btn) return;
    // Read after site.js has toggled the class.
    setTimeout(function () {
      track('story_video_unmuted', { now_unmuted: !btn.classList.contains('is-muted') });
    }, 0);
  }, true);

  /* ---- YouTube playback inside stories --------------------------------- */

  var ytState = 'idle';
  var ytWaiting = [];
  var players = window.WeakMap ? new WeakMap() : null;
  var milestoneTimer = null;

  function loadYouTubeApi(cb) {
    if (ytState === 'ready') { cb(); return; }
    ytWaiting.push(cb);
    if (ytState === 'loading') return;
    ytState = 'loading';

    var previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      if (typeof previous === 'function') previous();
      ytState = 'ready';
      ytWaiting.splice(0).forEach(function (fn) { fn(); });
    };

    var s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    document.head.appendChild(s);
  }

  function stopMilestones() {
    if (milestoneTimer) {
      clearInterval(milestoneTimer);
      milestoneTimer = null;
    }
  }

  function wireStoryVideo(slide, storyKey) {
    stopMilestones();
    if (!slide || !players) return;

    var iframe = slide.querySelector('iframe');
    if (!iframe) return;
    var src = iframe.getAttribute('src') || '';
    if (src.indexOf('youtube.com/embed/') === -1 || src.indexOf('enablejsapi=1') === -1) return;
    var videoId = (src.split('/embed/')[1] || '').split('?')[0];

    loadYouTubeApi(function () {
      if (!window.YT || !window.YT.Player) return;
      // The visitor may have moved on while the API was loading.
      if (!document.body.contains(iframe)) return;
      if ((iframe.getAttribute('src') || '') !== src) return;

      var marks = {};
      var played = false;
      var player;

      function onState(e) {
        if (!window.YT.PlayerState) return;
        if (e.data === window.YT.PlayerState.PLAYING && !played) {
          played = true;
          track('story_video_played', { video_id: videoId, story_key: storyKey });
        }
        if (e.data === window.YT.PlayerState.ENDED && !marks[100]) {
          marks[100] = true;
          track('story_video_completed', { video_id: videoId, story_key: storyKey });
        }
      }

      // getDuration and getCurrentTime only exist once the player reports ready,
      // so polling cannot start any earlier than this.
      function startMilestones() {
        stopMilestones();
        milestoneTimer = setInterval(function () {
          if (!player || typeof player.getDuration !== 'function') return;
          var dur = 0;
          var cur = 0;
          try {
            dur = player.getDuration();
            cur = player.getCurrentTime();
          } catch (e) { return; }
          if (!dur || !cur) return;
          var pct = (cur / dur) * 100;
          [25, 50, 75].forEach(function (m) {
            if (pct >= m && !marks[m]) {
              marks[m] = true;
              track('story_video_progress', {
                video_id: videoId, percent: m, story_key: storyKey
              });
            }
          });
        }, 500);
      }

      player = players.get(iframe);
      if (player) {
        // Same iframe seen before. Reuse it; destroying a YT player would rip
        // the iframe out of the slide and break the story on the next open.
        try {
          player.addEventListener('onStateChange', onState);
          player.addEventListener('onReady', startMilestones);
        } catch (e) {}
        if (typeof player.getDuration === 'function') startMilestones();
      } else {
        try {
          player = new window.YT.Player(iframe, {
            events: { onStateChange: onState, onReady: startMilestones }
          });
        } catch (e) {
          return;
        }
        players.set(iframe, player);
      }
    });
  }
})();
