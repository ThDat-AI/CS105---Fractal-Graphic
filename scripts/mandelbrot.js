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
      precision highp float; // Dùng highp cho mượt hơn
      uniform vec2 u_resolution;
      uniform vec2 u_center;
      uniform float u_scale;
      uniform int u_maxIter;

      void main() {
        // 1. Tính toán tọa độ
        vec2 uv = (gl_FragCoord.xy / u_resolution) * 2.0 - 1.0;
        uv.x *= u_resolution.x / u_resolution.y;
        
        vec2 c = uv * u_scale + u_center;
        vec2 z = vec2(0.0);
        float iter = 0.0;

        // 2. Vòng lặp Mandelbrot
        for (int i = 0; i < 1000; i++) {
          if (i >= u_maxIter) break;
          z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
          if (length(z) > 2.0) break;
          iter += 1.0;
        }

        // 3. Tính toán màu sắc (ĐỒNG BỘ VỚI MINIMAP)
        vec3 color;
        if (iter == float(u_maxIter)) {
          // Màu Navy tối cho vùng bên trong tập hợp
          color = vec3(0.05, 0.1, 0.2); 
        } else {
          // Công thức màu cosine giống hệt MiniMap
          // (3.0 là offset pha, 0.15 là tốc độ đổi màu)
          float t = iter * 0.15;
          color = 0.5 + 0.5 * cos(3.0 + t + vec3(0.0, 0.6, 1.0));
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

      // Đồng bộ các thông số zoom/vị trí
      const maxIter = Math.round(params.mandel_iter || 100); // 100 giống minimap
      const scale = 1.5 / (params.mandel_zoom || 1.0);      // Dùng 1.5 giống scale minimap
      const centerX = params.mandel_cx ?? -0.5;
      const centerY = params.mandel_cy ?? 0.0;

      gl.useProgram(program);

      // Truyền các Uniforms cần thiết
      const uResolution = gl.getUniformLocation(program, 'u_resolution');
      const uCenter = gl.getUniformLocation(program, 'u_center');
      const uScale = gl.getUniformLocation(program, 'u_scale');
      const uMaxIter = gl.getUniformLocation(program, 'u_maxIter');

      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform2f(uCenter, centerX, centerY);
      gl.uniform1f(uScale, scale);
      gl.uniform1i(uMaxIter, maxIter);

      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
      const aPos = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

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
