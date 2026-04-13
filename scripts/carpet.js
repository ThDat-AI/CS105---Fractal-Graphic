const SierpinskiCarpetRenderer = (() => {
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

  function buildSierpinskiCarpet(levels) {
    const verts = [];
    function divide(x, y, size, lvl) {
      if (lvl === 0) {
        // 2 tam giác cho 1 hình vuông
        verts.push(
          x, y,           x + size, y,      x, y - size,
          x + size, y,    x + size, y - size, x, y - size
        );
        return;
      }
      const newSize = size / 3;
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          if (i === 1 && j === 1) continue; // Lỗ hổng ở giữa
          divide(x + i * newSize, y - j * newSize, newSize, lvl - 1);
        }
      }
    }
    divide(-0.9, 0.9, 1.8, levels);
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

    const levels = Math.max(0, Math.round(params.sier_c_levels ?? 4));
    const bg = WebGLUtils.hexToRgb(params.sier_c_bg || '#f8fbff'); 
    const color = WebGLUtils.hexToRgb(params.sier_c_color || '#ff3366');

    const vertices = buildSierpinskiCarpet(levels);
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
    gl.uniform1f(gl.getUniformLocation(program, 'u_scale'), 0.85);
    gl.uniform2f(gl.getUniformLocation(program, 'u_offset'), 0.0, 0.0);
    gl.uniform3fv(gl.getUniformLocation(program, 'u_color'), color);

    gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
    return vertexCount;
  }

  function renderAnimated(canvas, params, onDone) {
    if (animFrame) cancelAnimationFrame(animFrame);
    if (!gl || !program) { if (!init(canvas)) return; }
    
    WebGLUtils.resizeCanvas(canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);

    const levels = Math.max(0, Math.round(params.sier_c_levels ?? 4));
    const bg = WebGLUtils.hexToRgb(params.sier_c_bg || '#f8fbff');
    const color = WebGLUtils.hexToRgb(params.sier_c_color || '#ff3366');

    const vertices = buildSierpinskiCarpet(levels);
    const totalVerts = vertices.length / 2;

    if (!posBuffer) posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, 'a_position');
    
    const VERTS_PER_FRAME = Math.max(6, Math.floor(totalVerts / 60 / 6) * 6); 
    let drawn = 0;
    let startTime = performance.now();

    function drawFrame() {
      drawn = Math.min(drawn + VERTS_PER_FRAME, totalVerts);
      
      gl.clearColor(bg[0], bg[1], bg[2], 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);
      gl.enableVertexAttribArray(aPos);
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      gl.uniform2f(gl.getUniformLocation(program, 'u_resolution'), canvas.width, canvas.height);
      gl.uniform1f(gl.getUniformLocation(program, 'u_scale'), 0.85);
      gl.uniform2f(gl.getUniformLocation(program, 'u_offset'), 0.0, 0.0);
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