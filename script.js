document.documentElement.classList.add("js");

const page = document.querySelector(".construction-page");
const hero = document.querySelector(".hero");
const navbar = document.querySelector(".navbar");
const tapeRails = document.querySelectorAll("[data-tape-rail]");
const footerReveal = document.querySelector(".footer-reveal");
const footer = document.querySelector(".site-footer");
const headlineBoundary = document.querySelector(".mesh-headline");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const videoCards = [...document.querySelectorAll(".video-card")];
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
const mobileViewport = window.matchMedia("(max-width: 820px)");

const lenis =
  typeof Lenis === "undefined"
    ? null
    : new Lenis({
        autoRaf: true,
        anchors: true,
        duration: 1.45,
        easing: (time) => 1 - Math.pow(1 - time, 4),
        smoothWheel: true,
        wheelMultiplier: 0.85,
        stopInertiaOnNavigate: true,
        respectReducedMotion: true,
      });

tapeRails.forEach((rail) => {
  const originalItems = [...rail.children];
  const tapeWidth = rail.parentElement?.getBoundingClientRect().width ?? 0;
  const originalWidth = originalItems.reduce(
    (width, item) => width + item.getBoundingClientRect().width,
    0,
  );
  let sequenceWidth = originalWidth;

  while (originalWidth > 0 && sequenceWidth < tapeWidth) {
    originalItems.forEach((item) => rail.append(item.cloneNode(true)));
    sequenceWidth += originalWidth;
  }

  const completeSequence = [...rail.children];

  completeSequence.forEach((item) => {
    const duplicate = item.cloneNode(true);
    duplicate.setAttribute("aria-hidden", "true");
    rail.append(duplicate);
  });
});

requestAnimationFrame(() => {
  page?.classList.add("is-ready");
});

let footerFrame = 0;

function updateFooterReveal() {
  footerFrame = 0;
  if (!footer || !footerReveal) return;

  if (headlineBoundary) {
    const pageTop = page?.getBoundingClientRect().top ?? 0;
    const headlineBottom =
      headlineBoundary.getBoundingClientRect().bottom - pageTop;
    footerReveal.style.setProperty(
      "--headline-bottom",
      `${headlineBottom.toFixed(2)}px`,
    );
  }

  if (reduceMotion.matches) return;

  const revealDistance = Math.max(
    0,
    window.innerHeight -
      footerReveal.getBoundingClientRect().top -
      window.innerHeight *
        Number(
          getComputedStyle(footerReveal).getPropertyValue(
            "--footer-reveal-guard",
          ) || 0,
        ),
  );
  const progress = Math.min(revealDistance / (window.innerHeight * 0.34), 1);
  const easedProgress = 1 - Math.pow(1 - progress, 3);

  footer.style.setProperty("--footer-reveal", easedProgress.toFixed(4));
  footer.style.setProperty(
    "--footer-blur",
    `${((1 - easedProgress) * 18).toFixed(2)}px`,
  );
  footer.style.setProperty(
    "--footer-offset",
    `${((1 - easedProgress) * 54).toFixed(2)}px`,
  );
  footer.style.setProperty(
    "--footer-scale",
    (0.985 + easedProgress * 0.015).toFixed(4),
  );

  // Preserve a crisp Hero while the footer comes into view, then ease it into
  // a dense blur as the footer reaches its fully revealed state.
  const heroBlurProgress = Math.min(
    Math.max((easedProgress - 0.7) / 0.3, 0),
    1,
  );
  const easedHeroBlur =
    heroBlurProgress * heroBlurProgress * (3 - 2 * heroBlurProgress);
  hero?.style.setProperty(
    "--hero-blur",
    `${(easedHeroBlur * 34).toFixed(2)}px`,
  );
  navbar?.style.setProperty(
    "--navbar-blur",
    `${(easedHeroBlur * 34).toFixed(2)}px`,
  );
}

function requestFooterUpdate() {
  if (!footerFrame) footerFrame = requestAnimationFrame(updateFooterReveal);
}

window.addEventListener("scroll", requestFooterUpdate, { passive: true });
window.addEventListener("resize", requestFooterUpdate, { passive: true });
lenis?.on("scroll", requestFooterUpdate);
updateFooterReveal();

function initVideoCardInteractions() {
  if (!hero || !videoCards.length) return;

  const resetParallax = () => {
    videoCards.forEach((card) => {
      card.style.setProperty("--card-parallax-x", "0px");
      card.style.setProperty("--card-parallax-y", "0px");
    });
  };

  const setExpandedCard = (selectedCard) => {
    videoCards.forEach((card) => {
      const isExpanded = card === selectedCard && !card.classList.contains("is-expanded");
      card.classList.toggle("is-expanded", isExpanded);
      card.setAttribute("aria-expanded", String(isExpanded));
      const projectName = card.querySelector("figcaption")?.textContent?.replace(" project preview", "") ?? "project preview";
      card.setAttribute(
        "aria-label",
        `${isExpanded ? "Minimize" : "Expand"} ${projectName}`,
      );
    });
  };

  hero.addEventListener("pointermove", (event) => {
    if (!finePointer.matches || reduceMotion.matches) return;

    const bounds = hero.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;

    videoCards.forEach((card, index) => {
      const depth = [14, 20, 16][index] ?? 14;
      const direction = index === 1 ? -1 : 1;
      card.style.setProperty("--card-parallax-x", `${(x * depth * direction).toFixed(2)}px`);
      card.style.setProperty("--card-parallax-y", `${(y * depth * direction).toFixed(2)}px`);
    });
  });

  hero.addEventListener("pointerleave", resetParallax);
  finePointer.addEventListener("change", resetParallax);
  reduceMotion.addEventListener("change", resetParallax);

  videoCards.forEach((card) => {
    card.addEventListener("click", () => {
      if (mobileViewport.matches) setExpandedCard(card);
    });

    card.addEventListener("keydown", (event) => {
      if (!mobileViewport.matches || (event.key !== "Enter" && event.key !== " ")) return;
      event.preventDefault();
      setExpandedCard(card);
    });
  });
}

initVideoCardInteractions();


function initMeshHeadline(wrapper) {
  if (reduceMotion.matches) return;

  const title = wrapper.querySelector("h1");
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: true,
  });

  if (!title || !gl) return;

  const gridWidth = 96;
  const gridHeight = 40;
  const vertexCount = (gridWidth + 1) * (gridHeight + 1);
  const positions = new Float32Array(vertexCount * 2);
  const uvs = new Float32Array(vertexCount * 2);
  const displacement = new Float32Array(vertexCount * 2);
  const velocity = new Float32Array(vertexCount * 2);

  for (let y = 0; y <= gridHeight; y += 1) {
    for (let x = 0; x <= gridWidth; x += 1) {
      const index = y * (gridWidth + 1) + x;
      const u = x / gridWidth;
      const v = y / gridHeight;
      positions[index * 2] = u * 2 - 1;
      positions[index * 2 + 1] = 1 - v * 2;
      uvs[index * 2] = u;
      uvs[index * 2 + 1] = v;
    }
  }

  const indices = new Uint32Array(gridWidth * gridHeight * 6);
  let indexOffset = 0;

  for (let y = 0; y < gridHeight; y += 1) {
    for (let x = 0; x < gridWidth; x += 1) {
      const a = y * (gridWidth + 1) + x;
      const b = a + 1;
      const c = a + gridWidth + 1;
      const d = c + 1;
      indices[indexOffset++] = a;
      indices[indexOffset++] = c;
      indices[indexOffset++] = b;
      indices[indexOffset++] = b;
      indices[indexOffset++] = c;
      indices[indexOffset++] = d;
    }
  }

  const vertexSource = `#version 300 es
    in vec2 aPosition;
    in vec2 aUv;
    in vec2 aDisplacement;
    out vec2 vUv;
    out float vMagnitude;

    void main() {
      gl_Position = vec4(aPosition + aDisplacement, 0.0, 1.0);
      vUv = aUv;
      vMagnitude = length(aDisplacement);
    }
  `;

  const fragmentSource = `#version 300 es
    precision highp float;
    in vec2 vUv;
    in float vMagnitude;
    uniform sampler2D uTexture;
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    out vec4 outColor;

    void main() {
      vec4 base = texture(uTexture, vUv);
      float offset = 0.005 * clamp(vMagnitude * 8.0, 0.0, 1.0);
      float alphaA = texture(uTexture, vUv + vec2(offset, 0.0)).a;
      float alphaB = texture(uTexture, vUv - vec2(offset, 0.0)).a;
      vec3 color = base.rgb * base.a;
      color += uColorA * max(0.0, alphaA - base.a);
      color += uColorB * max(0.0, alphaB - base.a);
      float alpha = max(base.a, max(alphaA, alphaB));
      outColor = vec4(color, alpha);
    }
  `;

  function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn("Mesh Text Hover shader could not be compiled.");
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertexShader || !fragmentShader) return;

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

  const vertexArray = gl.createVertexArray();
  gl.bindVertexArray(vertexArray);

  function bindAttribute(name, data, usage) {
    const location = gl.getAttribLocation(program, name);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, usage);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
    return buffer;
  }

  bindAttribute("aPosition", positions, gl.STATIC_DRAW);
  bindAttribute("aUv", uvs, gl.STATIC_DRAW);
  const displacementBuffer = bindAttribute(
    "aDisplacement",
    displacement,
    gl.DYNAMIC_DRAW,
  );
  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  const textureUniform = gl.getUniformLocation(program, "uTexture");
  const colorAUniform = gl.getUniformLocation(program, "uColorA");
  const colorBUniform = gl.getUniformLocation(program, "uColorB");
  const cursor = {
    x: 99,
    y: 99,
    previousX: 99,
    previousY: 99,
    inside: false,
  };
  let animationFrame = 0;
  let isVisible = true;

  wrapper.append(canvas);

  function drawTextWithSpacing(context, text, x, y, spacing) {
    let currentX = x;

    [...text].forEach((character) => {
      context.fillText(character, currentX, y);
      currentX += context.measureText(character).width + spacing;
    });
  }

  async function rebuildTexture() {
    const bounds = wrapper.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(2, Math.round(bounds.width * dpr));
    const height = Math.max(2, Math.round(bounds.height * dpr));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }

    try {
      await document.fonts?.ready;
    } catch {}

    const computed = getComputedStyle(title);
    const fontSize = parseFloat(computed.fontSize);
    const lineHeight = parseFloat(computed.lineHeight) || fontSize * 0.88;
    const letterSpacing = parseFloat(computed.letterSpacing) || 0;
    const textCanvas = document.createElement("canvas");
    textCanvas.width = width;
    textCanvas.height = height;
    const context = textCanvas.getContext("2d");
    context.scale(dpr, dpr);
    context.clearRect(0, 0, bounds.width, bounds.height);
    context.fillStyle =
      getComputedStyle(wrapper)
        .getPropertyValue("--mesh-text-color")
        .trim() || "#f5f5f1";
    context.textAlign = "left";
    context.textBaseline = "top";
    context.font = `${computed.fontStyle} ${computed.fontWeight} ${fontSize}px ${computed.fontFamily}`;

    const lines = title.innerText.split(/\r?\n/).filter(Boolean);
    lines.forEach((line, index) => {
      drawTextWithSpacing(
        context,
        line.trim(),
        Math.max(2, fontSize * 0.025),
        index * lineHeight,
        letterSpacing,
      );
    });

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      textCanvas,
    );
    wrapper.classList.add("is-mesh-ready");
  }

  function render() {
    const cursorVelocityX = cursor.x - cursor.previousX;
    const cursorVelocityY = cursor.y - cursor.previousY;
    const cursorSpeed = Math.hypot(cursorVelocityX, cursorVelocityY);
    const safeVelocityX = cursorSpeed > 0.3 ? 0 : cursorVelocityX;
    const safeVelocityY = cursorSpeed > 0.3 ? 0 : cursorVelocityY;
    cursor.previousX = cursor.x;
    cursor.previousY = cursor.y;

    for (let index = 0; index < vertexCount; index += 1) {
      const offset = index * 2;
      const deltaX = cursor.x - (positions[offset] + displacement[offset]);
      const deltaY = cursor.y - (positions[offset + 1] + displacement[offset + 1]);
      const distance = Math.hypot(deltaX, deltaY);
      const proximity = Math.max(0, 1 / (1 + distance / 0.05) - 0.1);

      let velocityX = velocity[offset];
      let velocityY = velocity[offset + 1];
      velocityX += safeVelocityX * 1.8 * proximity;
      velocityY += safeVelocityY * 1.8 * proximity;
      velocityX -= displacement[offset] * 0.08;
      velocityY -= displacement[offset + 1] * 0.08;
      velocityX *= 0.9;
      velocityY *= 0.9;
      velocity[offset] = velocityX;
      velocity[offset + 1] = velocityY;
      displacement[offset] = Math.max(
        -1,
        Math.min(1, displacement[offset] + velocityX * 0.1),
      );
      displacement[offset + 1] = Math.max(
        -1,
        Math.min(1, displacement[offset + 1] + velocityY * 0.1),
      );
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, displacementBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, displacement);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(textureUniform, 0);
    gl.uniform3f(colorAUniform, 1, 1, 0.031);
    gl.uniform3f(colorBUniform, 0, 0.435, 0.047);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindVertexArray(vertexArray);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_INT, 0);

    if (isVisible && !document.hidden) {
      animationFrame = requestAnimationFrame(render);
    } else {
      animationFrame = 0;
    }
  }

  wrapper.addEventListener("pointermove", (event) => {
    const bounds = wrapper.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    const y = 1 - ((event.clientY - bounds.top) / bounds.height) * 2;

    if (!cursor.inside) {
      cursor.previousX = x;
      cursor.previousY = y;
      cursor.inside = true;
    }

    cursor.x = x;
    cursor.y = y;
  });

  wrapper.addEventListener("pointerleave", () => {
    cursor.x = 99;
    cursor.y = 99;
    cursor.previousX = 99;
    cursor.previousY = 99;
    cursor.inside = false;
  });

  const resizeObserver = new ResizeObserver(rebuildTexture);
  resizeObserver.observe(wrapper);

  const intersectionObserver = new IntersectionObserver(([entry]) => {
    isVisible = entry.isIntersecting;
    if (isVisible && !animationFrame) animationFrame = requestAnimationFrame(render);
  });
  intersectionObserver.observe(wrapper);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && isVisible && !animationFrame) {
      animationFrame = requestAnimationFrame(render);
    }
  });

  rebuildTexture();
  animationFrame = requestAnimationFrame(render);
}

const meshHeadline = document.querySelector("[data-mesh-headline]");
if (meshHeadline) initMeshHeadline(meshHeadline);

function initTopography(container) {
  const isLightTheme = container.dataset.topography === "light";
  const canvas = document.createElement("canvas");
  const interactionSurface = container.parentElement ?? container;
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    premultipliedAlpha: false,
  });

  if (!gl) return;

  container.append(canvas);

  const vertexSource = `#version 300 es
    in vec2 position;

    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  const fragmentSource = `#version 300 es
    precision highp float;

    uniform vec2 uResolution;
    uniform vec2 uMouse;
    uniform float uTime;
    uniform float uMouseActive;
    uniform float uLightTheme;
    out vec4 fragColor;

    void main() {
      vec2 uv = gl_FragCoord.xy / uResolution;
      vec2 p = uv - 0.5;
      p.x *= uResolution.x / max(uResolution.y, 1.0);

      float time = uTime * 0.055;
      float terrain = sin(p.x * 4.2 + sin(p.y * 3.1 - time) * 1.35);
      terrain += cos(p.y * 4.8 - cos(p.x * 2.7 + time) * 1.1);
      terrain += 0.62 * sin((p.x + p.y) * 6.3 + time * 0.8);
      terrain += 0.35 * cos(length(p * vec2(0.8, 1.15)) * 11.0 - time);

      vec2 mouse = uMouse - 0.5;
      mouse.x *= uResolution.x / max(uResolution.y, 1.0);
      float mouseLift = exp(-dot(p - mouse, p - mouse) / 0.055) * uMouseActive;
      terrain += mouseLift * 0.8;

      float elevation = terrain * 0.18 + 0.5;
      float contour = min(fract(elevation * 9.0), 1.0 - fract(elevation * 9.0));
      float aa = fwidth(elevation * 9.0);
      float line = 1.0 - smoothstep(0.006 + aa * 0.6, 0.02 + aa * 0.8, contour);
      float glow = 1.0 - smoothstep(0.025, 0.11, contour);

      vec3 graphite = vec3(0.48, 0.5, 0.49);
      vec3 signal = mix(vec3(0.0, 0.8, 0.42), vec3(1.0, 0.9, 0.0), uv.x);
      float accent = pow(smoothstep(0.76, 1.0, elevation), 4.0);
      vec3 darkColor = mix(graphite, signal, accent * 0.72);
      vec3 lightColor = mix(vec3(0.34, 0.35, 0.34), vec3(0.15, 0.16, 0.15), accent);
      vec3 color = mix(darkColor, lightColor, uLightTheme);
      float alpha = mix(line * 0.56 + glow * 0.075, line * 0.5 + glow * 0.06, uLightTheme);

      fragColor = vec4(color, alpha);
    }
  `;

  function createShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn("Topography shader could not be compiled.");
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  const vertexShader = createShader(gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertexShader || !fragmentShader) return;

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

  const triangle = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, triangle);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  );

  const position = gl.getAttribLocation(program, "position");
  const resolution = gl.getUniformLocation(program, "uResolution");
  const time = gl.getUniformLocation(program, "uTime");
  const mouse = gl.getUniformLocation(program, "uMouse");
  const mouseActive = gl.getUniformLocation(program, "uMouseActive");
  const lightTheme = gl.getUniformLocation(program, "uLightTheme");
  const pointer = { x: 0.5, y: 0.5, active: 0, target: 0 };
  const startedAt = performance.now();
  let visible = false;
  let animationFrame = 0;

  gl.useProgram(program);
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  gl.clearColor(0, 0, 0, 0);

  function resize() {
    const bounds = container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(bounds.width * dpr));
    const height = Math.max(1, Math.round(bounds.height * dpr));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  }

  function render(now = startedAt) {
    resize();
    pointer.active += (pointer.target - pointer.active) * 0.045;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(resolution, canvas.width, canvas.height);
    gl.uniform2f(mouse, pointer.x, pointer.y);
    gl.uniform1f(time, (now - startedAt) / 1000);
    gl.uniform1f(mouseActive, pointer.active);
    gl.uniform1f(lightTheme, isLightTheme ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (visible && !document.hidden && !reduceMotion.matches) {
      animationFrame = requestAnimationFrame(render);
    } else {
      animationFrame = 0;
    }
  }

  function start() {
    if (!animationFrame) animationFrame = requestAnimationFrame(render);
  }

  interactionSurface.addEventListener("pointermove", (event) => {
    const bounds = container.getBoundingClientRect();
    pointer.x = (event.clientX - bounds.left) / bounds.width;
    pointer.y = 1 - (event.clientY - bounds.top) / bounds.height;
    pointer.target = 1;
  });
  interactionSurface.addEventListener("pointerleave", () => {
    pointer.target = 0;
  });

  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) start();
  });
  observer.observe(container);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && visible) start();
  });

  if (reduceMotion.matches) render();
}

document.querySelectorAll("[data-topography]").forEach(initTopography);
