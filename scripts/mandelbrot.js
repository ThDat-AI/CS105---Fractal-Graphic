// scripts/mandelbrot.js
// Vẽ Mandelbrot Set bằng WebGL

const MandelbrotRenderer = (() => {
  const VS_SRC = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const FS_SRC = `
    precision mediump float;
    uniform vec2 u_resolution;
    uniform vec2 u_center;
    uniform float u_scale;
    uniform int u_maxIter;
    uniform vec3 u_colorA;
    uniform vec3 u_bgColor;

    void main() {
      vec2 uv = (gl_FragCoord.xy / u_resolution) * 2.0 - 1.0;
      uv.x *= u_resolution.x / u_resolution.y;
      vec2 z = uv * u_scale + u_center;
      vec2 c = z;
      float iter = 0.0;
      float zx = 0.0;
      float zy = 0.0;
      float zx2 = 0.0;
      float zy2 = 0.0;

      for (int i = 0; i < 1000; i++) {
        if (i >= u_maxIter || zx2 + zy2 > 4.0) break;
        zy = 2.0 * zx * zy + c.y;
        zx = zx2 - zy2 + c.x;
        zx2 = zx * zx;
        zy2 = zy * zy;
        iter += 1.0;
      }

      float t = iter >= float(u_maxIter) ? 0.0 : iter / float(u_maxIter);
      vec3 color = mix(u_bgColor, u_colorA, sqrt(t));
      if (iter >= float(u_maxIter)) {
        color = u_bgColor;
      }
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  let gl = null;
  let program = null;
  let quadBuffer = null;
  let animFrame = null;

  function init(canvas) {
    gl = WebGLUtils.initGL(canvas);
    if (!gl) return false;

    program = WebGLUtils.createProgram(gl, VS_SRC, FS_SRC);
    if (!program) return false;

    const vertices = new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
       1.0,  1.0
    ]);

    quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    return true;
  }

  function render(canvas, params) {
    if (!gl || !program) {
      if (!init(canvas)) return 0;
    }

    WebGLUtils.resizeCanvas(canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);

    const maxIter = Math.round(params.mandel_iter || 200);
    const scale = 1.8 / (params.mandel_zoom || 1.0);
    const centerX = params.mandel_cx ?? -0.5;
    const centerY = params.mandel_cy ?? 0.0;
    const fractalColor = WebGLUtils.hexToRgb(params.mandel_bg || '#0077cc');
    const bgColor = WebGLUtils.hexToRgb(params.mandel_color || '#ffffff');

    gl.clearColor(bgColor[0], bgColor[1], bgColor[2], 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    const aPos = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(aPos);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(program, 'u_resolution');
    const uCenter = gl.getUniformLocation(program, 'u_center');
    const uScale = gl.getUniformLocation(program, 'u_scale');
    const uMaxIter = gl.getUniformLocation(program, 'u_maxIter');
    const uColorA = gl.getUniformLocation(program, 'u_colorA');
    const uBgColor = gl.getUniformLocation(program, 'u_bgColor');

    gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.uniform2f(uCenter, centerX, centerY);
    gl.uniform1f(uScale, scale);
    gl.uniform1i(uMaxIter, maxIter);
    gl.uniform3fv(uColorA, fractalColor);
    gl.uniform3fv(uBgColor, bgColor);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return maxIter;
  }

  function renderAnimated(canvas, params, onDone) {
    if (animFrame) cancelAnimationFrame(animFrame);
    if (!gl || !program) {
      if (!init(canvas)) return;
    }

    const targetIter = Math.max(20, Math.round(params.mandel_iter || 200));
    const steps = 20;
    const stepSize = Math.max(1, Math.floor(targetIter / steps));
    let currentIter = Math.min(16, targetIter);
    const start = performance.now();

    function nextFrame() {
      const tempParams = Object.assign({}, params, { mandel_iter: currentIter });
      render(canvas, tempParams);
      if (currentIter < targetIter) {
        currentIter = Math.min(targetIter, currentIter + stepSize);
        animFrame = requestAnimationFrame(nextFrame);
      } else {
        animFrame = null;
        if (onDone) onDone(targetIter, (performance.now() - start).toFixed(0));
      }
    }

    animFrame = requestAnimationFrame(nextFrame);
  }

  function stop() {
    if (animFrame) {
      cancelAnimationFrame(animFrame);
      animFrame = null;
    }
  }

  return { init, render, renderAnimated, stop };
})();
