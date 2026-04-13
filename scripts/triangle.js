const SierpinskiTriangleRenderer = (() => {
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

  const FS_SRC = `
    precision mediump float;
    uniform vec3 u_color;
    void main() {
      gl_FragColor = vec4(u_color, 1.0);
    }
  `;

  let gl, program, posBuffer;
  let vertexCount = 0;
  let animFrame = null;

  function buildSierpinskiTriangle(levels) {
    const R = 0.9;
    const p0 = { x: 0, y: R };
    const p1 = { x: R * Math.cos(-Math.PI / 6), y: R * Math.sin(-Math.PI / 6) };
    const p2 = { x: -R * Math.cos(-Math.PI / 6), y: R * Math.sin(-Math.PI / 6) };

    const verts = [];

    function divide(a, b, c, lvl) {
      if (lvl === 0) {
        verts.push(a.x, a.y, b.x, b.y, c.x, c.y);
        return;
      }
      const m1 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const m2 = { x: (b.x + c.x) / 2, y: (b.y + c.y) / 2 };
      const m3 = { x: (c.x + a.x) / 2, y: (c.y + a.y) / 2 };

      divide(a, m1, m3, lvl - 1);
      divide(m1, b, m2, lvl - 1);
      divide(m3, m2, c, lvl - 1);
    }

    divide(p0, p1, p2, levels);
    return new Float32Array(verts);
  }

  function init(canvas) {
    gl = WebGLUtils.initGL(canvas);
    if (!gl) return false;
    program = WebGLUtils.createProgram(gl, VS_SRC, FS_SRC);
    return !!program;
  }

  function render(canvas, params) {
    if (!gl || !program) { if (!init(canvas)) return 0; }
    WebGLUtils.resizeCanvas(canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);

    const levels = Math.max(0, Math.round(params.sier_t_levels ?? 6));
    const bg = WebGLUtils.hexToRgb(params.sier_t_bg || '#000000');
    const color = WebGLUtils.hexToRgb(params.sier_t_color || '#cc44ff');

    const vertices = buildSierpinskiTriangle(levels);
    vertexCount = vertices.length / 2;

    if (!posBuffer) posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    gl.clearColor(bg[0], bg[1], bg[2], 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    const aPos = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(aPos);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), canvas.width, canvas.height);
    gl.uniform1f(gl.getUniformLocation(program, 'u_scale'), 0.9);
    gl.uniform2f(gl.getUniformLocation(program, 'u_offset'), 0.0, -0.15);
    gl.uniform3fv(gl.getUniformLocation(program, 'u_color'), color);

    gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
    return vertexCount;
  }

  function renderAnimated(canvas, params, onDone) {
    if (animFrame) cancelAnimationFrame(animFrame);
    if (!gl || !program) { if (!init(canvas)) return; }
    
    WebGLUtils.resizeCanvas(canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);

    const levels = Math.max(0, Math.round(params.sier_t_levels ?? 6));
    const bg = WebGLUtils.hexToRgb(params.sier_t_bg || '#ffffff');
    const color = WebGLUtils.hexToRgb(params.sier_t_color || '#2408c2');

    const vertices = buildSierpinskiTriangle(levels);
    const totalVerts = vertices.length / 2;

    if (!posBuffer) posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, 'a_position');
    
    const TRIANGLES_PER_FRAME = Math.max(3, Math.floor(totalVerts / 60 / 3) * 3);
    let drawn = 0;
    let startTime = performance.now();

    function drawFrame() {
      drawn = Math.min(drawn + TRIANGLES_PER_FRAME, totalVerts);
      
      gl.clearColor(bg[0], bg[1], bg[2], 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);
      gl.enableVertexAttribArray(aPos);
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), canvas.width, canvas.height);
      gl.uniform1f(gl.getUniformLocation(program, 'u_scale'), 0.9);
      gl.uniform2f(gl.getUniformLocation(program, 'u_offset'), 0.0, -0.15);
      gl.uniform3fv(gl.getUniformLocation(program, 'u_color'), color);

      gl.drawArrays(gl.TRIANGLES, 0, drawn);

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

  return { init, render, renderAnimated, stop };
})();