(() => {
  const TOTAL_FRAMES = 118;
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });

  // Preloaded image cache
  const images = new Array(TOTAL_FRAMES);
  let currentFrameIndex = -1;

  function padZero(num, size = 3) {
    let s = String(num);
    while (s.length < size) s = '0' + s;
    return s;
  }

  function getFrameSrc(index) {
    return `frames/ezgif-frame-${padZero(index + 1, 3)}.jpg?v=clean`;
  }

  // Configure high-DPI crisp canvas sizing
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (currentFrameIndex >= 0) {
      drawFrame(currentFrameIndex);
    }
  }

  // Draw image to cover canvas while preserving 16:9 aspect ratio (centered)
  function drawImageCover(img) {
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    const canvasRatio = cw / ch;
    const imgRatio = iw / ih;

    let dw, dh, ox, oy;
    if (canvasRatio > imgRatio) {
      dw = cw;
      dh = cw / imgRatio;
      ox = 0;
      oy = (ch - dh) / 2;
    } else {
      dw = ch * imgRatio;
      dh = ch;
      ox = (cw - dw) / 2;
      oy = 0;
    }

    ctx.drawImage(img, ox, oy, dw, dh);
  }

  // Render specific frame, falling back to nearest loaded frame to eliminate flicker
  function drawFrame(index) {
    if (images[index] && images[index].complete && images[index].naturalWidth > 0) {
      drawImageCover(images[index]);
      currentFrameIndex = index;
      return;
    }

    // Fallback to nearest loaded frame
    for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
      const prev = index - offset;
      const next = index + offset;
      if (prev >= 0 && images[prev] && images[prev].complete && images[prev].naturalWidth > 0) {
        drawImageCover(images[prev]);
        return;
      }
      if (next < TOTAL_FRAMES && images[next] && images[next].complete && images[next].naturalWidth > 0) {
        drawImageCover(images[next]);
        return;
      }
    }
  }

  // Preload all frames in memory with background GPU decoding
  function preloadImages() {
    // 1. Immediately load and draw frame 0 for instant visual response
    const firstImg = new Image();
    firstImg.src = getFrameSrc(0);
    images[0] = firstImg;
    firstImg.onload = () => {
      if (currentFrameIndex === -1) {
        drawFrame(0);
      }
    };

    // 2. Preload remaining 117 frames in parallel
    for (let i = 1; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = getFrameSrc(i);
      images[i] = img;

      if (img.decode) {
        img.decode().catch(() => {});
      }
    }
  }

  // Smooth scroll and momentum physics
  let targetScrollY = window.scrollY;
  let currentScrollY = window.scrollY;
  let isWheelActive = false;
  let lastWheelTime = 0;
  const ease = 0.08; // Butter-smooth momentum factor

  function getMaxScroll() {
    return Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  }

  // Intercept wheel events for momentum smoothing on discrete mice
  window.addEventListener('wheel', (e) => {
    if (e.ctrlKey) return; // Allow browser zoom
    e.preventDefault();

    lastWheelTime = performance.now();
    isWheelActive = true;

    let delta = e.deltaY;
    if (e.deltaMode === 1) delta *= 40; // Lines mode
    else if (e.deltaMode === 2) delta *= window.innerHeight; // Pages mode

    const maxScroll = getMaxScroll();
    targetScrollY = Math.max(0, Math.min(maxScroll, targetScrollY + delta));
  }, { passive: false });

  // Handle native scroll updates (scrollbar dragging, touch, keyboard)
  window.addEventListener('scroll', () => {
    if (!isWheelActive) {
      targetScrollY = window.scrollY;
    }
  }, { passive: true });

  window.addEventListener('touchstart', () => {
    isWheelActive = false;
    targetScrollY = window.scrollY;
    currentScrollY = window.scrollY;
  }, { passive: true });

  window.addEventListener('touchmove', () => {
    if (!isWheelActive) {
      targetScrollY = window.scrollY;
    }
  }, { passive: true });

  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    const step = 120;
    const pageStep = window.innerHeight * 0.8;
    const maxScroll = getMaxScroll();

    switch (e.key) {
      case 'ArrowDown':
        isWheelActive = true;
        lastWheelTime = performance.now();
        targetScrollY = Math.min(maxScroll, targetScrollY + step);
        e.preventDefault();
        break;
      case 'ArrowUp':
        isWheelActive = true;
        lastWheelTime = performance.now();
        targetScrollY = Math.max(0, targetScrollY - step);
        e.preventDefault();
        break;
      case 'PageDown':
      case ' ':
        isWheelActive = true;
        lastWheelTime = performance.now();
        targetScrollY = Math.min(maxScroll, targetScrollY + pageStep);
        e.preventDefault();
        break;
      case 'PageUp':
        isWheelActive = true;
        lastWheelTime = performance.now();
        targetScrollY = Math.max(0, targetScrollY - pageStep);
        e.preventDefault();
        break;
      case 'Home':
        isWheelActive = true;
        lastWheelTime = performance.now();
        targetScrollY = 0;
        e.preventDefault();
        break;
      case 'End':
        isWheelActive = true;
        lastWheelTime = performance.now();
        targetScrollY = maxScroll;
        e.preventDefault();
        break;
    }
  });

  // Main animation / render loop
  function loop() {
    const maxScroll = getMaxScroll();
    const now = performance.now();

    if (isWheelActive) {
      const diff = targetScrollY - currentScrollY;
      if (Math.abs(diff) > 0.05) {
        currentScrollY += diff * ease;
      } else {
        currentScrollY = targetScrollY;
        if (now - lastWheelTime > 150) {
          isWheelActive = false;
        }
      }
      window.scrollTo(0, currentScrollY);
    } else {
      const diff = window.scrollY - currentScrollY;
      if (Math.abs(diff) > 0.05) {
        currentScrollY += diff * ease;
      } else {
        currentScrollY = window.scrollY;
      }
      targetScrollY = currentScrollY;
    }

    // Map interpolated scroll position to frame index
    const progress = Math.max(0, Math.min(1, currentScrollY / maxScroll));
    const targetFrame = Math.min(TOTAL_FRAMES - 1, Math.round(progress * (TOTAL_FRAMES - 1)));

    if (targetFrame !== currentFrameIndex) {
      drawFrame(targetFrame);
    }

    requestAnimationFrame(loop);
  }

  // Responsive event handlers
  window.addEventListener('resize', resizeCanvas, { passive: true });
  window.addEventListener('orientationchange', resizeCanvas, { passive: true });

  // Start initialization
  resizeCanvas();
  preloadImages();
  requestAnimationFrame(loop);
})();
