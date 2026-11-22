// Rendu physique de la Lune (WebGL2).
// Chaque pixel du disque est ramené à sa latitude/longitude sélénographique,
// puis éclairé par la vraie direction du Soleil : la ligne d'ombre glisse
// d'elle-même sur les cratères, sans aucune image pré-calculée.
// Textures : NASA SVS CGI Moon Kit (LRO/LROC couleur, LOLA relief).

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vPos;
void main() { vPos = aPos; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
in vec2 vPos;
out vec4 outColor;

uniform sampler2D uColor;
uniform sampler2D uRelief;
uniform vec2 uReliefSize;
uniform mat3 uViewToBody;
uniform vec3 uSun;        // direction du Soleil (repère lunaire)
uniform vec3 uView;       // direction de l'observateur
uniform vec3 uEarth;      // direction de la Terre (lumière cendrée)
uniform float uRadius;    // rayon du disque (unités vPos)
uniform float uPx;        // taille d'un pixel (unités vPos)
uniform float uPhaseAngle;
uniform float uEarthshine;
uniform float uReliefK;
uniform float uFade;

const float PI = 3.14159265359;
const float R = 1737400.0;
const float HMIN = -9500.0;
const float HMAX = 10500.0;
const float SLOPE_K = 2.0;

vec2 uvOf(vec3 n) {
  return vec2(0.5 + atan(n.y, n.x) / (2.0 * PI), 0.5 - asin(clamp(n.z, -1.0, 1.0)) / PI);
}
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec2 p = vPos / uRadius;
  float r = length(p);
  float aa = uPx / uRadius;
  float edge = clamp((1.0 - r) / aa + 0.5, 0.0, 1.0);
  vec2 q = r > 0.9999 ? p / r * 0.9999 : p;

  vec3 nv = vec3(q, sqrt(max(0.0, 1.0 - dot(q, q))));
  vec3 n = normalize(uViewToBody * nv);
  vec2 uv = uvOf(n);

  // niveau de détail pour les lectures dans la boucle d'ombre (flot non uniforme)
  vec2 dx = dFdx(uv * uReliefSize), dy = dFdy(uv * uReliefSize);
  dx.x -= floor(dx.x / uReliefSize.x + 0.5) * uReliefSize.x;
  dy.x -= floor(dy.x / uReliefSize.x + 0.5) * uReliefSize.x;
  float lod = max(0.0, 0.5 * log2(max(dot(dx, dx), dot(dy, dy))));

  vec3 alb = pow(texture(uColor, uv).rgb, vec3(2.2));
  vec3 rel = textureLod(uRelief, uv, lod).rgb;
  vec2 slope = (rel.rg * 2.0 - 1.0) / SLOPE_K;

  float cl = sqrt(max(1e-6, 1.0 - n.z * n.z));
  vec3 east = vec3(-n.y, n.x, 0.0) / cl;
  vec3 north = cross(n, east);
  vec3 N = normalize(n - uReliefK * (slope.x * east + slope.y * north));

  float muM = dot(n, uSun);                 // Soleil sur la sphère lisse
  float mu0 = dot(N, uSun);                 // Soleil sur la pente réelle
  float mu = max(dot(n, uView), 0.02);

  // Loi « lunar-Lambert » (McEwen) : la Lune reste claire jusqu'au bord.
  float a = uPhaseAngle;
  float L = clamp(1.0 - 0.019 * a + 2.42e-4 * a * a - 1.46e-6 * a * a * a, 0.0, 1.0);
  float m0 = max(mu0, 0.0);
  float sun = 2.0 * L * m0 / (m0 + mu) + (1.0 - L) * m0;

  // Ombres portées : on remonte vers le Soleil au-dessus du relief.
  if (sun > 0.0 && muM < 0.30 && muM > -0.06) {
    vec3 sT = uSun - muM * n;
    float sl = length(sT);
    if (sl > 1e-5) {
      vec3 sd = sT / sl;
      float de = dot(sd, east), dn = dot(sd, north);
      float tanE = muM / max(sl, 1e-4);
      float h0 = mix(HMIN, HMAX, rel.b) + 45.0;
      float shadow = 1.0;
      for (int i = 1; i <= 16; i++) {
        float t = 0.06 * pow(float(i) / 16.0, 1.8);
        vec2 duv = vec2(de * t / cl / (2.0 * PI), -dn * t / PI);
        float lodI = lod + log2(1.0 + t * 900.0) * 0.5;
        float hT = mix(HMIN, HMAX, textureLod(uRelief, uv + duv, lodI).b);
        float ray = h0 + R * t * tanE + 0.5 * R * t * t;
        float pen = R * t * 0.0093 + 60.0;   // pénombre : le Soleil fait un demi-degré
        shadow = min(shadow, clamp((ray - hT) / pen + 0.5, 0.0, 1.0));
      }
      sun *= shadow;
    }
  }

  vec3 col = alb * sun;

  // Lumière cendrée : la Terre éclaire faiblement la partie nocturne.
  float muE = max(dot(N, uEarth), 0.0);
  col += alb * muE * uEarthshine * vec3(0.80, 0.90, 1.12);

  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(lum), col, 0.6);
  col = 1.0 - exp(-col * 3.3);              // compression douce des hautes lumières
  col = pow(col, vec3(1.0 / 2.2));
  col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;

  float alpha = edge * uFade;
  outColor = vec4(col * alpha, alpha);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}

async function loadBitmap(url, data) {
  const blob = await (await fetch(url)).blob();
  return createImageBitmap(blob, data
    ? { colorSpaceConversion: 'none', premultiplyAlpha: 'none', imageOrientation: 'none' }
    : { imageOrientation: 'none' });
}

export class MoonRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: false, alpha: true });
    if (!gl) throw new Error('WebGL2 indisponible');
    this.gl = gl;
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    this.prog = prog;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    this.u = {};
    for (const name of ['uColor', 'uRelief', 'uReliefSize', 'uViewToBody', 'uSun', 'uView', 'uEarth', 'uRadius',
      'uPx', 'uPhaseAngle', 'uEarthshine', 'uReliefK', 'uFade']) this.u[name] = gl.getUniformLocation(prog, name);
    gl.uniform1i(this.u.uColor, 0);
    gl.uniform1i(this.u.uRelief, 1);

    this.aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    this.texColor = gl.createTexture();
    this.texRelief = gl.createTexture();
    this.ready = false;
    this.fade = 0;
    this.state = null;
    this.maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  }

  upload(tex, unit, bitmap, data) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, data ? gl.NONE : gl.BROWSER_DEFAULT_WEBGL);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (this.aniso) gl.texParameterf(gl.TEXTURE_2D, this.aniso.TEXTURE_MAX_ANISOTROPY_EXT, 8);
    if (unit === 1) this.reliefSize = [bitmap.width, bitmap.height];
  }

  /** Charge d'abord la version légère (affichage immédiat), puis la 4K. */
  async load(base = 'textures/') {
    const [c1, r1] = await Promise.all([loadBitmap(base + 'moon_color_1k.jpg'), loadBitmap(base + 'moon_relief_1k.webp', true)]);
    this.upload(this.texColor, 0, c1, false);
    this.upload(this.texRelief, 1, r1, true);
    this.ready = true;
    this.fadeIn();
    if (this.maxTex >= 4096) {
      const [c4, r4] = await Promise.all([loadBitmap(base + 'moon_color_4k.jpg'), loadBitmap(base + 'moon_relief_4k.webp', true)]);
      this.upload(this.texColor, 0, c4, false);
      this.upload(this.texRelief, 1, r4, true);
      this.draw();
    }
  }

  fadeIn() {
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 1800);
      this.fade = k * k * (3 - 2 * k);
      this.draw();
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  resize(cssSize) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.75);
    const px = Math.round(cssSize * dpr);
    if (this.canvas.width !== px) {
      this.canvas.width = this.canvas.height = px;
      this.canvas.style.width = this.canvas.style.height = cssSize + 'px';
    }
    this.draw();
  }

  /** moon : résultat de astro.moonAt ; options : { earthshine } */
  set(moon, options = {}) {
    this.state = moon;
    this.options = options;
    this.draw();
  }

  /** Rayon relatif du disque : la taille apparente suit vraiment la distance (super lune !). */
  radiusFor(distanceKm) { return 0.86 * (356500 / distanceKm); }

  draw() {
    if (!this.ready || !this.state) return;
    if (this.pending) return;
    this.pending = requestAnimationFrame(() => { this.pending = 0; this.render(); });
  }

  render() {
    const gl = this.gl, u = this.u, m = this.state;
    const size = this.canvas.width;
    gl.viewport(0, 0, size, size);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniformMatrix3fv(u.uViewToBody, false, m.viewToBody);
    gl.uniform3fv(u.uSun, m.sun);
    gl.uniform3fv(u.uView, m.view);
    gl.uniform3fv(u.uEarth, m.earth);
    gl.uniform2fv(u.uReliefSize, this.reliefSize);
    const radius = this.radiusFor(m.distanceKm);
    gl.uniform1f(u.uRadius, radius);
    gl.uniform1f(u.uPx, 2 / size);
    gl.uniform1f(u.uPhaseAngle, m.phaseAngle);
    const es = this.options.earthshine === false ? 0 : 0.014 * Math.pow(1 - m.fraction, 2);
    gl.uniform1f(u.uEarthshine, es);
    gl.uniform1f(u.uReliefK, 2.2);
    gl.uniform1f(u.uFade, this.fade);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
