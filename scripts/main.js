// scripts/main.js
// Entry point: kết nối UI và renderer

(function () {
  const canvas = document.getElementById('glCanvas');
  const canvasWrapper = canvas.parentElement;

  const viewState = {
    mandelbrot: { zoom: 1.0, centerX: -0.5, centerY: 0.0 },
    julia:      { zoom: 1.0, centerX:  0.0, centerY: 0.0 },
    koch:       { zoom: 1.0, offsetX: 0, offsetY: 0 },
    minkowski:  { zoom: 1.0, offsetX: 0, offsetY: 0 },
    sierpinski_triangle: { zoom: 1.0, offsetX: 0, offsetY: 0 },
    sierpinski_carpet:   { zoom: 1.0, offsetX: 0, offsetY: 0 }
  };

  let isPanning = false;
  let panAnchor = { x: 0, y: 0 };
  let panStart = { x: 0, y: 0 };

  function fitCanvas() {
    const wrapper = canvas.parentElement;
    const size = Math.min(wrapper.clientWidth, wrapper.clientHeight);
    canvas.width = size;
    canvas.height = size;
  }

  function resetViewState(fractalKey) {
    if (fractalKey === 'mandelbrot') {
      viewState.mandelbrot.zoom = 1.0;
      viewState.mandelbrot.centerX = -0.5;
      viewState.mandelbrot.centerY = 0.0;
    } else if (fractalKey === 'julia') {
      viewState.julia.zoom = 1.0;
      viewState.julia.centerX = 0.0;
      viewState.julia.centerY = 0.0;
    } else if (fractalKey === 'koch' || fractalKey === 'minkowski' || fractalKey === 'sierpinski_triangle' || fractalKey === 'sierpinski_carpet') {
      viewState[fractalKey].zoom = 1.0;
      viewState[fractalKey].offsetX = 0;
      viewState[fractalKey].offsetY = 0;
    }
  }

  function getRenderParams(fractalKey, params) {
    const out = Object.assign({}, params);
    if (fractalKey === 'mandelbrot') {
      const state = viewState.mandelbrot;
      state.centerX = params.mandel_cx;
      state.centerY = params.mandel_cy;
      out.mandel_zoom = state.zoom;
      out.mandel_cx = state.centerX;
      out.mandel_cy = state.centerY;
    }
    if (fractalKey === 'julia') {
      const state = viewState.julia;
      out.julia_zoom = state.zoom;
      out.julia_centerX = state.centerX;
      out.julia_centerY = state.centerY;
    }
    if (fractalKey === 'koch' || fractalKey === 'minkowski' || fractalKey === 'sierpinski_triangle' || fractalKey === 'sierpinski_carpet') {
      const state = viewState[fractalKey];
      out.zoom = state.zoom;
      out.offsetX = state.offsetX;
      out.offsetY = state.offsetY;
    }
    return out;
  }

  function getCanvasCoords(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      width: rect.width,
      height: rect.height
    };
  }

  function pointerToComplex(x, y, width, height, zoom, centerX, centerY) {
    const aspect = width / height;
    const uvx = ((x / width) * 2 - 1) * aspect;
    const uvy = 1 - (y / height) * 2;
    const scale = 1.8 / zoom;
    return {
      x: uvx * scale + centerX,
      y: uvy * scale + centerY
    };
  }

  function handleWheel(event) {
    event.preventDefault();
    const key = document.getElementById('fractalSelect').value;
    const coords = getCanvasCoords(event);

    if (key === 'mandelbrot' || key === 'julia') {
      const zoomFactor = Math.exp(-event.deltaY * 0.0012);
      const state = viewState[key];
      const aspect = coords.width / coords.height;
      const uvx = ((coords.x / coords.width) * 2 - 1) * aspect;
      const uvy = 1 - (coords.y / coords.height) * 2;
      const currentScale = 1.8 / state.zoom;
      const worldX = uvx * currentScale + state.centerX;
      const worldY = uvy * currentScale + state.centerY;

      state.zoom = Math.max(0.1, Math.min(80, state.zoom * zoomFactor));
      const newScale = 1.8 / state.zoom;
      state.centerX = worldX - uvx * newScale;
      state.centerY = worldY - uvy * newScale;
      handleRender(key, UI.getParams(key), true);
      return;
    }

    // For Koch, Minkowski, Sierpinski fractals
    const zoomFactor = Math.exp(event.deltaY * 0.0012);
    if (key === 'koch' || key === 'minkowski' || key === 'sierpinski_triangle' || key === 'sierpinski_carpet') {
      const state = viewState[key];
      const aspect = coords.width / coords.height;
      const normalizedX = ((coords.x / coords.width) * 2 - 1) * aspect;
      const normalizedY = 1 - (coords.y / coords.height) * 2;
      
      const currentScale = 1.0 / state.zoom;
      const worldX = normalizedX * currentScale + state.offsetX;
      const worldY = normalizedY * currentScale + state.offsetY;

      state.zoom = Math.max(0.25, Math.min(12, state.zoom * zoomFactor));
      const newScale = 1.0 / state.zoom;
      state.offsetX = worldX - normalizedX * newScale;
      state.offsetY = worldY - normalizedY * newScale;
      handleRender(key, UI.getParams(key), true);
      return;
    }
  }

  function handlePointerDown(event) {
    if (event.button !== 0) return;
    canvas.setPointerCapture(event.pointerId);
    isPanning = true;
    panAnchor = { x: event.clientX, y: event.clientY };
    const key = document.getElementById('fractalSelect').value;
    if (key === 'mandelbrot' || key === 'julia') {
      const state = viewState[key];
      panStart = { x: state.centerX, y: state.centerY };
    } else if (key === 'koch' || key === 'minkowski' || key === 'sierpinski_triangle' || key === 'sierpinski_carpet') {
      const state = viewState[key];
      panStart = { x: state.offsetX, y: state.offsetY };
    }
  }

  function handlePointerMove(event) {
    if (!isPanning) return;
    const key = document.getElementById('fractalSelect').value;

    const coords = getCanvasCoords(event);
    const deltaXpx = event.clientX - panAnchor.x;
    const deltaYpx = event.clientY - panAnchor.y;

    if (key === 'mandelbrot' || key === 'julia') {
      const state = viewState[key];
      const scale = 1.8 / state.zoom;
      const aspect = coords.width / coords.height;
      const deltaX = deltaXpx * 2 * aspect * scale / coords.width;
      const deltaY = deltaYpx * 2 * scale / coords.height;

      state.centerX = panStart.x - deltaX;
      state.centerY = panStart.y + deltaY;

      if (key === 'mandelbrot') {
        const cxInput = document.getElementById('mandel_cx');
        const cyInput = document.getElementById('mandel_cy');
        const cxVal = document.getElementById('val_mandel_cx');
        const cyVal = document.getElementById('val_mandel_cy');
        if (cxInput) { cxInput.value = state.centerX.toFixed(2); }
        if (cyInput) { cyInput.value = state.centerY.toFixed(2); }
        if (cxVal) { cxVal.textContent = state.centerX.toFixed(2); }
        if (cyVal) { cyVal.textContent = state.centerY.toFixed(2); }
      }

      handleRender(key, UI.getParams(key), true);
      return;
    }

    if (key === 'koch' || key === 'minkowski' || key === 'sierpinski_triangle' || key === 'sierpinski_carpet') {
      const state = viewState[key];
      const scale = 1.0 / state.zoom;
      const aspect = coords.width / coords.height;
      const deltaX = deltaXpx * 2 * aspect * scale / coords.width;
      const deltaY = deltaYpx * 2 * scale / coords.height;

      state.offsetX = panStart.x + deltaX;
      state.offsetY = panStart.y - deltaY;
      handleRender(key, UI.getParams(key), true);
      return;
    }
  }

  function handlePointerUp(event) {
    if (!isPanning) return;
    isPanning = false;
    canvas.releasePointerCapture(event.pointerId);
  }

  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  fitCanvas();
  window.addEventListener('resize', debounce(() => {
    fitCanvas();
    const key = document.getElementById('fractalSelect').value;
    handleRender(key, UI.getParams(key), true);
  }, 120));

  canvas.addEventListener('wheel', handleWheel, { passive: false });
  canvas.addEventListener('pointerdown', handlePointerDown);
  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerup', handlePointerUp);
  canvas.addEventListener('pointerleave', handlePointerUp);

  let hasRendered = false;
  let lastFractalKey = null;

  function stopAllRenderers() {
    KochRenderer.stop();
    if (typeof SierpinskiTriangleRenderer !== 'undefined') SierpinskiTriangleRenderer.stop();
    if (typeof SierpinskiCarpetRenderer !== 'undefined') SierpinskiCarpetRenderer.stop();
    if (typeof MandelbrotRenderer !== 'undefined') MandelbrotRenderer.stop();
    if (typeof JuliaRenderer !== 'undefined') JuliaRenderer.stop();
    if (typeof MinkowskiRenderer !== 'undefined') MinkowskiRenderer.stop();
  }

  // ── Render dispatcher ──────────────────────────────────────────────────
  function handleRender(fractalKey, params, instant = false) {
    params = getRenderParams(fractalKey, params);
    stopAllRenderers();

    // ================= KOCH =================
    if (fractalKey === 'koch') {
      UI.hideOverlay();
      UI.setCanvasLabel('RENDERING…');
      document.body.classList.add('rendering');

      if (instant && hasRendered && lastFractalKey === 'koch') {
        const t0 = performance.now();
        const verts = KochRenderer.render(canvas, params);
        const elapsed = (performance.now() - t0).toFixed(0);

        document.body.classList.remove('rendering');
        UI.setCanvasLabel('KOCH SNOWFLAKE — LEVEL ' + Math.round(params.koch_levels), true);
        UI.setStats('KOCH', verts);
      } else {
        const t0 = performance.now();
        KochRenderer.renderAnimated(canvas, params, (verts) => {
          const elapsed = (performance.now() - t0).toFixed(0);

          document.body.classList.remove('rendering');
          UI.setCanvasLabel('KOCH SNOWFLAKE — LEVEL ' + Math.round(params.koch_levels), true);
          UI.setStats(elapsed < 2 ? '>500' : Math.round(1000 / elapsed), 'KOCH', verts);

          hasRendered = true;
          lastFractalKey = 'koch';
        });
      }

      hasRendered = true;
      lastFractalKey = 'koch';
    }

    // ================= SIERPINSKI TRIANGLE =================
    else if (fractalKey === 'sierpinski_triangle') {
      UI.hideOverlay();
      UI.setCanvasLabel('RENDERING…');
      document.body.classList.add('rendering');

      if (instant && hasRendered && lastFractalKey === fractalKey) {
        const t0 = performance.now();
        const verts = SierpinskiTriangleRenderer.render(canvas, params);
        const elapsed = (performance.now() - t0).toFixed(0);

        document.body.classList.remove('rendering');
        UI.setCanvasLabel('SIERPIŃSKI TRIANGLE — LEVEL ' + Math.round(params.sier_t_levels), true);
        UI.setStats('SIERPINSKI', verts);
      } else {
        const t0 = performance.now();
        SierpinskiTriangleRenderer.renderAnimated(canvas, params, (verts) => {
          const elapsed = (performance.now() - t0).toFixed(0);

          document.body.classList.remove('rendering');
          UI.setCanvasLabel('SIERPIŃSKI TRIANGLE — LEVEL ' + Math.round(params.sier_t_levels), true);
          UI.setStats('SIERPINSKI', verts);
        });
      }

      hasRendered = true;
      lastFractalKey = fractalKey;
    }

    // ================= SIERPINSKI CARPET =================
    else if (fractalKey === 'sierpinski_carpet') {
      UI.hideOverlay();
      UI.setCanvasLabel('RENDERING…');
      document.body.classList.add('rendering');

      if (instant && hasRendered && lastFractalKey === fractalKey) {
        const t0 = performance.now();
        const verts = SierpinskiCarpetRenderer.render(canvas, params);
        const elapsed = (performance.now() - t0).toFixed(0);

        document.body.classList.remove('rendering');
        UI.setCanvasLabel('SIERPIŃSKI CARPET — LEVEL ' + Math.round(params.sier_c_levels), true);
        UI.setStats('SIERPINSKI', verts);
      } else {
        const t0 = performance.now();
        SierpinskiCarpetRenderer.renderAnimated(canvas, params, (verts) => {
          const elapsed = (performance.now() - t0).toFixed(0);

          document.body.classList.remove('rendering');
          UI.setCanvasLabel('SIERPIŃSKI CARPET — LEVEL ' + Math.round(params.sier_c_levels), true);
          UI.setStats('SIERPINSKI', verts);
        });
      }

      hasRendered = true;
      lastFractalKey = fractalKey;
    }

    // ================= MANDELBROT + JULIA =================
    else if (fractalKey === 'mandelbrot' || fractalKey === 'julia') {
      const renderer = fractalKey === 'mandelbrot' ? MandelbrotRenderer : JuliaRenderer;
      const title = fractalKey === 'mandelbrot' ? 'MANDELBROT SET' : 'JULIA SET';
      const typeTag = fractalKey === 'mandelbrot' ? 'MANDEL' : 'JULIA';

      UI.hideOverlay();
      UI.setCanvasLabel('RENDERING…');
      document.body.classList.add('rendering');

      if (instant && hasRendered && lastFractalKey === fractalKey) {
        const t0 = performance.now();
        const iter = renderer.render(canvas, params);
        const elapsed = (performance.now() - t0).toFixed(0);

        document.body.classList.remove('rendering');
        UI.setCanvasLabel(title, true);
        UI.setStats(typeTag, iter);
      } else {
        const t0 = performance.now();
        renderer.renderAnimated(canvas, params, (iter) => {
          const elapsed = (performance.now() - t0).toFixed(0);

          document.body.classList.remove('rendering');
          UI.setCanvasLabel(title, true);
          UI.setStats(typeTag, iter);

          hasRendered = true;
          lastFractalKey = fractalKey;
        });
      }

      hasRendered = true;
      lastFractalKey = fractalKey;
    }

    // ================= MINKOWSKI =================
    else if (fractalKey === 'minkowski') {
      UI.hideOverlay();
      UI.setCanvasLabel('RENDERING…');
      document.body.classList.add('rendering');

      if (instant && hasRendered && lastFractalKey === fractalKey) {
        const t0 = performance.now();
        const verts = MinkowskiRenderer.render(canvas, params);
        const elapsed = (performance.now() - t0).toFixed(0);

        document.body.classList.remove('rendering');
        UI.setCanvasLabel('MINKOWSKI CURVE — LEVEL ' + Math.round(params.mink_levels), true);
        UI.setStats('MINKOWSKI', verts);
      } else {
        const t0 = performance.now();
        MinkowskiRenderer.renderAnimated(canvas, params, (verts) => {
          const elapsed = (performance.now() - t0).toFixed(0);

          document.body.classList.remove('rendering');
          UI.setCanvasLabel('MINKOWSKI CURVE — LEVEL ' + Math.round(params.mink_levels), true);
          UI.setStats('MINKOWSKI', verts);
        });
      }

      hasRendered = true;
      lastFractalKey = fractalKey;
    }

    // ================= FALLBACK =================
    else {
      document.body.classList.remove('rendering');
      hasRendered = false;
      lastFractalKey = fractalKey;

      const name = FRACTAL_PARAMS[fractalKey]?.label || fractalKey;
      UI.setCanvasLabel('NOT IMPLEMENTED YET');
      UI.setStats('—', '—');

      UI.showOverlay();
    }
  }

  function handleReset() {
    stopAllRenderers();
    hasRendered = false;
    lastFractalKey = null;

    UI.showOverlay();
    UI.setCanvasLabel('NO SIGNAL');
    UI.setStats(null, null);

    fitCanvas();
    resetViewState(document.getElementById('fractalSelect').value);

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      gl.clearColor(0.94, 0.96, 0.99, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
  }

  // ── Init UI ────────────────────────────────────────────
  UI.init(
    (key, params) => handleRender(key, params, true),
    handleReset
  );

  document.getElementById('fractalSelect').addEventListener('change', (event) => {
    resetViewState(event.target.value);
  });

  document.getElementById('renderBtn').addEventListener('click', () => {
    const key = document.getElementById('fractalSelect').value;
    handleRender(key, UI.getParams(key), false);
  });

  // ── Init WebGL ──────────────────────────────────────────
  KochRenderer.init(canvas);
  SierpinskiTriangleRenderer.init(canvas);
  SierpinskiCarpetRenderer.init(canvas);
  MandelbrotRenderer.init(canvas);
  JuliaRenderer.init(canvas);

  // Auto-render initial fractal on page load
  const initialKey = document.getElementById('fractalSelect').value;
  handleRender(initialKey, UI.getParams(initialKey), true);

  console.log(
    '%c[FRACTAL ENGINE]%c WebGL ready.',
    'color:#0077cc;font-weight:bold',
    'color:#6a8fa8'
  );
})();