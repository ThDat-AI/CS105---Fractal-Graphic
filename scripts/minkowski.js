// scripts/minkowski.js
// Vẽ Minkowski Island (chuẩn 8-segment Minkowski sausage) bằng WebGL

const MinkowskiRenderer = (() => {

  // ── Vertex Shader ──────────────────────────────────────────────────────
  const VS_SRC = `
    attribute vec2 a_position;
    uniform vec2  u_resolution;
    uniform float u_scale;
    uniform vec2  u_offset;

    void main() {
      vec2 pos = a_position * u_scale + u_offset;
      gl_Position = vec4(pos, 0.0, 1.0);
    }
  `;

  // ── Fragment Shader ─────────────────────────────────────────────────────
  const FS_SRC = `
    precision mediump float;
    uniform vec3  u_color;

    void main() {
      gl_FragColor = vec4(u_color, 1.0);
    }
  `;

  // ── Minkowski sausage (8 đoạn chuẩn) ────────────────────────────────────
  function minkowskiSegment(p1, p2, level, outLines) {
    if (level === 0) {
      outLines.push(p1.x, p1.y, p2.x, p2.y);
      return;
    }

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    const len = Math.sqrt(dx * dx + dy * dy);
    const ux = dx / len;
    const uy = dy / len;

    // pháp tuyến
    const nx = -uy;
    const ny = ux;

    const d = len / 4;

    // chia 4 đoạn
    const pA = { x: p1.x + dx / 4, y: p1.y + dy / 4 };
    const pB = { x: p1.x + dx / 2, y: p1.y + dy / 2 };
    const pC = { x: p1.x + 3 * dx / 4, y: p1.y + 3 * dy / 4 };

    // điểm nhô lên/xuống
    const pD = { x: pA.x + nx * d, y: pA.y + ny * d };
    const pE = { x: pB.x + nx * d, y: pB.y + ny * d };
    const pF = { x: pB.x - nx * d, y: pB.y - ny * d };
    const pG = { x: pC.x - nx * d, y: pC.y - ny * d };

    // 8 đoạn chuẩn
    minkowskiSegment(p1, pA, level - 1, outLines);
    minkowskiSegment(pA, pD, level - 1, outLines);
    minkowskiSegment(pD, pE, level - 1, outLines);
    minkowskiSegment(pE, pB, level - 1, outLines);
    minkowskiSegment(pB, pF, level - 1, outLines);
    minkowskiSegment(pF, pG, level - 1, outLines);
    minkowskiSegment(pG, pC, level - 1, outLines);
    minkowskiSegment(pC, p2, level - 1, outLines);
  }

  // ── Build Minkowski Island (đa giác kín) ────────────────────────────────
  function buildMinkowskiIsland(levels) {
    const lines = [];

    // Hình vuông ban đầu (khép kín)
    const square = [
      { x: -0.6, y: -0.6 },
      { x:  0.6, y: -0.6 },
      { x:  0.6, y:  0.6 },
      { x: -0.6, y:  0.6 }
    ];

    // Áp dụng Minkowski cho từng cạnh
    for (let i = 0; i < 4; i++) {
      const p1 = square[i];
      const p2 = square[(i + 1) % 4];
      minkowskiSegment(p1, p2, levels, lines);
    }

    return new Float32Array(lines);
  }

  // ── Trạng thái renderer ─────────────────────────────────────────────────
  let gl, program, posBuffer;
  let vertexCount = 0;

  // ── Init ────────────────────────────────────────────────────────────────
  function init(canvas) {
    gl = WebGLUtils.initGL(canvas);
    if (!gl) return false;

    program = WebGLUtils.createProgram(gl, VS_SRC, FS_SRC);
    if (!program) return false;

    return true;
  }

  // ── Render ──────────────────────────────────────────────────────────────
  function render(canvas, params) {
    if (!gl || !program) {
      if (!init(canvas)) return 0;
    }

    WebGLUtils.resizeCanvas(canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);

    const bg = WebGLUtils.hexToRgb(params.mink_bg || '#000000');
    gl.clearColor(bg[0], bg[1], bg[2], 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const levels = Math.round(params.mink_levels ?? 3);
    const zoom = params.zoom ?? 1.0;
    const offsetX = params.offsetX ?? 0;
    const offsetY = params.offsetY ?? 0;

    const vertices = buildMinkowskiIsland(levels);
    vertexCount = vertices.length / 2;

    if (!posBuffer) posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    gl.useProgram(program);

    const aPos = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uScale = gl.getUniformLocation(program, 'u_scale');
    const uOffset = gl.getUniformLocation(program, 'u_offset');
    const uColor = gl.getUniformLocation(program, 'u_color');
    const uRes = gl.getUniformLocation(program, 'u_resolution');

    const color = WebGLUtils.hexToRgb(params.mink_color || '#00e5ff');

    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uScale, 1.0 / zoom);
    gl.uniform2f(uOffset, offsetX, offsetY);
    gl.uniform3fv(uColor, color);

    gl.drawArrays(gl.LINES, 0, vertexCount);

    return vertexCount;
  }

  // ── Animation ───────────────────────────────────────────────────────────
  let animFrame = null;

  function renderAnimated(canvas, params, onDone) {
    if (animFrame) cancelAnimationFrame(animFrame);

    if (!gl || !program) {
      if (!init(canvas)) return;
    }

    WebGLUtils.resizeCanvas(canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);

    const levels = Math.round(params.mink_levels ?? 3);
    const zoom = params.zoom ?? 1.0;
    const offsetX = params.offsetX ?? 0;
    const offsetY = params.offsetY ?? 0;
    const vertices = buildMinkowskiIsland(levels);

    const totalVerts = vertices.length / 2;

    if (!posBuffer) posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, 'a_position');
    const uScale = gl.getUniformLocation(program, 'u_scale');
    const uOffset = gl.getUniformLocation(program, 'u_offset');
    const uColor = gl.getUniformLocation(program, 'u_color');
    const uRes = gl.getUniformLocation(program, 'u_resolution');

    const color = WebGLUtils.hexToRgb(params.mink_color || '#00e5ff');
    const bg = WebGLUtils.hexToRgb(params.mink_bg || '#000000');

    const LINES_PER_FRAME = Math.max(4, Math.floor(totalVerts / 60));
    let drawn = 0;

    function drawFrame() {
      drawn = Math.min(drawn + LINES_PER_FRAME * 2, totalVerts);
      const drawCount = Math.floor(drawn / 2) * 2;

      gl.clearColor(bg[0], bg[1], bg[2], 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uScale, 1.0 / zoom);
      gl.uniform2f(uOffset, offsetX, offsetY);
      gl.uniform3fv(uColor, color);

      gl.drawArrays(gl.LINES, 0, drawCount);

      if (drawn < totalVerts) {
        animFrame = requestAnimationFrame(drawFrame);
      } else {
        animFrame = null;
        if (onDone) onDone(totalVerts);
      }
    }

    animFrame = requestAnimationFrame(drawFrame);
  }

  function stop() {
    if (animFrame) {
      cancelAnimationFrame(animFrame);
      animFrame = null;
    }
  }

  return {
    init,
    render,
    renderAnimated,
    stop,
    buildMinkowskiIsland
  };
})();