// scripts/main.js
// Entry point: kết nối UI và renderer

(function () {
  const canvas = document.getElementById('glCanvas');
  const canvasWrapper = canvas.parentElement;
  const miniMapPanel = document.getElementById('miniMapPanel');
  const miniMapCanvas = document.getElementById('miniMapCanvas');
  const miniMapNote = document.getElementById('miniMapNote');

  // --- STATE RIÊNG CHO MINIMAP (WEBGL) ---
  const miniMapState = {
    zoom: 0.8,
    centerX: -0.5,
    centerY: 0.0,
    isPanning: false,    // Chuột phải để di chuyển bản đồ
    isSelecting: false,  // Chuột trái để kéo chọn tọa độ Julia
    panAnchor: { x: 0, y: 0 },
    panStart: { x: 0, y: 0 }
  };

  const viewState = {
    mandelbrot: { zoom: 1.0, centerX: -0.5, centerY: 0.0 },
    julia:      { zoom: 1.0, centerX:  0.0, centerY: 0.0 },
    koch:       { zoom: 1.0, offsetX: 0, offsetY: 0 },
    minkowski:  { zoom: 1.0, offsetX: 0, offsetY: 0 },
    sierpinski_triangle: { zoom: 1.0, offsetX: 0, offsetY: 0 },
    sierpinski_carpet:   { zoom: 1.0, offsetX: 0, offsetY: 0 }
  };

  let isPanningMain = false;
  let panAnchorMain = { x: 0, y: 0 };
  let panStartMain = { x: 0, y: 0 };

  // ========================================================
  // 1. WEBGL MINIMAP RENDERER
  // ========================================================
  const MiniMapRenderer = {
    gl: null,
    program: null,
    locations: {},

    init(canvas) {
      this.gl = canvas.getContext('webgl');
      if (!this.gl) return;

      const vs = `
        attribute vec2 position;
        void main() { gl_Position = vec4(position, 0.0, 1.0); }
      `;
      const fs = `
        precision highp float;
        uniform vec2 u_res;
        uniform vec2 u_center;
        uniform float u_zoom;
        uniform vec2 u_juliaC;
        
        void main() {
          vec2 uv = (gl_FragCoord.xy / u_res.xy) * 2.0 - 1.0;
          float aspect = u_res.x / u_res.y;
          uv.x *= aspect;
          
          vec2 c = uv * (1.5 / u_zoom) + u_center;
          vec2 z = vec2(0.0);
          float iter = 0.0;
          for (int i = 0; i < 100; i++) {
            z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
            if (length(z) > 2.0) break;
            iter++;
          }

          // Màu sắc Mandelbrot nền
          vec3 col = iter == 100.0 ? vec3(0.05, 0.08, 0.15) : 0.5 + 0.5*cos(3.0 + iter*0.15 + vec3(0.0, 0.6, 1.0));
          
          // Vẽ Marker (vị trí Julia C)
          float distToC = length(c - u_juliaC);
          if (distToC < 0.03 / u_zoom) col = vec3(1.0, 0.2, 0.2); // Chấm đỏ
          
          gl_FragColor = vec4(col, 1.0);
        }
      `;
      this.program = this.createProgram(vs, fs);
      this.locations = {
        res: this.gl.getUniformLocation(this.program, 'u_res'),
        center: this.gl.getUniformLocation(this.program, 'u_center'),
        zoom: this.gl.getUniformLocation(this.program, 'u_zoom'),
        juliaC: this.gl.getUniformLocation(this.program, 'u_juliaC')
      };
      
      const buffer = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), this.gl.STATIC_DRAW);
      const pos = this.gl.getAttribLocation(this.program, 'position');
      this.gl.enableVertexAttribArray(pos);
      this.gl.vertexAttribPointer(pos, 2, this.gl.FLOAT, false, 0, 0);
    },

    createProgram(vsSource, fsSource) {
      const gl = this.gl;
      const loadShader = (type, source) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, source);
        gl.compileShader(s);
        return s;
      };
      const program = gl.createProgram();
      gl.attachShader(program, loadShader(gl.VERTEX_SHADER, vsSource));
      gl.attachShader(program, loadShader(gl.FRAGMENT_SHADER, fsSource));
      gl.linkProgram(program);
      return program;
    },

    draw(juliaCR, juliaCI) {
      if (!this.gl) return;
      this.gl.viewport(0, 0, miniMapCanvas.width, miniMapCanvas.height);
      this.gl.useProgram(this.program);
      this.gl.uniform2f(this.locations.res, miniMapCanvas.width, miniMapCanvas.height);
      this.gl.uniform2f(this.locations.center, miniMapState.centerX, miniMapState.centerY);
      this.gl.uniform1f(this.locations.zoom, miniMapState.zoom);
      this.gl.uniform2f(this.locations.juliaC, juliaCR, juliaCI);
      this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    }
  };

  // --- LOGIC TƯƠNG TÁC MINIMAP ---
  function getMiniMapCoords(e) {
    const rect = miniMapCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const aspect = rect.width / rect.height;
    const uvx = (x / rect.width * 2 - 1) * aspect;
    const uvy = 1 - (y / rect.height * 2);
    const scale = 1.5 / miniMapState.zoom;
    return {
      cReal: uvx * scale + miniMapState.centerX,
      cImag: uvy * scale + miniMapState.centerY
    };
  }

  function updateJuliaFromMiniMap(e) {
    const { cReal, cImag } = getMiniMapCoords(e);
    const selectEl = document.getElementById('fractalSelect');
    if (selectEl.value !== 'julia') {
      selectEl.value = 'julia';
      selectEl.dispatchEvent(new Event('change'));
    }
    const crInput = document.getElementById('julia_cr');
    const ciInput = document.getElementById('julia_ci');
    if (crInput) { 
      crInput.value = cReal.toFixed(3); 
      document.getElementById('val_julia_cr').textContent = crInput.value;
    }
    if (ciInput) { 
      ciInput.value = cImag.toFixed(3); 
      document.getElementById('val_julia_ci').textContent = ciInput.value;
    }
    if (miniMapNote) miniMapNote.textContent = `c = (${cReal.toFixed(3)}, ${cImag.toFixed(3)})`;
    handleRender('julia', UI.getParams('julia'), true);
  }

  function drawMiniMapForJulia(cReal, cImag) {
    if (!miniMapPanel || !miniMapCanvas) return;
    MiniMapRenderer.draw(cReal, cImag);
    miniMapPanel.classList.remove('hidden');
  }

  function hideMiniMap() {
    if (miniMapPanel) miniMapPanel.classList.add('hidden');
  }

  // ========================================================
  // 2. HỆ THỐNG RENDER CHÍNH (GIỮ NGUYÊN TỪ MAIN1)
  // ========================================================
  function fitCanvas() {
    const wrapper = canvas.parentElement;
    const size = Math.min(wrapper.clientWidth, wrapper.clientHeight);
    canvas.width = size;
    canvas.height = size;
    // Cố định size minimap
    miniMapCanvas.width = 250;
    miniMapCanvas.height = 250;
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
    } else if (viewState[fractalKey]) {
      viewState[fractalKey].zoom = 1.0;
      viewState[fractalKey].offsetX = 0;
      viewState[fractalKey].offsetY = 0;
    }
  }

  function getRenderParams(fractalKey, params) {
    const out = Object.assign({}, params);
    if (fractalKey === 'mandelbrot') {
      const state = viewState.mandelbrot;
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
    if (['koch', 'minkowski', 'sierpinski_triangle', 'sierpinski_carpet'].includes(fractalKey)) {
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

  // --- Handlers cho Canvas chính ---
  function handleWheel(event) {
    event.preventDefault();
    const key = document.getElementById('fractalSelect').value;
    const coords = getCanvasCoords(event);
    const state = viewState[key];
    if (!state) return;

    if (key === 'mandelbrot' || key === 'julia') {
      const zoomFactor = Math.exp(-event.deltaY * 0.0012);
      const aspect = coords.width / coords.height;
      const uvx = ((coords.x / coords.width) * 2 - 1) * aspect;
      const uvy = 1 - (coords.y / coords.height) * 2;
      const currentScale = 1.8 / state.zoom;
      const worldX = uvx * currentScale + state.centerX;
      const worldY = uvy * currentScale + state.centerY;

      state.zoom = Math.max(0.1, Math.min(100000, state.zoom * zoomFactor));
      const newScale = 1.8 / state.zoom;
      state.centerX = worldX - uvx * newScale;
      state.centerY = worldY - uvy * newScale;
      handleRender(key, UI.getParams(key), true);
    } else {
      const zoomFactor = Math.exp(event.deltaY * 0.0012);
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
    }
  }

  function handlePointerDown(event) {
    if (event.button !== 0) return;
    canvas.setPointerCapture(event.pointerId);
    isPanningMain = true;
    panAnchorMain = { x: event.clientX, y: event.clientY };
    const key = document.getElementById('fractalSelect').value;
    const state = viewState[key];
    if (key === 'mandelbrot' || key === 'julia') {
      panStartMain = { x: state.centerX, y: state.centerY };
    } else {
      panStartMain = { x: state.offsetX, y: state.offsetY };
    }
  }

  function handlePointerMove(event) {
    if (!isPanningMain) return;
    const key = document.getElementById('fractalSelect').value;
    const state = viewState[key];
    const coords = getCanvasCoords(event);
    const deltaXpx = event.clientX - panAnchorMain.x;
    const deltaYpx = event.clientY - panAnchorMain.y;

    if (key === 'mandelbrot' || key === 'julia') {
      const scale = 1.8 / state.zoom;
      const aspect = coords.width / coords.height;
      const deltaX = deltaXpx * 2 * aspect * scale / coords.width;
      const deltaY = deltaYpx * 2 * scale / coords.height;
      state.centerX = panStartMain.x - deltaX;
      state.centerY = panStartMain.y + deltaY;
      handleRender(key, UI.getParams(key), true);
    } else {
      const scale = 1.0 / state.zoom;
      const aspect = coords.width / coords.height;
      const deltaX = deltaXpx * 2 * aspect * scale / coords.width;
      const deltaY = deltaYpx * 2 * scale / coords.height;
      state.offsetX = panStartMain.x + deltaX;
      state.offsetY = panStartMain.y - deltaY;
      handleRender(key, UI.getParams(key), true);
    }
  }

  function handlePointerUp(event) {
    isPanningMain = false;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
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
    [KochRenderer, SierpinskiTriangleRenderer, SierpinskiCarpetRenderer, MandelbrotRenderer, JuliaRenderer, MinkowskiRenderer]
    .forEach(r => r && r.stop && r.stop());
  }

  // ── Render dispatcher ──────────────────────────────────────────────────
  function handleRender(fractalKey, params, instant = false) {
    params = getRenderParams(fractalKey, params);
    stopAllRenderers();

    if (fractalKey === 'julia') {
      const cReal = params.julia_cr ?? -0.7;
      const cImag = params.julia_ci ?? 0.27;
      drawMiniMapForJulia(cReal, cImag);
    } else {
      hideMiniMap();
    }

    UI.hideOverlay();
    UI.setCanvasLabel('RENDERING…');
    document.body.classList.add('rendering');

    const rendererMap = {
      'koch': { r: KochRenderer, label: 'KOCH SNOWFLAKE', levelKey: 'koch_levels' },
      'sierpinski_triangle': { r: SierpinskiTriangleRenderer, label: 'SIERPIŃSKI TRIANGLE', levelKey: 'sier_t_levels' },
      'sierpinski_carpet': { r: SierpinskiCarpetRenderer, label: 'SIERPIŃSKI CARPET', levelKey: 'sier_c_levels' },
      'mandelbrot': { r: MandelbrotRenderer, label: 'TẬP MANDELBROT', type: 'MANDEL' },
      'julia': { r: JuliaRenderer, label: 'TẬP JULIA', type: 'JULIA' },
      'minkowski': { r: MinkowskiRenderer, label: 'MINKOWSKI CURVE', levelKey: 'mink_levels' }
    };

    const entry = rendererMap[fractalKey];
    if (entry) {
      const t0 = performance.now();
      const onDone = (res) => {
        const elapsed = (performance.now() - t0).toFixed(0);
        document.body.classList.remove('rendering');
        const finalLabel = entry.levelKey ? `${entry.label} — LEVEL ${Math.round(params[entry.levelKey])}` : entry.label;
        UI.setCanvasLabel(finalLabel, true);
        hasRendered = true;
        lastFractalKey = fractalKey;
      };

      if (instant && hasRendered && lastFractalKey === fractalKey) {
        onDone(entry.r.render(canvas, params));
      } else {
        entry.r.renderAnimated(canvas, params, onDone);
      }
    } else {
      document.body.classList.remove('rendering');
      UI.setCanvasLabel('NOT IMPLEMENTED');
      UI.showOverlay();
    }
  }

  function handleReset() {
    stopAllRenderers();
    hasRendered = false;
    lastFractalKey = null;
    UI.showOverlay();
    UI.setCanvasLabel('NO SIGNAL');
    hideMiniMap();
    fitCanvas();
    resetViewState(document.getElementById('fractalSelect').value);
    const gl = canvas.getContext('webgl');
    if (gl) { gl.clearColor(0.94, 0.96, 0.99, 1); gl.clear(gl.COLOR_BUFFER_BIT); }
  }

  // ── Init ────────────────────────────────────────────
  UI.init((key, params) => handleRender(key, params, true), handleReset);

  document.getElementById('fractalSelect').addEventListener('change', (e) => resetViewState(e.target.value));
  document.getElementById('renderBtn').addEventListener('click', () => {
    const key = document.getElementById('fractalSelect').value;
    handleRender(key, UI.getParams(key), false);
  });

  MiniMapRenderer.init(miniMapCanvas);
  KochRenderer.init(canvas);
  SierpinskiTriangleRenderer.init(canvas);
  SierpinskiCarpetRenderer.init(canvas);
  MandelbrotRenderer.init(canvas);
  JuliaRenderer.init(canvas);

  const initialKey = document.getElementById('fractalSelect').value;
  handleRender(initialKey, UI.getParams(initialKey), true);

  // ── MINIMAP INTERACTION EVENTS ──────────────────
  miniMapCanvas.addEventListener('contextmenu', e => e.preventDefault());

  miniMapCanvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) { // Trái: Chọn điểm
      miniMapState.isSelecting = true;
      updateJuliaFromMiniMap(e);
    } else if (e.button === 2) { // Phải: Pan
      miniMapState.isPanning = true;
      miniMapState.panAnchor = { x: e.clientX, y: e.clientY };
      miniMapState.panStart = { x: miniMapState.centerX, y: miniMapState.centerY };
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (miniMapState.isSelecting) {
      updateJuliaFromMiniMap(e);
    }
    if (miniMapState.isPanning) {
      const dx = e.clientX - miniMapState.panAnchor.x;
      const dy = e.clientY - miniMapState.panAnchor.y;
      const rect = miniMapCanvas.getBoundingClientRect();
      const scale = 3.0 / (miniMapState.zoom * rect.height);
      miniMapState.centerX = miniMapState.panStart.x - dx * scale;
      miniMapState.centerY = miniMapState.panStart.y + dy * scale;
      const p = UI.getParams('julia');
      MiniMapRenderer.draw(p.julia_cr, p.julia_ci);
    }
  });

  window.addEventListener('mouseup', () => {
    miniMapState.isSelecting = false;
    miniMapState.isPanning = false;
  });

  miniMapCanvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = Math.exp(-e.deltaY * 0.0015);
    miniMapState.zoom = Math.max(0.2, Math.min(100, miniMapState.zoom * zoomFactor));
    const p = UI.getParams('julia');
    MiniMapRenderer.draw(p.julia_cr, p.julia_ci);
  }, { passive: false });

  console.log('%c[FRACTAL ENGINE]%c WebGL & Interactive Minimap ready.', 'color:#0077cc;font-weight:bold', 'color:#6a8fa8');
})();