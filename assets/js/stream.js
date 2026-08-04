// Ambient "river of consciousness" background — the same shader the app runs.
//
// Ported verbatim from dream-app/mobile/theme/streamShader.js (GLSL/WebGL path)
// and streamPalettes.js. The generator functions are kept rather than pasting the
// expanded source so parity with upstream stays obvious: if the app's shader
// changes, the diff lands in the same shapes here.
//
// A single full-screen canvas is fixed behind the page at z-index -1. Time is
// throttled to ~30fps to match the app. Under prefers-reduced-motion the clock
// never advances, so one still frame renders and the loop stops.
(function () {
  'use strict';

  // ── Palette ────────────────────────────────────────────────────────────────
  // Six rgb (0-1) stops the shader walks as a smooth cyclic ramp, so the last
  // stop wraps back into the first — a ring, not a gradient. The app ships four
  // palettes; the site uses "Lucid", the app's default.
  var STOPS = [
    [0.44, 0.88, 0.64], // mint
    [0.36, 0.82, 0.9], // aqua
    [0.44, 0.66, 0.96], // sky
    [0.56, 0.6, 0.97], // periwinkle
    [0.76, 0.66, 0.97], // lavender
    [0.92, 0.74, 0.9], // lilac
  ];

  // The app's "subtle" intensity preset, not its "medium" default. streamPalettes.js
  // says why subtle exists: "the full-bleed background sits directly under body
  // text". On a phone that is occasionally true — most of the screen is covered by
  // opaque glass cards. On a desktop page it is true everywhere, all the time, so
  // subtle is the correct preset here rather than a deviation from the app.
  //
  // A page-wide scrim sits over this too (see `body::before` in site.css); the two
  // multiply, and were tuned together.
  var INTENSITY = 0.3;

  var STOP_COUNT = 6;
  var STOP_UNIFORMS = [];
  for (var i = 0; i < STOP_COUNT; i++) STOP_UNIFORMS.push('u_s' + i);

  // Stops arrive as uniforms so the ramp is data, not source. Built as a nested
  // ternary rather than array indexing to stay portable to GLSL ES 1.00, which
  // only allows constant indices into uniform arrays.
  function paletteBody() {
    var N = STOP_COUNT;
    var decls = STOP_UNIFORMS.map(function (name) {
      return 'uniform vec3 ' + name + ';';
    }).join('\n');
    var chain = function (off) {
      var e = 'u_s' + ((N - 1 + off) % N);
      for (var i = N - 2; i >= 0; i--) e = 'seg < ' + (i + 1) + '.0 ? u_s' + ((i + off) % N) + ' : (' + e + ')';
      return e;
    };
    return (
      decls +
      '\nvec3 streamPalette(float h) {\n' +
      '  float seg = fract(h) * ' + N + '.0;\n' +
      '  float f = fract(seg);\n' +
      // Bias toward the plateaus so each band stays a fairly solid colour and the
      // hue change happens over a short span — crisp paint edges, not a smear.
      '  f = smoothstep(0.3, 0.7, f);\n' +
      '  vec3 c0 = ' + chain(0) + ';\n' +
      '  vec3 c1 = ' + chain(1) + ';\n' +
      '  return mix(c0, c1, f);\n' +
      '}'
    );
  }

  // ── Noise ──────────────────────────────────────────────────────────────────
  // A sin-free hash feeds a smooth value-noise fbm. Two octaves only — the marble
  // wants big smooth folds, not fine grain. Every intermediate is kept small
  // enough to survive mediump: the app hit real phone GPUs where large products
  // lost their fractional bits and the field collapsed into flat facets.
  var NOISE = [
    'float hash21(vec2 p) {',
    '  vec3 p3 = fract(vec3(p.x, p.y, p.x) * 0.1031);',
    '  p3 += dot(p3, vec3(p3.y, p3.z, p3.x) + 33.33);',
    '  return fract((p3.x + p3.y) * p3.z);',
    '}',
    '',
    'float vnoise(vec2 p) {',
    '  vec2 i = floor(p);',
    '  vec2 f = fract(p);',
    '  vec2 u = f * f * (3.0 - 2.0 * f);',
    // Wrap the lattice onto a 256-unit torus before hashing: the flow offset grows
    // without bound the longer the page is open, and large coords are exactly what
    // breaks the hash. 256 units is far wider than the screen, so the repeat never
    // becomes visible.
    '  vec2 w = vec2(256.0, 256.0);',
    '  float a = hash21(mod(i, w));',
    '  float b = hash21(mod(i + vec2(1.0, 0.0), w));',
    '  float c = hash21(mod(i + vec2(0.0, 1.0), w));',
    '  float d = hash21(mod(i + vec2(1.0, 1.0), w));',
    '  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);',
    '}',
    '',
    'float fbm(vec2 p) {',
    '  float v = 0.0;',
    '  float amp = 0.5;',
    '  for (int i = 0; i < 2; i++) {',
    '    v += amp * vnoise(p);',
    '    p = p * 2.0 + vec2(37.1, 17.7);',
    '    amp *= 0.5;',
    '  }',
    '  return v;',
    '}',
  ].join('\n');

  // Two levels of domain warp fold the field into thick swirling ribbons, a
  // downward time offset makes them flow, the pastel ring colours them, and a
  // darker seam is dropped where bands meet. `uv` has y=0 at the top.
  var MARBLE = [
    'vec3 marble(vec2 uv, float aspect, float t) {',
    '  vec2 p = vec2(uv.x * aspect, uv.y) * 2.4;',
    '  vec2 flow = vec2(0.0, t * 1.2);',
    '',
    '  vec2 q = vec2(fbm(p + flow), fbm(p + vec2(5.2, 1.3) + flow));',
    '  vec2 r = vec2(fbm(p + 2.0 * q + vec2(1.7, 9.2) - flow * 0.6),',
    '                fbm(p + 2.0 * q + vec2(8.3, 2.8) - flow * 0.6));',
    '  float m = fbm(p + 2.5 * r + flow * 0.4);',
    '',
    // Spread the colour coordinate across the field so neighbouring ribbons land
    // on different pastel stops — distinct thick bands, not one flat tint.
    '  float coord = m * 2.2 + r.x * 1.1 + q.y * 0.5 + t * 0.1;',
    '  vec3 color = streamPalette(coord);',
    '',
    // Inky seams aligned to the colour bands, echoing a paint pour.
    '  float band = fract(coord * 3.0);',
    '  float seam = smoothstep(0.0, 0.04, band) * (1.0 - smoothstep(0.96, 1.0, band));',
    '  color *= 0.5 + 0.5 * seam;',
    '  return color;',
    '}',
  ].join('\n');

  var VS = [
    'attribute vec2 a_position;',
    'varying vec2 v_texCoord;',
    'void main() {',
    '  v_texCoord = a_position * 0.5 + 0.5;',
    '  gl_Position = vec4(a_position, 0.0, 1.0);',
    '}',
  ].join('\n');

  // v_texCoord is 0..1 with y=0 at the bottom, so the vertical axis is flipped to
  // keep the flow travelling top → bottom on screen. Full-bleed: no vignette or
  // edge fade — legibility behind text is the CSS layer's job (see .glass), not
  // the shader's.
  var FS = [
    'precision highp float;',
    'varying vec2 v_texCoord;',
    'uniform float u_time;',
    'uniform vec2 u_resolution;',
    'uniform float u_intensity;',
    NOISE,
    paletteBody(),
    MARBLE,
    '',
    'void main() {',
    '  vec2 uv = vec2(v_texCoord.x, 1.0 - v_texCoord.y);',
    '  float aspect = u_resolution.x / u_resolution.y;',
    '  float t = u_time * 0.06;',
    '  vec3 color = marble(uv, aspect, t) * u_intensity;',
    '  gl_FragColor = vec4(color, 1.0);',
    '}',
  ].join('\n');

  // ── Runtime ────────────────────────────────────────────────────────────────
  function start() {
    var canvas = document.getElementById('stream');
    if (!canvas) return;

    var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    // No WebGL: the CSS fallback gradient on <body> is already showing. Leave it.
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
    var uIntensity = gl.getUniformLocation(prog, 'u_intensity');
    var uStops = STOP_UNIFORMS.map(function (name) {
      return gl.getUniformLocation(prog, name);
    });

    // Cap DPR at 1.5 like the app — a full-screen fragment shader at 3x on a
    // retina laptop is a lot of pixels for a decorative background.
    var dpr = Math.min(1.5, window.devicePixelRatio || 1);
    var resize = function () {
      canvas.width = Math.max(1, Math.floor(window.innerWidth * dpr));
      canvas.height = Math.max(1, Math.floor(window.innerHeight * dpr));
    };
    resize();
    window.addEventListener('resize', resize);

    // The canvas is decorative. Once it stops being visible there is no reason to
    // keep a GPU program running in a background tab.
    var visible = true;
    document.addEventListener('visibilitychange', function () {
      visible = !document.hidden;
    });

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var draw = function (elapsed) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(uTime, elapsed);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uIntensity, INTENSITY);
      uStops.forEach(function (loc, i) {
        gl.uniform3f(loc, STOPS[i][0], STOPS[i][1], STOPS[i][2]);
      });
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    canvas.classList.add('is-live');

    if (reduceMotion) {
      // One still frame at a pleasant point in the flow, then nothing moves.
      draw(120);
      window.addEventListener('resize', function () {
        draw(120);
      });
      return;
    }

    var last = 0;
    var elapsed = 0;
    var prev = Date.now();
    var render = function () {
      var now = Date.now();
      if (visible) elapsed += (now - prev) / 1000;
      prev = now;
      if (visible && now - last >= 33) {
        last = now;
        draw(elapsed);
      }
      requestAnimationFrame(render);
    };
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
