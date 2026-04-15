// scripts/julia.js
// Vẽ Julia Set bằng WebGL - Đồng bộ màu sắc với MiniMap

const JuliaRenderer = (() => {
  const VS_SRC = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const FS_SRC = `
    precision highp float;
    uniform vec2 u_resolution;
    uniform vec2 u_c;          // Tọa độ số phức c (điểm chọn từ minimap)
    uniform vec2 u_center;     // Tâm của view hiện tại (pan)
    uniform float u_scale;
    uniform int u_maxIter;

    void main() {
      // 1. Tính toán tọa độ
      vec2 uv = (gl_FragCoord.xy / u_resolution) * 2.0 - 1.0;
      uv.x *= u_resolution.x / u_resolution.y;
      
      vec2 z = uv * u_scale + u_center;
      float iter = 0.0;

      // 2. Vòng lặp Julia: z = z^2 + c
      for (int i = 0; i < 1000; i++) {
        if (i >= u_maxIter) break;
        z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + u_c;
        if (length(z) > 2.0) break;
        iter += 1.0;
      }

      // 3. Phối màu ĐỒNG BỘ VỚI MINIMAP
      vec3 color;
      if (iter == float(u_maxIter)) {
        // Màu Navy tối cho vùng bên trong tập hợp Julia
        color = vec3(0.05, 0.1, 0.2); 
      } else {
        // Bảng màu Cosine Neon (giống MiniMap)
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

    const vertices = new Float32Array([-1,-1, 1,-1, -1,1, 1,1]);
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

    // Đồng bộ các thông số kỹ thuật
    const maxIter = Math.round(params.julia_iter || 150);
    const scale = 1.5 / (params.julia_zoom || 1.0); // 1.5 để khớp tỷ lệ với MiniMap
    const cx = params.julia_cr ?? -0.7;
    const cy = params.julia_ci ?? 0.27;
    const centerX = params.julia_centerX || 0.0;
    const centerY = params.julia_centerY || 0.0;

    gl.useProgram(program);

    // Truyền Uniforms (đã lược bỏ các tham số màu thừa)
    const uRes = gl.getUniformLocation(program, 'u_resolution');
    const uC = gl.getUniformLocation(program, 'u_c');
    const uCenter = gl.getUniformLocation(program, 'u_center');
    const uScale = gl.getUniformLocation(program, 'u_scale');
    const uMaxIter = gl.getUniformLocation(program, 'u_maxIter');

    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform2f(uC, cx, cy);
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
    const targetIter = Math.max(20, Math.round(params.julia_iter || 150));
    const stepSize = Math.max(1, Math.floor(targetIter / 15));
    let currentIter = 20;
    const start = performance.now();

    function nextFrame() {
      render(canvas, Object.assign({}, params, { julia_iter: currentIter }));
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
    if (animFrame) cancelAnimationFrame(animFrame);
  }

  return { init, render, renderAnimated, stop };
})();