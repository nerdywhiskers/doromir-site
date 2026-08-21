// The breathing "dream orb" — the same shader the app runs behind the sunrise
// icon on the wake screen.
//
// Ported verbatim from dream-app/mobile/theme/orbShader.js (the GLSL_FS branch,
// which is what ShaderOrb.web.js compiles) so the hero orb and the one in the
// wake screenshot beside it are literally the same object at two sizes.
//
// One deliberate change from upstream, in the final line only. The app returns
// `vec4(color, 1.0)` because the wake screen behind it is opaque black, so black
// output *is* transparency there. The hero sits over the ambient background, where
// an opaque black square would punch a hole in it. So alpha is recovered from the
// colour the shader already computed — WebGL canvases composite premultiplied by
// default, and the shader's output is exactly a premultiplied colour, so
// `vec4(color, max(color))` renders identically over black and correctly over
// anything else. Every line above it is verbatim, and this cannot drift: if the
// orb's maths changes upstream, the alpha follows it for free.
(function () {
  'use strict';

  // Relaxing green — soft emerald core, mint halo. rgb 0-1, from ORB_CORE and
  // ORB_GLOW upstream.
  var CORE = [0.28, 0.8, 0.56];
  var GLOW = [0.55, 0.92, 0.74];

  var v3 = function (c) {
    return 'vec3(' + c[0] + ', ' + c[1] + ', ' + c[2] + ')';
  };

  var VS = [
    'attribute vec2 a_position;',
    'varying vec2 v_texCoord;',
    'void main() {',
    '  v_texCoord = a_position * 0.5 + 0.5;',
    '  gl_Position = vec4(a_position, 0.0, 1.0);',
    '}',
  ].join('\n');

  // A breathing circle with a simplex-noise-wobbled edge and an exponential halo,
  // plus a touch of film grain, faded to black before the canvas edge.
  var FS = [
    'precision highp float;',
    'varying vec2 v_texCoord;',
    'uniform float u_time;',
    'uniform vec2 u_resolution;',
    '',
    'vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }',
    'vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }',
    'vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }',
    '',
    'float snoise(vec2 v) {',
    '  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);',
    '  vec2 i = floor(v + dot(v, C.yy));',
    '  vec2 x0 = v - i + dot(i, C.xx);',
    '  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);',
    '  vec4 x12 = x0.xyxy + C.xxzz;',
    '  x12.xy -= i1;',
    '  i = mod289(i);',
    '  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));',
    '  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);',
    '  m = m * m; m = m * m;',
    '  vec3 x = 2.0 * fract(p * C.www) - 1.0;',
    '  vec3 h = abs(x) - 0.5;',
    '  vec3 a0 = x - floor(x + 0.5);',
    '  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);',
    '  vec3 g;',
    '  g.x = a0.x * x0.x + h.x * x0.y;',
    '  g.yz = a0.yz * x12.xz + h.yz * x12.yw;',
    '  return 130.0 * dot(m, g);',
    '}',
    '',
    'void main() {',
    '  vec2 uv = v_texCoord;',
    '  float aspect = u_resolution.x / u_resolution.y;',
    '  vec2 p = uv - vec2(0.5, 0.5);',
    '  p.x *= aspect;',
    '  float dist = length(p);',
    '',
    '  float breathing = sin(u_time * 1.5) * 0.5 + 0.5;',
    '  float baseRadius = 0.25 + breathing * 0.05;',
    '  float angle = atan(p.y, p.x);',
    '  float wobble = snoise(vec2(cos(angle), sin(angle)) + u_time * 0.5) * 0.03;',
    '  float finalRadius = baseRadius + wobble;',
    '',
    '  float orb = smoothstep(finalRadius + 0.15, finalRadius - 0.15, dist);',
    '  float glow = exp(-dist * 4.0) * (0.3 + breathing * 0.2);',
    '',
    '  vec3 core = ' + v3(CORE) + ';',
    '  vec3 halo = ' + v3(GLOW) + ';',
    '  vec3 color = core * orb + halo * glow * (1.0 - orb * 0.5);',
    '  float grain = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);',
    '  color += (grain - 0.5) * 0.025;',
    '',
    // Fade to black before the edge so the square dissolves rather than showing a
    // hard rim. With the alpha below, that same fade is also the alpha ramp.
    '  float vignette = 1.0 - smoothstep(0.4, 0.5, dist);',
    '  color *= vignette;',
    '',
    '  float alpha = clamp(max(max(color.r, color.g), color.b), 0.0, 1.0);',
    '  gl_FragColor = vec4(color, alpha);',
    '}',
  ].join('\n');

  function mount(canvas) {
    var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    // No WebGL: the CSS radial-gradient stand-in on `.orb` is already showing, and
    // it is the same two greens. Leave it.
    if (!gl) return;

    var compile = function (type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
      return s;
    };
    var vs = compile(gl.VERTEX_SHADER, VS);
    var fs = compile(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return;

    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var pos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    var uTime = gl.getUniformLocation(prog, 'u_time');
    var uRes = gl.getUniformLocation(prog, 'u_resolution');

    // The app caps at 2x; this one is several times larger on screen, so 1.5 —
    // the same cap the ambient background uses — is plenty for a soft gradient.
    var dpr = Math.min(1.5, window.devicePixelRatio || 1);
    var resize = function () {
      canvas.width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      canvas.height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    };
    resize();

    var draw = function (t) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    canvas.classList.add('is-live');

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // The orb is a fixed square in a column that reflows on its own, so the window
    // is not the only thing that can change its size.
    if (typeof ResizeObserver === 'function') {
      new ResizeObserver(function () {
        resize();
        if (reduceMotion) draw(1.05);
      }).observe(canvas);
    } else {
      window.addEventListener('resize', function () {
        resize();
        if (reduceMotion) draw(1.05);
      });
    }

    if (reduceMotion) {
      // One still frame near the top of the breath, where the orb is widest and
      // the halo brightest — the pose the animation spends most of its time near.
      draw(1.05);
      return;
    }

    var visible = true;
    document.addEventListener('visibilitychange', function () {
      visible = !document.hidden;
    });

    var start = Date.now();
    var render = function () {
      if (visible) draw((Date.now() - start) / 1000);
      requestAnimationFrame(render);
    };
    render();
  }

  function boot() {
    var orbs = document.querySelectorAll('canvas[data-orb]');
    for (var i = 0; i < orbs.length; i++) mount(orbs[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
