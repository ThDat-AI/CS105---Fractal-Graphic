// scripts/koch.js
// Vẽ bông tuyết Koch (Koch Snowflake) bằng WebGL - FIX chuẩn toán học

const KochRenderer = (() => {

  // ── Vertex Shader ──────────────────────────────────────────────────────
  const VS_SRC = `
    attribute vec2 a_position;
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
    uniform vec3 u_colorA;

    void main() {
      gl_FragColor = vec4(u_colorA, 1.0);
    }
  `;

  // ── Koch Segment (FIX: thêm dir để điều khiển hướng) ────────────────────
  function kochSegment(p1, p2, level, outLines, dir) {
    if (level === 0) {
      outLines.push(p1.x, p1.y, p2.x, p2.y);
      return;
    }

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    const a = { x: p1.x + dx / 3,     y: p1.y + dy / 3 };
    const b = { x: p1.x + dx * 2 / 3, y: p1.y + dy * 2 / 3 };

    // 🔥 FIX QUAN TRỌNG: dùng dir để quyết định xoay +60 hay -60
    const angle = dir * Math.PI / 3;
    const cos60 = Math.cos(angle);
    const sin60 = Math.sin(angle);

    const abx = b.x - a.x;
    const aby = b.y - a.y;

    const peak = {
      x: a.x + abx * cos60 - aby * sin60,
      y: a.y + abx * sin60 + aby * cos60
    };

    kochSegment(p1,   a,    level - 1, outLines, dir);
    kochSegment(a,    peak, level - 1, outLines, dir);
    kochSegment(peak, b,    level - 1, outLines, dir);
    kochSegment(b,    p2,   level - 1, outLines, dir);
  }

  // ── Build Snowflake ─────────────────────────────────────────────────────
  function buildKochSnowflake(levels) {
    const R = 0.85;

    const p1 = { x: 0,                    y:  R };
    const p2 = { x: -R * Math.sqrt(3)/2,  y: -R/2 };
    const p3 = { x:  R * Math.sqrt(3)/2,  y: -R/2 };

    const lines = [];

    // 🔥 FIX: đảo chiều để đảm bảo "gai" luôn hướng ra ngoài
    kochSegment(p1, p2, levels, lines, -1);
    kochSegment(p2, p3, levels, lines, -1);
    kochSegment(p3, p1, levels, lines, -1);

    return new Float32Array(lines);
  }

  // ── State ───────────────────────────────────────────────────────────────
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

    const bg = WebGLUtils.hexToRgb(params.koch_bg || '#000000');
    gl.clearColor(bg[0], bg[1], bg[2], 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const levels = Math.round(params.koch_levels ?? 4);
    const scale  = params.koch_scale || 0.9;

    const vertices = buildKochSnowflake(levels);
    vertexCount = vertices.length / 2;

    if (!posBuffer) posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    gl.useProgram(program);

    const aPos = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uScale  = gl.getUniformLocation(program, 'u_scale');
    const uOffset = gl.getUniformLocation(program, 'u_offset');
    const uColorA = gl.getUniformLocation(program, 'u_colorA');

    const colorA = WebGLUtils.hexToRgb(params.koch_color_inner || '#00d4ff');

    gl.uniform1f(uScale, scale);
    gl.uniform2f(uOffset, 0.0, 0.0);
    gl.uniform3fv(uColorA, colorA);

    gl.drawArrays(gl.LINES, 0, vertexCount);

    return vertexCount;
  }

  // ── Animation (giữ nguyên logic) ─────────────────────────────────────────
  let animFrame = null;

  function renderAnimated(canvas, params, onDone) {
    if (animFrame) cancelAnimationFrame(animFrame);

    if (!gl || !program) {
      if (!init(canvas)) return;
    }

    WebGLUtils.resizeCanvas(canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);

    const levels = Math.round(params.koch_levels ?? 4);
    const scale  = params.koch_scale || 0.9;
    const bg     = WebGLUtils.hexToRgb(params.koch_bg || '#000000');
    const colorA = WebGLUtils.hexToRgb(params.koch_color_inner || '#00d4ff');

    const vertices = buildKochSnowflake(levels);
    const totalVerts = vertices.length / 2;

    if (!posBuffer) posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, 'a_position');
    const uScale  = gl.getUniformLocation(program, 'u_scale');
    const uOffset = gl.getUniformLocation(program, 'u_offset');
    const uColorA = gl.getUniformLocation(program, 'u_colorA');

    const LINES_PER_FRAME = Math.max(8, Math.floor(totalVerts / 80));
    let drawn = 0;
    let startTime = performance.now();

    function drawFrame() {
      drawn = Math.min(drawn + LINES_PER_FRAME * 2, totalVerts);
      const drawCount = Math.floor(drawn / 2) * 2;

      gl.clearColor(bg[0], bg[1], bg[2], 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      gl.uniform1f(uScale, scale);
      gl.uniform2f(uOffset, 0.0, 0.0);
      gl.uniform3fv(uColorA, colorA);

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
    if (animFrame) {
      cancelAnimationFrame(animFrame);
      animFrame = null;
    }
  }

  return { init, render, renderAnimated, stop, buildKochSnowflake };
})();