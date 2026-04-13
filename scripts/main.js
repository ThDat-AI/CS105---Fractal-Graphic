// scripts/main.js
// Entry point: kết nối UI và renderer

(function () {
  const canvas = document.getElementById('glCanvas');

  function fitCanvas() {
    const wrapper = canvas.parentElement;
    canvas.width  = wrapper.clientWidth;
    canvas.height = wrapper.clientHeight;
  }
  fitCanvas();
  window.addEventListener('resize', () => { fitCanvas(); });

  let hasRendered = false;
  let lastFractalKey = null;

  function stopAllRenderers() {
    KochRenderer.stop();
    if (typeof SierpinskiTriangleRenderer !== 'undefined') SierpinskiTriangleRenderer.stop();
    if (typeof SierpinskiCarpetRenderer !== 'undefined') SierpinskiCarpetRenderer.stop();
    if (typeof MandelbrotRenderer !== 'undefined') MandelbrotRenderer.stop();
    if (typeof JuliaRenderer !== 'undefined') JuliaRenderer.stop();
  }

  // ── Render dispatcher ──────────────────────────────────────────────────
  function handleRender(fractalKey, params, instant = false) {
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
        UI.setStats(elapsed < 2 ? '>500' : Math.round(1000 / elapsed), 'KOCH', verts);
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
        UI.setStats(elapsed < 2 ? '>500' : Math.round(1000 / elapsed), 'SIERPINSKI', verts);
      } else {
        const t0 = performance.now();
        SierpinskiTriangleRenderer.renderAnimated(canvas, params, (verts) => {
          const elapsed = (performance.now() - t0).toFixed(0);

          document.body.classList.remove('rendering');
          UI.setCanvasLabel('SIERPIŃSKI TRIANGLE — LEVEL ' + Math.round(params.sier_t_levels), true);
          UI.setStats(elapsed < 2 ? '>500' : Math.round(1000 / elapsed), 'SIERPINSKI', verts);
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
        UI.setStats(elapsed < 2 ? '>500' : Math.round(1000 / elapsed), 'SIERPINSKI', verts);
      } else {
        const t0 = performance.now();
        SierpinskiCarpetRenderer.renderAnimated(canvas, params, (verts) => {
          const elapsed = (performance.now() - t0).toFixed(0);

          document.body.classList.remove('rendering');
          UI.setCanvasLabel('SIERPIŃSKI CARPET — LEVEL ' + Math.round(params.sier_c_levels), true);
          UI.setStats(elapsed < 2 ? '>500' : Math.round(1000 / elapsed), 'SIERPINSKI', verts);
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
        UI.setStats(elapsed < 2 ? '>500' : Math.round(1000 / elapsed), typeTag, iter);
      } else {
        const t0 = performance.now();
        renderer.renderAnimated(canvas, params, (iter) => {
          const elapsed = (performance.now() - t0).toFixed(0);

          document.body.classList.remove('rendering');
          UI.setCanvasLabel(title, true);
          UI.setStats(elapsed < 2 ? '>500' : Math.round(1000 / elapsed), typeTag, iter);

          hasRendered = true;
          lastFractalKey = fractalKey;
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
      UI.setStats('—', fractalKey.toUpperCase(), '—');

      UI.showOverlay();
    }
  }

  function handleReset() {
    stopAllRenderers();
    hasRendered = false;
    lastFractalKey = null;

    UI.showOverlay();
    UI.setCanvasLabel('NO SIGNAL');
    UI.setStats(null, null, null);

    fitCanvas();

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

  console.log(
    '%c[FRACTAL ENGINE]%c WebGL ready.',
    'color:#0077cc;font-weight:bold',
    'color:#6a8fa8'
  );
})();