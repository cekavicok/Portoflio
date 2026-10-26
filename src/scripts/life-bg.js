// Conway's Game of Life, rendered as a faint animated page background.
//
// The grid starts empty and stays silent until you move the mouse (or a
// finger on touch devices) - that seeds a small cluster of live cells
// under the pointer. From there, standard B3/S23 rules run everywhere on
// a fixed tick: seeded cells live, spread and die exactly like any other
// cell, nothing is pinned in place.
//
// The work per tick is proportional to how much of the grid is actually
// alive, not to the size of the screen:
//
//   - The grid carries a one-cell dead border, so the neighbour sum is
//     eight straight array reads with no bounds checks.
//   - Only the bounding box of live cells (grown by one) is scanned. A
//     dead cell needs three live neighbours to be born, so nothing
//     outside that margin can change.
//   - Only the pixels that were painted last tick get cleared.
//   - When the board empties, or settles into still lifes where no future
//     generation can differ, the animation loop stops entirely until the
//     pointer seeds something new.
//
// Respects prefers-reduced-motion (no autonomous animation loop - only
// discrete, input-driven redraws) and pauses while the tab is hidden.

const CELL_PX = 7; // css px per cell
const TICK_MS = 130; // one generation every 130ms
const SEED_RADIUS = 2; // cells; radius of the cluster seeded per move
const SEED_DENSITY = 0.55; // probability a cell within that radius is born
const SEED_THROTTLE_MS = 40; // minimum time between seed events
const CELL_ALPHA = 0.16; // opacity of a live cell - kept deliberately faint
const MAX_DPR = 2; // past 2x the extra pixels cost more than they show
const RESIZE_DEBOUNCE_MS = 150;

function hexToRgb(hex) {
  const h = hex.trim().replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function init() {
  const canvas = document.getElementById('life-bg');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  const animate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const rootStyle = getComputedStyle(document.documentElement);
  const bg = rootStyle.getPropertyValue('--bg').trim() || '#1c1b1a';
  const cellRgb = hexToRgb(rootStyle.getPropertyValue('--text-dim').trim() || '#a8a8a8');
  const cellFill = `rgba(${cellRgb.r}, ${cellRgb.g}, ${cellRgb.b}, ${CELL_ALPHA})`;

  // Cells live at x in [1, cols], y in [1, rows]; row 0, row rows+1 and
  // the two edge columns stay dead forever as the neighbour-sum border.
  let dpr = 1;
  let cols = 0;
  let rows = 0;
  let stride = 0; // cols + 2
  let current = new Uint8Array(0);
  let next = new Uint8Array(0);
  let liveCount = 0;

  // Bounding box of live cells. Empty when x1 < x0.
  const live = { x0: 1, y0: 1, x1: 0, y1: 0 };
  // What is currently painted on the canvas, so a tick clears only the
  // pixels it actually dirtied rather than the whole viewport.
  const painted = { x0: 1, y0: 1, x1: 0, y1: 0 };

  let rafId = null;
  let lastTick = 0;
  let lastSeed = 0;
  let resizeTimer = null;

  const isEmpty = (b) => b.x1 < b.x0 || b.y1 < b.y0;

  function clearBox(b) {
    b.x0 = 1;
    b.y0 = 1;
    b.x1 = 0;
    b.y1 = 0;
  }

  function growBox(b, x0, y0, x1, y1) {
    if (isEmpty(b)) {
      b.x0 = x0;
      b.y0 = y0;
      b.x1 = x1;
      b.y1 = y1;
      return;
    }
    if (x0 < b.x0) b.x0 = x0;
    if (y0 < b.y0) b.y0 = y0;
    if (x1 > b.x1) b.x1 = x1;
    if (y1 > b.y1) b.y1 = y1;
  }

  function eraseBox(b) {
    ctx.fillStyle = bg;
    ctx.fillRect(
      (b.x0 - 1) * CELL_PX,
      (b.y0 - 1) * CELL_PX,
      (b.x1 - b.x0 + 1) * CELL_PX,
      (b.y1 - b.y0 + 1) * CELL_PX
    );
  }

  // One path for every cell in the box beats one fillRect call each.
  function paintCells(x0, y0, x1, y1) {
    const size = CELL_PX - 1;
    ctx.fillStyle = cellFill;
    ctx.beginPath();
    for (let y = y0; y <= y1; y++) {
      const row = y * stride;
      const py = (y - 1) * CELL_PX;
      for (let x = x0; x <= x1; x++) {
        if (current[row + x]) ctx.rect((x - 1) * CELL_PX, py, size, size);
      }
    }
    ctx.fill();
  }

  function drawFrame() {
    if (!isEmpty(painted)) eraseBox(painted);
    clearBox(painted);
    if (isEmpty(live)) return;
    paintCells(live.x0, live.y0, live.x1, live.y1);
    growBox(painted, live.x0, live.y0, live.x1, live.y1);
  }

  // Returns false when the next generation is identical to this one.
  function step() {
    if (liveCount === 0) return false;

    const x0 = Math.max(1, live.x0 - 1);
    const y0 = Math.max(1, live.y0 - 1);
    const x1 = Math.min(cols, live.x1 + 1);
    const y1 = Math.min(rows, live.y1 + 1);

    next.fill(0); // a memset, far cheaper than clearing cell by cell

    let changed = false;
    let count = 0;
    let nx0 = cols;
    let ny0 = rows;
    let nx1 = 1;
    let ny1 = 1;

    for (let y = y0; y <= y1; y++) {
      const row = y * stride;
      const up = row - stride;
      const down = row + stride;
      for (let x = x0; x <= x1; x++) {
        const i = row + x;
        const n =
          current[up + x - 1] +
          current[up + x] +
          current[up + x + 1] +
          current[i - 1] +
          current[i + 1] +
          current[down + x - 1] +
          current[down + x] +
          current[down + x + 1];
        const was = current[i];
        const born = was ? (n === 2 || n === 3 ? 1 : 0) : n === 3 ? 1 : 0;
        if (born !== was) changed = true;
        if (born) {
          next[i] = 1;
          count++;
          if (x < nx0) nx0 = x;
          if (x > nx1) nx1 = x;
          if (y < ny0) ny0 = y;
          if (y > ny1) ny1 = y;
        }
      }
    }

    const swap = current;
    current = next;
    next = swap;
    liveCount = count;

    if (count > 0) {
      live.x0 = nx0;
      live.y0 = ny0;
      live.x1 = nx1;
      live.y1 = ny1;
    } else {
      clearBox(live);
    }

    return changed;
  }

  function loop(ts) {
    rafId = requestAnimationFrame(loop);
    if (ts - lastTick < TICK_MS) return;
    lastTick = ts;
    const changed = step();
    drawFrame();
    // Empty board, or a pattern that just reproduced itself exactly: no
    // later generation can differ either, so stop burning frames until
    // the pointer seeds something new.
    if (liveCount === 0 || !changed) stop();
  }

  function start() {
    if (rafId != null || !animate) return;
    lastTick = performance.now() - TICK_MS;
    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    if (rafId != null) cancelAnimationFrame(rafId);
    rafId = null;
  }

  function seedAt(clientX, clientY) {
    const cx = Math.floor(clientX / CELL_PX) + 1;
    const cy = Math.floor(clientY / CELL_PX) + 1;
    const x0 = Math.max(1, cx - SEED_RADIUS);
    const y0 = Math.max(1, cy - SEED_RADIUS);
    const x1 = Math.min(cols, cx + SEED_RADIUS);
    const y1 = Math.min(rows, cy + SEED_RADIUS);
    if (x1 < x0 || y1 < y0) return;

    let added = false;
    for (let y = y0; y <= y1; y++) {
      const row = y * stride;
      for (let x = x0; x <= x1; x++) {
        const i = row + x;
        if (!current[i] && Math.random() < SEED_DENSITY) {
          current[i] = 1;
          liveCount++;
          added = true;
        }
      }
    }
    if (!added) return;

    growBox(live, x0, y0, x1, y1);
    // Paint the new cells immediately so the trail tracks the pointer
    // instead of lagging up to a full tick behind it. This is also what
    // keeps the effect alive under prefers-reduced-motion, where the
    // animation loop never runs.
    paintCells(x0, y0, x1, y1);
    growBox(painted, x0, y0, x1, y1);
    start();
  }

  function onPointerMove(clientX, clientY) {
    const now = performance.now();
    if (now - lastSeed < SEED_THROTTLE_MS) return;
    lastSeed = now;
    seedAt(clientX, clientY);
  }

  function applyResize() {
    dpr = Math.min(MAX_DPR, Math.max(1, window.devicePixelRatio || 1));
    const w = window.innerWidth;
    const h = window.innerHeight;

    const newCols = Math.ceil(w / CELL_PX);
    const newRows = Math.ceil(h / CELL_PX);
    const newStride = newCols + 2;
    const resized = new Uint8Array(newStride * (newRows + 2));

    // Re-seat the existing pattern rather than wiping it, so a resize -
    // or a phone rotating, or a mobile address bar sliding away - does
    // not blank the screen.
    let count = 0;
    clearBox(live);
    if (cols > 0 && rows > 0) {
      const copyCols = Math.min(cols, newCols);
      const copyRows = Math.min(rows, newRows);
      for (let y = 1; y <= copyRows; y++) {
        const src = y * stride;
        const dst = y * newStride;
        for (let x = 1; x <= copyCols; x++) {
          if (current[src + x]) {
            resized[dst + x] = 1;
            count++;
            growBox(live, x, y, x, y);
          }
        }
      }
    }

    cols = newCols;
    rows = newRows;
    stride = newStride;
    current = resized;
    next = new Uint8Array(resized.length);
    liveCount = count;

    // Resizing the backing store clears it and resets the context state.
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    clearBox(painted);
    if (!isEmpty(live)) {
      paintCells(live.x0, live.y0, live.x1, live.y1);
      growBox(painted, live.x0, live.y0, live.x1, live.y1);
    }
    if (liveCount > 0) start();
  }

  function onResize() {
    if (resizeTimer != null) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeTimer = null;
      applyResize();
    }, RESIZE_DEBOUNCE_MS);
  }

  window.addEventListener('resize', onResize);

  window.addEventListener('mousemove', (e) => onPointerMove(e.clientX, e.clientY), {
    passive: true,
  });

  const onTouch = (e) => {
    const t = e.touches[0];
    if (t) onPointerMove(t.clientX, t.clientY);
  };
  window.addEventListener('touchstart', onTouch, { passive: true });
  window.addEventListener('touchmove', onTouch, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (liveCount > 0) start();
  });

  applyResize();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
