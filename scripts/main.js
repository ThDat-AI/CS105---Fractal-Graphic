// scripts/main.js
(function () {
  const canvas = document.getElementById('glCanvas');
  const miniMapCanvas = document.getElementById('miniMapCanvas');
  const miniMapNote = document.getElementById('miniMapNote');
  const miniMapPanel = document.getElementById('miniMapPanel');

  // --- STATE QUẢN LÝ VIEW ---
  const viewState = {
    mandelbrot: { zoom: 1.0, centerX: -0.5, centerY: 0.0 },
    julia:      { zoom: 1.0, centerX:  0.0, centerY: 0.0 },
    koch:       { zoom: 1.0, offsetX: 0, offsetY: 0 },
    minkowski:  { zoom: 1.0, offsetX: 0, offsetY: 0 },
    sierpinski_triangle: { zoom: 1.0, offsetX: 0, offsetY: 0 },
    sierpinski_carpet:   { zoom: 1.0, offsetX: 0, offsetY: 0 }
  };

  // --- STATE RIÊNG CHO MINIMAP (WEBGL) ---
  const miniMapState = {
    zoom: 0.8,
    centerX: -0.5,
    centerY: 0.0,
    isPanning: false,    // Chuột phải
    isSelecting: false,  // Chuột trái (Drag)
    panAnchor: { x: 0, y: 0 },
    panStart: { x: 0, y: 0 }
  };

  let isPanningMain = false;
  let panAnchorMain = { x: 0, y: 0 };
  let panStartMain = { x: 0, y: 0 };

  // ========================================================
  // 1. MINIMAP RENDERER (WEBGL)
  // ========================================================
  const MiniMapRenderer = {
    gl: null,
    program: null,
    locations: {},

    init(canvas) {
      this.gl = canvas.getContext('webgl');
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

          // Vẽ điểm Marker (vị trí Julia C)
          float distToC = length(c - u_juliaC);
          vec3 col = iter == 100.0 ? vec3(0.05, 0.1, 0.2) : 0.5 + 0.5*cos(3.0 + iter*0.15 + vec3(0.0,0.6,1.0));
          if (distToC < 0.03 / u_zoom) col = vec3(1.0, 0.0, 0.0); // Chấm đỏ
          
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

  // ========================================================
  // 2. LOGIC TƯƠNG TÁC MINIMAP
  // ========================================================

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
    
    // Switch UI sang Julia
    const selectEl = document.getElementById('fractalSelect');
    if (selectEl.value !== 'julia') {
      selectEl.value = 'julia';
      selectEl.dispatchEvent(new Event('change'));
    }

    // Cập nhật Input
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

    miniMapNote.textContent = `c = (${cReal.toFixed(3)}, ${cImag.toFixed(3)})`;
    handleRender('julia', UI.getParams('julia'), true);
  }

  miniMapCanvas.addEventListener('contextmenu', e => e.preventDefault());

  miniMapCanvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) { // Chuột trái: Chọn tọa độ
      miniMapState.isSelecting = true;
      updateJuliaFromMiniMap(e);
    } else if (e.button === 2) { // Chuột phải: Pan
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

  // ========================================================
  // 3. HỆ THỐNG RENDER CHÍNH (TỪ FILE CŨ)
  // ========================================================

  function fitCanvas() {
    const wrapper = canvas.parentElement;
    const size = Math.min(wrapper.clientWidth, wrapper.clientHeight);
    canvas.width = size;
    canvas.height = size;
    
    // Fix size minimap canvas theo thuộc tính tự nhiên
    miniMapCanvas.width = 300;
    miniMapCanvas.height = 300;
  }

  function resetViewState(fractalKey) {
    if (fractalKey === 'mandelbrot') {
      viewState.mandelbrot = { zoom: 1.0, centerX: -0.5, centerY: 0.0 };
    } else if (fractalKey === 'julia') {
      viewState.julia = { zoom: 1.0, centerX: 0.0, centerY: 0.0 };
    } else if (viewState[fractalKey]) {
      viewState[fractalKey].zoom = 1.0;
      viewState[fractalKey].offsetX = 0;
      viewState[fractalKey].offsetY = 0;
    }
  }

  function getRenderParams(fractalKey, params) {
    const out = Object.assign({}, params);
    if (viewState[fractalKey]) {
        const state = viewState[fractalKey];
        if (fractalKey === 'mandelbrot') {
            out.mandel_zoom = state.zoom;
            out.mandel_cx = state.centerX;
            out.mandel_cy = state.centerY;
        } else if (fractalKey === 'julia') {
            out.julia_zoom = state.zoom;
            out.julia_centerX = state.centerX;
            out.julia_centerY = state.centerY;
        } else {
            out.zoom = state.zoom;
            out.offsetX = state.offsetX;
            out.offsetY = state.offsetY;
        }
    }
    return out;
  }

  // --- Pointer Handlers cho Main Canvas ---
  function handleMainWheel(event) {
    event.preventDefault();
    const key = document.getElementById('fractalSelect').value;
    const state = viewState[key];
    if (!state) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const aspect = rect.width / rect.height;
    const uvx = ((x / rect.width) * 2 - 1) * aspect;
    const uvy = 1 - (y / rect.height) * 2;

    const zoomFactor = Math.exp(-event.deltaY * 0.0012);
    const isFractalSet = (key === 'mandelbrot' || key === 'julia');
    const currentScale = isFractalSet ? (1.8 / state.zoom) : (1.0 / state.zoom);
    
    const worldX = isFractalSet ? (uvx * currentScale + state.centerX) : (uvx * currentScale + state.offsetX);
    const worldY = isFractalSet ? (uvy * currentScale + state.centerY) : (uvy * currentScale + state.offsetY);

    state.zoom *= zoomFactor;
    const newScale = isFractalSet ? (1.8 / state.zoom) : (1.0 / state.zoom);
    
    if (isFractalSet) {
        state.centerX = worldX - uvx * newScale;
        state.centerY = worldY - uvy * newScale;
    } else {
        state.offsetX = worldX - uvx * newScale;
        state.offsetY = worldY - uvy * newScale;
    }
    handleRender(key, UI.getParams(key), true);
  }

  function handleMainPointerDown(e) {
    if (e.button !== 0) return;
    canvas.setPointerCapture(e.pointerId);
    isPanningMain = true;
    panAnchorMain = { x: e.clientX, y: e.clientY };
    const key = document.getElementById('fractalSelect').value;
    const state = viewState[key];
    panStartMain = (key === 'mandelbrot' || key === 'julia') 
        ? { x: state.centerX, y: state.centerY } 
        : { x: state.offsetX, y: state.offsetY };
  }

  function handleMainPointerMove(e) {
    if (!isPanningMain) return;
    const key = document.getElementById('fractalSelect').value;
    const state = viewState[key];
    const rect = canvas.getBoundingClientRect();
    const dxPx = e.clientX - panAnchorMain.x;
    const dyPx = e.clientY - panAnchorMain.y;
    
    const isFractalSet = (key === 'mandelbrot' || key === 'julia');
    const scale = isFractalSet ? (1.8 / state.zoom) : (1.0 / state.zoom);
    const aspect = rect.width / rect.height;
    
    const dx = dxPx * 2 * aspect * scale / rect.width;
    const dy = dyPx * 2 * scale / rect.height;

    if (isFractalSet) {
        state.centerX = panStartMain.x - dx;
        state.centerY = panStartMain.y + dy;
    } else {
        state.offsetX = panStartMain.x + dx;
        state.offsetY = panStartMain.y - dy;
    }
    handleRender(key, UI.getParams(key), true);
  }

  // --- Dispatcher Render ---
  function stopAll() {
    [KochRenderer, SierpinskiTriangleRenderer, SierpinskiCarpetRenderer, MandelbrotRenderer, JuliaRenderer, MinkowskiRenderer]
    .forEach(r => r && r.stop && r.stop());
  }

  let hasRendered = false;
  let lastKey = null;

  function handleRender(fractalKey, params, instant = false) {
    params = getRenderParams(fractalKey, params);
    stopAll();

    if (fractalKey === 'julia') {
      miniMapPanel.classList.remove('hidden');
      MiniMapRenderer.draw(params.julia_cr, params.julia_ci);
    } else {
      miniMapPanel.classList.add('hidden');
    }

    UI.hideOverlay();
    UI.setCanvasLabel('RENDERING…');
    document.body.classList.add('rendering');

    const rendererMap = {
      'koch': KochRenderer,
      'sierpinski_triangle': SierpinskiTriangleRenderer,
      'sierpinski_carpet': SierpinskiCarpetRenderer,
      'mandelbrot': MandelbrotRenderer,
      'julia': JuliaRenderer,
      'minkowski': MinkowskiRenderer
    };

    const renderer = rendererMap[fractalKey];
    if (renderer) {
      const t0 = performance.now();
      const onDone = (res) => {
        document.body.classList.remove('rendering');
        UI.setCanvasLabel(fractalKey.toUpperCase().replace('_', ' '), true);
        UI.setStats(fractalKey.toUpperCase(), res);
        hasRendered = true;
        lastKey = fractalKey;
      };

      if (instant && hasRendered && lastKey === fractalKey) {
        const res = renderer.render(canvas, params);
        onDone(res);
      } else {
        renderer.renderAnimated(canvas, params, onDone);
      }
    } else {
      UI.showOverlay();
      document.body.classList.remove('rendering');
    }
  }

  // --- Init ---
  fitCanvas();
  window.addEventListener('resize', () => fitCanvas());
  
  canvas.addEventListener('wheel', handleMainWheel, { passive: false });
  canvas.addEventListener('pointerdown', handleMainPointerDown);
  canvas.addEventListener('pointermove', handleMainPointerMove);
  canvas.addEventListener('pointerup', () => isPanningMain = false);

  UI.init((key, p) => handleRender(key, p, true), () => {
    stopAll();
    resetViewState(document.getElementById('fractalSelect').value);
    handleRender(document.getElementById('fractalSelect').value, UI.getParams(), false);
  });

  MiniMapRenderer.init(miniMapCanvas);
  KochRenderer.init(canvas);
  SierpinskiTriangleRenderer.init(canvas);
  SierpinskiCarpetRenderer.init(canvas);
  MandelbrotRenderer.init(canvas);
  JuliaRenderer.init(canvas);

  // Khởi chạy fractal đầu tiên
  const initialKey = document.getElementById('fractalSelect').value;
  handleRender(initialKey, UI.getParams(initialKey), true);

  console.log('%c[FRACTAL ENGINE]%c Minimap WebGL & Interaction Ready.', 'color:#0077cc;font-weight:bold', 'color:#6a8fa8');
})();