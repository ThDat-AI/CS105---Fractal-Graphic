// scripts/koch.js
// Vẽ bông tuyết Koch (Koch Snowflake) bằng WebGL

const KochRenderer = (() => {

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
  // Tô màu gradient theo chiều dài dọc (y) để tạo hiệu ứng neon
  const FS_SRC = `
    precision mediump float;
    uniform vec3  u_colorA;
    uniform vec3  u_colorB;
    uniform float u_time;

    void main() {
      // Đơn giản: dùng màu đồng nhất u_colorA
      // (Gradient nâng cao có thể thêm varying sau)
      gl_FragColor = vec4(u_colorA, 1.0);
    }
  `;

  // ── Sinh điểm Koch đệ quy (CPU) ─────────────────────────────────────────
  /**
   * Tạo một bước Koch: thay đoạn thẳng [p1, p2]
   * bằng 4 đoạn qua đỉnh "tai mèo" nhô ra ngoài.
   */
  function kochSegment(p1, p2, level, outLines) {
    if (level === 0) {
      outLines.push(p1.x, p1.y, p2.x, p2.y);
      return;
    }
    // 5 điểm trên đoạn
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    const a = { x: p1.x + dx / 3,       y: p1.y + dy / 3 };
    const b = { x: p1.x + dx * 2 / 3,   y: p1.y + dy * 2 / 3 };

    // Đỉnh nhô ra: xoay đoạn [a,b] 60° ngược chiều kim đồng hồ quanh a
    const cos60 = Math.cos(Math.PI / 3);
    const sin60 = Math.sin(Math.PI / 3);
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const peak = {
      x: a.x + abx * cos60 - aby * sin60,
      y: a.y + abx * sin60 + aby * cos60
    };

    kochSegment(p1,   a,    level - 1, outLines);
    kochSegment(a,    peak, level - 1, outLines);
    kochSegment(peak, b,    level - 1, outLines);
    kochSegment(b,    p2,   level - 1, outLines);
  }

  /**
   * Tạo toàn bộ đỉnh của bông tuyết Koch (tam giác đều, 3 cạnh).
   * Canvas WebGL dùng tọa độ [-1, 1].
   * @param {number} levels - số cấp đệ quy (1–7)
   * @returns {Float32Array} mảng [x1,y1, x2,y2, ...] (LINE_SEGMENTS)
   */
  function buildKochSnowflake(levels) {
    const R = 0.85; // bán kính tam giác ngoại tiếp

    // 3 đỉnh tam giác đều, quay để đỉnh trên
    const angleOffset = -Math.PI / 2; // đỉnh nhọn hướng lên
    const p0 = {
      x: R * Math.cos(angleOffset + 0 * 2 * Math.PI / 3),
      y: R * Math.sin(angleOffset + 0 * 2 * Math.PI / 3)
    };
    const p1 = {
      x: R * Math.cos(angleOffset + 1 * 2 * Math.PI / 3),
      y: R * Math.sin(angleOffset + 1 * 2 * Math.PI / 3)
    };
    const p2 = {
      x: R * Math.cos(angleOffset + 2 * 2 * Math.PI / 3),
      y: R * Math.sin(angleOffset + 2 * 2 * Math.PI / 3)
    };

    const lines = [];
    kochSegment(p0, p1, levels, lines);
    kochSegment(p1, p2, levels, lines);
    kochSegment(p2, p0, levels, lines);

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
    const bg = WebGLUtils.hexToRgb(params.koch_bg || '#000000');
    gl.clearColor(bg[0], bg[1], bg[2], 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const levels = Math.round(params.koch_levels || 4);
    const scale  = params.koch_scale || 0.8;

    // Build geometry
    const vertices = buildKochSnowflake(levels);
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
    const uScale  = gl.getUniformLocation(program, 'u_scale');
    const uOffset = gl.getUniformLocation(program, 'u_offset');
    const uColorA = gl.getUniformLocation(program, 'u_colorA');
    const uColorB = gl.getUniformLocation(program, 'u_colorB');
    const uRes    = gl.getUniformLocation(program, 'u_resolution');

    const colorA = WebGLUtils.hexToRgb(params.koch_color_inner || '#00d4ff');
    const colorB = WebGLUtils.hexToRgb(params.koch_color_outer || '#39ff14');

    gl.uniform2f(uRes,    canvas.width, canvas.height);
    gl.uniform1f(uScale,  scale);
    gl.uniform2f(uOffset, 0.0, 0.0);
    gl.uniform3fv(uColorA, colorA);
    gl.uniform3fv(uColorB, colorB);

    // Draw as line segments
    gl.drawArrays(gl.LINES, 0, vertexCount);

    return vertexCount;
  }

  // ── Animated render (hiệu ứng vẽ dần) ──────────────────────────────────
  let animFrame = null;

  function renderAnimated(canvas, params, onDone) {
    if (animFrame) cancelAnimationFrame(animFrame);

    if (!gl || !program) {
      if (!init(canvas)) return;
    }

    WebGLUtils.resizeCanvas(canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);

    const levels = Math.round(params.koch_levels || 4);
    const scale  = params.koch_scale || 0.8;
    const bg     = WebGLUtils.hexToRgb(params.koch_bg || '#000000');
    const colorA = WebGLUtils.hexToRgb(params.koch_color_inner || '#00d4ff');
    const colorB = WebGLUtils.hexToRgb(params.koch_color_outer || '#39ff14');

    const vertices = buildKochSnowflake(levels);
    const totalVerts = vertices.length / 2;

    if (!posBuffer) posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const aPos  = gl.getAttribLocation(program, 'a_position');
    const uScale  = gl.getUniformLocation(program, 'u_scale');
    const uOffset = gl.getUniformLocation(program, 'u_offset');
    const uColorA = gl.getUniformLocation(program, 'u_colorA');
    const uColorB = gl.getUniformLocation(program, 'u_colorB');
    const uRes    = gl.getUniformLocation(program, 'u_resolution');

    // Animate: vẽ từng đoạn thẳng dần dần
    const LINES_PER_FRAME = Math.max(4, Math.floor(totalVerts / 60));
    let drawn = 0;
    let lastTime = null;
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

      gl.uniform2f(uRes,    canvas.width, canvas.height);
      gl.uniform1f(uScale,  scale);
      gl.uniform2f(uOffset, 0.0, 0.0);
      gl.uniform3fv(uColorA, colorA);
      gl.uniform3fv(uColorB, colorB);

      gl.drawArrays(gl.LINES, 0, drawCount);

      if (drawn < totalVerts) {
        animFrame = requestAnimationFrame(drawFrame);
      } else {
        animFrame = null;
        if (onDone) onDone(totalVerts, (performance.now() - startTime).toFixed(0));
      }
    }

    animFrame = requestAnimationFrame(drawFrame);
  }

  function stop() {
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
  }

  return { init, render, renderAnimated, stop, buildKochSnowflake };
})();
