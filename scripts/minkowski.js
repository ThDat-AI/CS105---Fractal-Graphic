// scripts/minkowski.js
// Vẽ đường cong Minkowski (Minkowski Curve) bằng WebGL

const MinkowskiRenderer = (() => {

  // ── Vertex Shader ──────────────────────────────────────────────────────
  const VS_SRC = `
    attribute vec2 a_position;
    uniform vec2  u_resolution;
    uniform float u_scale;
    uniform vec2  u_offset;

    void main() {
      // Đưa tọa độ [-1,1] vào clip space
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

  // ── Sinh điểm Minkowski đệ quy (CPU) ─────────────────────────────────────
  /**
   * Tạo một bước Minkowski: thay đoạn thẳng [p1, p2]
   * bằng 8 đoạn tạo thành hình vuông lồi ra ngoài.
   */
  function minkowskiSegment(p1, p2, level, outLines) {
    if (level === 0) {
      outLines.push(p1.x, p1.y, p2.x, p2.y);
      return;
    }

    // Chia đoạn thành 4 phần bằng nhau
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    const a = { x: p1.x + dx / 4, y: p1.y + dy / 4 };
    const b = { x: p1.x + dx / 2, y: p1.y + dy / 2 };
    const c = { x: p1.x + 3 * dx / 4, y: p1.y + 3 * dy / 4 };

    // Tính vector pháp tuyến (xoay 90°)
    const nx = -dy;
    const ny = dx;
    const length = Math.sqrt(nx * nx + ny * ny);
    const normalX = nx / length;
    const normalY = ny / length;

    // Điểm nhô ra (khoảng cách bằng 1/4 đoạn)
    const dist = Math.sqrt(dx * dx + dy * dy) / 4;
    const e = { x: b.x + normalX * dist, y: b.y + normalY * dist };
    const f = { x: b.x + normalX * dist * 2, y: b.y + normalY * dist * 2 };
    const g = { x: c.x + normalX * dist, y: c.y + normalY * dist };

    // 8 đoạn Minkowski
    minkowskiSegment(p1, a, level - 1, outLines);
    minkowskiSegment(a, e, level - 1, outLines);
    minkowskiSegment(e, f, level - 1, outLines);
    minkowskiSegment(f, g, level - 1, outLines);
    minkowskiSegment(g, c, level - 1, outLines);
    minkowskiSegment(c, p2, level - 1, outLines);
  }

  /**
   * Tạo toàn bộ đỉnh của đường cong Minkowski.
   * Bắt đầu từ một đoạn thẳng ngang.
   * @param {number} levels - số cấp đệ quy (1–5)
   * @returns {Float32Array} mảng [x1,y1, x2,y2, ...] (LINE_SEGMENTS)
   */
  function buildMinkowskiCurve(levels) {
    const lines = [];

    // Bắt đầu từ đoạn thẳng ngang
    const p1 = { x: -0.8, y: 0.0 };
    const p2 = { x: 0.8, y: 0.0 };

    minkowskiSegment(p1, p2, levels, lines);

    return new Float32Array(lines);
  }

  // ── Trạng thái renderer ─────────────────────────────────────────────────
  let gl, program, posBuffer;
  let vertexCount = 0;

  // ── Khởi tạo ────────────────────────────────────────────────────────────
  function init(canvas) {
    gl = WebGLUtils.initGL(canvas);
    if (!gl) return false;

    program = WebGLUtils.createProgram(gl, VS_SRC, FS_SRC);
    if (!program) return false;

    return true;
  }

  // ── Render với params ────────────────────────────────────────────────────
  function render(canvas, params) {
    if (!gl || !program) {
      if (!init(canvas)) return 0;
    }

    WebGLUtils.resizeCanvas(canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Clear background
    const bg = WebGLUtils.hexToRgb(params.mink_bg || '#000000');
    gl.clearColor(bg[0], bg[1], bg[2], 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const levels = Math.round(params.mink_levels || 3);
    const scale = 1.0; // Có thể thêm param scale sau

    // Build geometry
    const vertices = buildMinkowskiCurve(levels);
    vertexCount = vertices.length / 2;

    // Upload buffer
    if (!posBuffer) posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Use program
    gl.useProgram(program);

    // Attribute: a_position
    const aPos = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(aPos);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // Uniforms
    const uScale = gl.getUniformLocation(program, 'u_scale');
    const uOffset = gl.getUniformLocation(program, 'u_offset');
    const uColor = gl.getUniformLocation(program, 'u_color');
    const uRes = gl.getUniformLocation(program, 'u_resolution');

    const color = WebGLUtils.hexToRgb(params.mink_color || '#ff6b35');

    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uScale, scale);
    gl.uniform2f(uOffset, 0.0, 0.0);
    gl.uniform3fv(uColor, color);

    // Draw as line segments
    gl.drawArrays(gl.LINES, 0, vertexCount);

    return vertexCount;
  }

  // ── Animated render (hiệu ứng vẽ dần) ───────────────────────────────────
  let animFrame = null;

  function renderAnimated(canvas, params, onDone) {
    if (animFrame) cancelAnimationFrame(animFrame);

    if (!gl || !program) {
      if (!init(canvas)) return;
    }

    WebGLUtils.resizeCanvas(canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);

    const levels = Math.round(params.mink_levels || 3);
    const color = WebGLUtils.hexToRgb(params.mink_color || '#ff6b35');
    const bg = WebGLUtils.hexToRgb(params.mink_bg || '#000000');

    const vertices = buildMinkowskiCurve(levels);
    const totalVerts = vertices.length / 2;

    if (!posBuffer) posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, 'a_position');
    const uScale = gl.getUniformLocation(program, 'u_scale');
    const uOffset = gl.getUniformLocation(program, 'u_offset');
    const uColor = gl.getUniformLocation(program, 'u_color');
    const uRes = gl.getUniformLocation(program, 'u_resolution');

    // Animate: vẽ từng đoạn thẳng dần dần
    const LINES_PER_FRAME = Math.max(4, Math.floor(totalVerts / 60));
    let drawn = 0;
    let startTime = performance.now();

    function drawFrame(ts) {
      drawn = Math.min(drawn + LINES_PER_FRAME * 2, totalVerts);
      // Số lượng đỉnh cần là bội của 2
      const drawCount = Math.floor(drawn / 2) * 2;

      gl.clearColor(bg[0], bg[1], bg[2], 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);
      gl.enableVertexAttribArray(aPos);
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uScale, 1.0);
      gl.uniform2f(uOffset, 0.0, 0.0);
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
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
  }

  return { init, render, renderAnimated, stop, buildMinkowskiCurve };
})();