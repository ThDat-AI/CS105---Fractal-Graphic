// scripts/main.js
// Entry point: kết nối UI và renderer

(function () {
  const canvas = document.getElementById('glCanvas');

  // Resize canvas to match display size
  function fitCanvas() {
    const wrapper = canvas.parentElement;
    canvas.width  = wrapper.clientWidth;
    canvas.height = wrapper.clientHeight;
  }
  fitCanvas();
  window.addEventListener('resize', () => { fitCanvas(); });

  // Track whether a render has ever been done
  let hasRendered = false;
  let lastFractalKey = null;

  // ── Render dispatcher ──────────────────────────────────────────────────
  function handleRender(fractalKey, params, instant = false) {
    KochRenderer.stop();

    if (fractalKey === 'koch') {
      UI.hideOverlay();
      UI.setCanvasLabel('RENDERING…');
      document.body.classList.add('rendering');

      if (instant && hasRendered && lastFractalKey === 'koch') {
        // Instant render (khi kéo slider): không dùng animation
        const t0 = performance.now();
        const verts = KochRenderer.render(canvas, params);
        const elapsed = (performance.now() - t0).toFixed(0);
        document.body.classList.remove('rendering');
        UI.setCanvasLabel('KOCH SNOWFLAKE — LEVEL ' + Math.round(params.koch_levels), true);
        UI.setStats(
          elapsed < 2 ? '>500' : Math.round(1000 / elapsed),
          'KOCH',
          verts
        );
      } else {
        // Animated render (lần đầu / nhấn RENDER)
        const t0 = performance.now();
        KochRenderer.renderAnimated(canvas, params, (verts) => {
          const elapsed = (performance.now() - t0).toFixed(0);
          document.body.classList.remove('rendering');
          UI.setCanvasLabel('KOCH SNOWFLAKE — LEVEL ' + Math.round(params.koch_levels), true);
          UI.setStats(
            elapsed < 2 ? '>500' : Math.round(1000 / elapsed),
            'KOCH',
            verts
          );
          hasRendered = true;
          lastFractalKey = 'koch';
        });
      }

      hasRendered = true;
      lastFractalKey = 'koch';

    } else {
      // Các fractal chưa cài đặt
      document.body.classList.remove('rendering');
      hasRendered = false;
      lastFractalKey = fractalKey;

      const name = FRACTAL_PARAMS[fractalKey]?.label || fractalKey;
      UI.setCanvasLabel('NOT IMPLEMENTED YET');
      UI.setStats('—', fractalKey.toUpperCase(), '—');

      // 2D fallback notice
      const ctx2d = canvas.getContext('2d');
      if (ctx2d) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        ctx2d.clearRect(0, 0, canvas.width, canvas.height);
        ctx2d.fillStyle = '#f0f4f8';
        ctx2d.fillRect(0, 0, canvas.width, canvas.height);

        ctx2d.strokeStyle = '#b8cfe0';
        ctx2d.lineWidth = 1;
        ctx2d.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

        ctx2d.textAlign = 'center';
        ctx2d.font = 'bold 17px "Share Tech Mono", monospace';
        ctx2d.fillStyle = '#e05c1a';
        ctx2d.fillText('[ COMING SOON ]', canvas.width / 2, canvas.height / 2 - 22);

        ctx2d.font = '14px "Rajdhani", sans-serif';
        ctx2d.fillStyle = '#6a8fa8';
        ctx2d.fillText(name, canvas.width / 2, canvas.height / 2 + 10);

        ctx2d.font = '11px "Share Tech Mono", monospace';
        ctx2d.fillStyle = '#b8cfe0';
        ctx2d.fillText('Sẽ được cài đặt trong phiên bản tiếp theo', canvas.width / 2, canvas.height / 2 + 36);
      }

      UI.showOverlay();
      document.getElementById('canvasOverlay').innerHTML = `
        <div class="overlay-text">
          <div class="overlay-icon" style="font-size:40px;color:var(--accent2)">⚙</div>
          <div style="color:var(--accent2);font-weight:700;font-size:17px">COMING SOON</div>
          <div style="font-size:13px;margin-top:4px">${name}</div>
          <div style="font-size:11px;color:var(--text-dim);font-family:var(--font-mono);margin-top:6px">Chưa được cài đặt trong phiên bản này</div>
        </div>
      `;
    }
  }

  function handleReset() {
    KochRenderer.stop();
    hasRendered = false;
    lastFractalKey = null;
    UI.showOverlay();
    document.getElementById('canvasOverlay').innerHTML = `
      <div class="overlay-text">
        <div class="overlay-icon">◈</div>
        <div>Chọn fractal và nhấn <strong>RENDER</strong></div>
      </div>
    `;
    UI.setCanvasLabel('NO SIGNAL');
    UI.setStats(null, null, null);

    fitCanvas();
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      gl.clearColor(0.94, 0.96, 0.99, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
  }

  // ── Init UI ────────────────────────────────────────────────────────────
  UI.init(
    (key, params) => handleRender(key, params, true),  // auto-render từ slider
    handleReset
  );

  // Nút RENDER: animated render
  document.getElementById('renderBtn').addEventListener('click', () => {
    const key = document.getElementById('fractalSelect').value;
    handleRender(key, UI.getParams(key), false);
  });

  // ── Init WebGL ──────────────────────────────────────────────────────────
  KochRenderer.init(canvas);

  console.log(
    '%c[FRACTAL ENGINE]%c WebGL ready. Kéo slider để tự động render.',
    'color:#0077cc;font-weight:bold',
    'color:#6a8fa8'
  );
})();
