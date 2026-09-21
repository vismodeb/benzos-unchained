// Hero video player.
//  - autoplays muted when the visitor arrives
//  - the FIRST click on the picture turns the sound on and keeps playing
//  - after that it behaves like any video: click = play / pause, seek bar,
//    volume, full screen, keyboard shortcuts, double-click for full screen
// Loaded BEFORE jQuery in index.html (like scroll-animations.js) so it responds
// immediately instead of waiting for the CDN download.
(function () {
  var card = document.querySelector("[data-video-card]");
  if (!card) return;
  var video = card.querySelector("video");
  var pick = function (name) {
    return card.querySelector("[data-video-" + name + "]");
  };
  var surface = pick("surface");
  var controls = pick("controls");
  var playBtn = pick("play");
  var muteBtn = pick("mute");
  var seek = pick("seek");
  var volume = pick("volume");
  var fsBtn = pick("fullscreen");
  var curEl = pick("current");
  var durEl = pick("duration");
  if (!video || !surface || !controls) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var autoMuted = true; // silent only because of autoplay; the first click ends that
  var engaged = false; // the visitor has used the player: from now on it is a normal video
  var scrubbing = false;
  var overControls = false;
  var idleTimer, flashTimer, raf;

  // ---------------------------------------------------------------- helpers
  function fmt(sec) {
    if (!isFinite(sec)) sec = 0;
    sec = Math.floor(sec);
    var s = sec % 60;
    return Math.floor(sec / 60) + ":" + (s < 10 ? "0" : "") + s;
  }

  function paint(input, fill, buffer) {
    input.style.setProperty("--fill", (fill * 100).toFixed(2) + "%");
    if (buffer !== undefined) {
      input.style.setProperty("--buffer", (buffer * 100).toFixed(2) + "%");
    }
  }

  function setMuted(muted) {
    video.muted = muted;
    if (!muted && video.volume === 0) video.volume = 0.6;
  }

  function play() {
    var attempt = video.play();
    // rejected when the browser refuses (autoplay blocked, decode error)
    if (attempt && attempt.catch) attempt.catch(render);
  }

  function togglePlay() {
    if (video.paused || video.ended) play();
    else video.pause();
  }

  function flash(icon) {
    card.setAttribute("data-icon", icon);
    card.classList.add("is-flash");
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function () {
      card.classList.remove("is-flash");
    }, 800);
  }

  // ---------------------------------------------------------------- progress
  function progress() {
    // cheap; runs every frame while playing so the bar moves smoothly
    var d = video.duration;
    var ratio = d ? Math.min(video.currentTime / d, 1) : 0;
    if (!scrubbing) {
      seek.value = ratio * 1000;
      paint(seek, ratio);
    }
  }

  function times() {
    var d = video.duration || 0;
    var t = video.currentTime || 0;
    curEl.textContent = fmt(t);
    durEl.textContent = fmt(d);
    seek.setAttribute("aria-valuetext", fmt(t) + " of " + fmt(d));
    var buffered = 0;
    if (d && video.buffered.length) {
      buffered = Math.min(video.buffered.end(video.buffered.length - 1) / d, 1);
    }
    paint(seek, d ? Math.min(t / d, 1) : 0, buffered);
  }

  function loop() {
    progress();
    raf = !video.paused && !video.ended ? requestAnimationFrame(loop) : 0;
  }

  // ------------------------------------------------------------------ state
  function render() {
    if (video.error) {
      // file missing / undecodable: CSS hides the player UI, the poster stays
      card.setAttribute("data-state", "error");
      return;
    }
    var playing = !video.paused && !video.ended;
    var silent = video.muted || video.volume === 0;

    card.setAttribute("data-state", playing ? "playing" : "paused");
    card.setAttribute("data-muted", silent ? "true" : "false");
    card.setAttribute("data-sound-hint", autoMuted && video.muted ? "true" : "false");
    if (!playing) card.setAttribute("data-icon", "play");

    playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
    muteBtn.setAttribute("aria-label", silent ? "Unmute" : "Mute");

    var level = silent ? 0 : video.volume;
    volume.value = level;
    paint(volume, level, 0);

    if (playing && !raf) raf = requestAnimationFrame(loop);
    progress();
  }

  // ----------------------------------------------------------- control bar
  // The bar is shown while the visitor is active and fades away when idle.
  function showControls() {
    card.classList.add("is-active");
    clearTimeout(idleTimer);
    if (overControls || scrubbing) return;
    idleTimer = setTimeout(function () {
      card.classList.remove("is-active");
    }, 2600);
  }

  ["pointermove", "pointerdown", "focusin"].forEach(function (name) {
    card.addEventListener(name, showControls);
  });
  controls.addEventListener("pointerenter", function () {
    overControls = true;
    showControls();
  });
  controls.addEventListener("pointerleave", function () {
    overControls = false;
    showControls();
  });

  // ------------------------------------------------------------- the picture
  surface.addEventListener("click", function () {
    engaged = true;
    showControls();

    // First click while the autoplay is still silent: sound on, keep playing.
    if (autoMuted && video.muted) {
      autoMuted = false;
      setMuted(false);
      if (video.paused || video.ended) {
        flash("play");
        play();
      } else {
        flash("sound");
      }
      render();
      return;
    }

    if (video.paused || video.ended) {
      flash("play");
      play();
    } else {
      video.pause();
    }
  });

  surface.addEventListener("dblclick", toggleFullscreen);

  // ---------------------------------------------------------------- buttons
  playBtn.addEventListener("click", function () {
    engaged = true;
    togglePlay();
  });

  function toggleMute() {
    engaged = true;
    autoMuted = false;
    setMuted(!video.muted);
  }
  muteBtn.addEventListener("click", toggleMute);

  volume.addEventListener("input", function () {
    engaged = true;
    autoMuted = false;
    var level = parseFloat(volume.value);
    video.volume = level;
    video.muted = level === 0;
    paint(volume, level, 0);
  });

  // seek: dragging scrubs; the bar stops following the video while you hold it
  seek.addEventListener("input", function () {
    engaged = true;
    scrubbing = true;
    var ratio = seek.value / 1000;
    if (video.duration) video.currentTime = ratio * video.duration;
    paint(seek, ratio);
    curEl.textContent = fmt(video.currentTime);
    showControls();
  });
  ["change", "pointerup", "blur"].forEach(function (name) {
    seek.addEventListener(name, function () {
      scrubbing = false;
      showControls();
    });
  });

  // ------------------------------------------------------------- full screen
  function fsElement() {
    return document.fullscreenElement || document.webkitFullscreenElement;
  }

  function toggleFullscreen() {
    if (fsElement()) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      return;
    }
    var request = card.requestFullscreen || card.webkitRequestFullscreen;
    if (request) {
      var attempt = request.call(card);
      if (attempt && attempt.catch) attempt.catch(function () {});
    } else if (video.webkitEnterFullscreen) {
      video.webkitEnterFullscreen(); // iPhone Safari: its own native player
    }
  }

  function syncFullscreen() {
    var on = fsElement() === card;
    card.setAttribute("data-fullscreen", on ? "true" : "false");
    fsBtn.setAttribute("aria-label", on ? "Exit full screen" : "Full screen");
    showControls();
  }

  if (!(card.requestFullscreen || card.webkitRequestFullscreen || video.webkitEnterFullscreen)) {
    fsBtn.style.display = "none"; // nothing to offer on this browser
  }
  fsBtn.addEventListener("click", toggleFullscreen);
  document.addEventListener("fullscreenchange", syncFullscreen);
  document.addEventListener("webkitfullscreenchange", syncFullscreen);

  // -------------------------------------------------------------- keyboard
  // Space / K play-pause, arrows seek 5s + volume, M mute, F full screen.
  function skip(seconds) {
    engaged = true;
    if (video.duration) {
      video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
    }
  }

  function nudgeVolume(delta) {
    engaged = true;
    autoMuted = false;
    var level = Math.max(0, Math.min(1, (video.muted ? 0 : video.volume) + delta));
    video.volume = level;
    video.muted = level === 0;
  }

  card.addEventListener("keydown", function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var onButton = e.target.tagName === "BUTTON";
    var onVolume = e.target === volume;
    var handled = true;

    switch (e.key) {
      case " ":
        if (onButton) return; // the button's own click does it
        engaged = true;
        togglePlay();
        break;
      case "k":
      case "K":
        engaged = true;
        togglePlay();
        break;
      case "ArrowLeft":
        if (onVolume) return;
        skip(-5);
        break;
      case "ArrowRight":
        if (onVolume) return;
        skip(5);
        break;
      case "ArrowUp":
        if (onVolume) return;
        nudgeVolume(0.1);
        break;
      case "ArrowDown":
        if (onVolume) return;
        nudgeVolume(-0.1);
        break;
      case "m":
      case "M":
        toggleMute();
        break;
      case "f":
      case "F":
        toggleFullscreen();
        break;
      default:
        handled = false;
    }
    if (handled) {
      e.preventDefault();
      showControls();
    }
  });

  // ------------------------------------------------------- fit to the video
  // The card follows the video's own shape, so vertical shorts and landscape
  // clips both show completely (CSS reads --video-ratio and data-shape).
  function fit() {
    if (!video.videoWidth || !video.videoHeight) return;
    var ratio = video.videoWidth / video.videoHeight;
    card.style.setProperty("--video-ratio", ratio.toFixed(4));
    card.setAttribute("data-shape", ratio < 1 ? "portrait" : "landscape");
  }
  video.addEventListener("loadedmetadata", fit);
  if (video.readyState >= 1) fit();

  // ------------------------------------------------------------ media events
  ["loadedmetadata", "durationchange", "timeupdate", "progress", "seeked"].forEach(function (name) {
    video.addEventListener(name, times);
  });
  ["play", "playing", "pause", "ended", "volumechange", "error"].forEach(function (name) {
    video.addEventListener(name, render);
  });

  // ------------------------------------------------ autoplay + off-screen rule
  // Until the visitor touches the player it is just a silent, decorative
  // autoplay: pause it while it is off-screen (saves data / battery) and
  // resume when it is back. Once they engage, it is a normal video.
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (engaged || reduceMotion) return;
          if (entry.isIntersecting) {
            if (video.paused && !video.ended) play();
          } else if (!video.paused) {
            video.pause();
          }
        });
      },
      { threshold: 0.25 },
    ).observe(card);
  }

  times();
  showControls();
  if (reduceMotion) {
    // visitors who asked for reduced motion get no autoplay (they can still press play)
    video.pause();
    render();
  } else {
    play();
  }
})();
