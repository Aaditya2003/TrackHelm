const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarsePointer = window.matchMedia("(pointer: coarse)").matches;

const chapterOrder = ["world", "incident", "model", "systems", "policy"];
const appState = {
  chapter: "world",
  selectedNode: "delhi",
  system: "fleet",
  modelPart: "interaction",
  policyRisk: 2,
  audio: false,
};

const chapterLabels = {
  world: "World",
  incident: "Live decision",
  model: "Model layer",
  systems: "Systems",
  policy: "Policy gate",
};

function announce(message) {
  const status = $("[data-experience-status]");
  if (status) status.textContent = message;
}

const nodes = {
  delhi: { city: "New Delhi", code: "IN / DEL-04", state: "WATCH", confidence: "94%", variance: "+740m", decision: "Open", copy: "Cold-chain vehicle diverging from its planned corridor.", lat: 28.61, lng: 77.21, color: 0xffc866 },
  singapore: { city: "Singapore", code: "SG / HUB-08", state: "HEALTHY", confidence: "98%", variance: "−0.3°C", decision: "Stable", copy: "Cold-chain transfer holding inside its temperature envelope.", lat: 1.35, lng: 103.82, color: 0x67f7b5 },
  berlin: { city: "Berlin", code: "DE / GRID-12", state: "OPTIMIZED", confidence: "91%", variance: "−8.4%", decision: "Applied", copy: "Distributed load shifted ahead of the evening demand peak.", lat: 52.52, lng: 13.41, color: 0x4ce5ff },
  nairobi: { city: "Nairobi", code: "KE / FLD-17", state: "HEALTHY", confidence: "96%", variance: "+2.1%", decision: "Monitor", copy: "Field moisture and pump telemetry remain inside policy.", lat: -1.29, lng: 36.82, color: 0x67f7b5 },
  saopaulo: { city: "São Paulo", code: "BR / FAC-02", state: "CRITICAL", confidence: "89%", variance: "+31%", decision: "Escalate", copy: "A vibration signature is moving beyond the learned baseline.", lat: -23.55, lng: -46.63, color: 0xff665c },
  vancouver: { city: "Vancouver", code: "CA / PRT-09", state: "HEALTHY", confidence: "97%", variance: "−6 min", decision: "Synced", copy: "Port arrival synchronized with yard and berth capacity.", lat: 49.28, lng: -123.12, color: 0x67f7b5 },
  dubai: { city: "Dubai", code: "AE / AIR-11", state: "WATCH", confidence: "92%", variance: "+12%", decision: "Open", copy: "Ambient heat is raising predicted battery degradation.", lat: 25.2, lng: 55.27, color: 0xffc866 },
};

const systemContent = {
  fleet: { index: "01 / FLEET", title: "See disruption before delay.", copy: "Coordinate routes, cargo, drivers, docks, and customers as one continuous system.", list: ["Predict route exceptions", "Protect cold-chain integrity", "Coordinate every stakeholder"] },
  factory: { index: "02 / FACTORY", title: "Hear failure before it happens.", copy: "Fuse visual inspection, vibration, throughput, and maintenance context into timely intervention.", list: ["Detect signature drift", "Schedule intervention", "Protect line throughput"] },
  energy: { index: "03 / ENERGY", title: "Balance a living grid.", copy: "Orchestrate occupancy, demand, generation, weather, and price without sacrificing resilience.", list: ["Forecast peak demand", "Shift controllable load", "Explain every adjustment"] },
  field: { index: "04 / FIELD", title: "Give every acre context.", copy: "Combine soil, climate, imagery, and equipment state into precise, resource-aware field decisions.", list: ["Target irrigation", "Recognize emerging stress", "Coordinate people and pumps"] },
};

let sceneController = null;
let audioController = null;

function showToast(message) {
  const toast = $(".toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("visible"), 2900);
}

function updateSelectedNode(nodeId, fromScene = false) {
  const node = nodes[nodeId];
  if (!node) return;
  appState.selectedNode = nodeId;
  const values = {
    "[data-node-state]": node.state,
    "[data-node-code]": node.code,
    "[data-node-city]": node.city,
    "[data-node-copy]": node.copy,
    "[data-node-confidence]": node.confidence,
    "[data-node-variance]": node.variance,
    "[data-node-decision]": node.decision,
  };
  Object.entries(values).forEach(([selector, value]) => {
    const element = $(selector);
    if (element) element.textContent = value;
  });
  const state = $("[data-node-state]");
  if (state) state.style.color = `#${node.color.toString(16).padStart(6, "0")}`;
  if (!fromScene) sceneController?.selectNode(nodeId);
  if (fromScene) announce(`${node.city} selected. ${node.state}. ${node.copy}`);
  audioController?.ping(node.color);
}

function goToChapter(name, options = {}) {
  if (!chapterOrder.includes(name)) return;
  appState.chapter = name;
  const index = chapterOrder.indexOf(name);

  $$('[data-chapter]').forEach((chapter) => {
    const active = chapter.dataset.chapter === name;
    chapter.classList.toggle("active", active);
    chapter.setAttribute("aria-hidden", String(!active));
  });
  $$('.command-dock [data-go]').forEach((button) => {
    const active = button.dataset.go === name;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  const number = $("[data-chapter-number]");
  const progress = $("[data-chapter-progress]");
  if (number) number.textContent = String(index + 1).padStart(2, "0");
  if (progress) progress.style.height = `${((index + 1) / chapterOrder.length) * 100}%`;
  sceneController?.setChapter(name);
  announce(`Chapter ${index + 1} of ${chapterOrder.length}: ${chapterLabels[name]}`);
  if (!options.noHistory && location.hash !== `#${name}`) history.replaceState(null, "", `#${name}`);
  if (!options.silent) audioController?.transition(index);
}

function initNavigation() {
  $$('[data-go]').forEach((button) => button.addEventListener("click", () => goToChapter(button.dataset.go)));
  window.addEventListener("hashchange", () => {
    const name = location.hash.slice(1);
    if (chapterOrder.includes(name) && name !== appState.chapter) goToChapter(name, { noHistory: true, silent: true });
  });
  document.addEventListener("keydown", (event) => {
    if ($(".incident-mode")?.classList.contains("visible")) return;
    if (/^[1-5]$/.test(event.key) && !/INPUT|TEXTAREA|BUTTON|A/.test(document.activeElement?.tagName || "")) {
      goToChapter(chapterOrder[Number(event.key) - 1]);
    }
  });
}

function initCursor() {
  if (coarsePointer) return;
  const cursor = $(".cursor");
  const label = $(".hover-label");
  let currentX = innerWidth / 2;
  let currentY = innerHeight / 2;
  let targetX = currentX;
  let targetY = currentY;

  window.addEventListener("pointermove", (event) => {
    targetX = event.clientX;
    targetY = event.clientY;
    cursor?.classList.add("visible");
    if (label?.classList.contains("visible")) label.style.transform = `translate(${event.clientX + 16}px, ${event.clientY + 16}px)`;
  }, { passive: true });
  document.documentElement.addEventListener("pointerleave", () => cursor?.classList.remove("visible"));

  const animate = () => {
    currentX += (targetX - currentX) * .2;
    currentY += (targetY - currentY) * .2;
    if (cursor) cursor.style.transform = `translate(${currentX - 3}px, ${currentY - 3}px)`;
    requestAnimationFrame(animate);
  };
  animate();

  $$('button,a,input').forEach((element) => {
    element.addEventListener("pointerenter", () => cursor?.classList.add("action"));
    element.addEventListener("pointerleave", () => cursor?.classList.remove("action"));
  });

  window.tracehelmHover = (meta, visible, x = targetX, y = targetY) => {
    if (!label) return;
    label.classList.toggle("visible", visible);
    if (visible && meta) {
      $("span", label).textContent = meta.eyebrow || "LIVE OBJECT";
      $("b", label).textContent = meta.label || "Explore";
      label.style.transform = `translate(${x + 16}px, ${y + 16}px)`;
      cursor?.classList.add("action");
    } else cursor?.classList.remove("action");
  };

  $$(".magnetic").forEach((element) => {
    element.addEventListener("pointermove", (event) => {
      const box = element.getBoundingClientRect();
      element.style.transform = `translate(${(event.clientX - box.left - box.width / 2) * .08}px, ${(event.clientY - box.top - box.height / 2) * .1}px)`;
    });
    element.addEventListener("pointerleave", () => { element.style.transform = ""; });
  });
}

function initAudio() {
  let context;
  let master;
  let started = false;
  const button = $("[data-audio]");

  const ensure = async () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    context ||= new AudioContext();
    await context.resume();
    if (!started) {
      master = context.createGain();
      master.gain.value = .0001;
      master.connect(context.destination);
      [43, 64.5, 86].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = index === 1 ? "sine" : "triangle";
        oscillator.frequency.value = frequency;
        gain.gain.value = [.012, .008, .003][index];
        oscillator.connect(gain).connect(master);
        oscillator.start();
      });
      started = true;
    }
    return true;
  };

  const setEnabled = async (enabled) => {
    if (enabled && !(await ensure())) return;
    appState.audio = enabled;
    button?.setAttribute("aria-pressed", String(enabled));
    button?.setAttribute("aria-label", enabled ? "Turn ambient sound off" : "Turn ambient sound on");
    if (master) master.gain.exponentialRampToValueAtTime(enabled ? .5 : .0001, context.currentTime + .5);
    showToast(enabled ? "Spatial signal audio enabled" : "Spatial signal audio muted");
  };

  button?.addEventListener("click", () => setEnabled(!appState.audio));

  audioController = {
    async ping(color = 0x4ce5ff) {
      if (!appState.audio || !(await ensure())) return;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const blue = color & 255;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(330 + blue, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(660 + blue, context.currentTime + .16);
      gain.gain.setValueAtTime(.055, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + .28);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + .29);
    },
    async transition(index) {
      if (!appState.audio || !(await ensure())) return;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(110 + index * 28, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(260 + index * 34, context.currentTime + .3);
      gain.gain.setValueAtTime(.04, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + .4);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + .41);
    },
  };
}

function initIncidentControls() {
  const temperature = $('[data-sensor="temperature"]');
  const traffic = $('[data-sensor="traffic"]');
  const route = $('[data-sensor="route"]');
  const riskLabel = $("[data-risk-label]");

  const update = () => {
    const temp = Number(temperature?.value || 7.8);
    const trafficValue = Number(traffic?.value || 82);
    const routeValue = Number(route?.value || 740);
    const risk = clamp(((temp - 3) / 10) * .46 + (trafficValue / 100) * .3 + (routeValue / 1600) * .24, 0, 1);
    const confidence = Math.round(78 + risk * 20);
    $("[data-temp-value]").textContent = `${temp.toFixed(1)}°C`;
    $("[data-traffic-value]").textContent = `${trafficValue}%`;
    $("[data-route-value]").textContent = `${routeValue}m`;
    $("[data-float-temp]").textContent = `${temp.toFixed(1)}°`;
    $("[data-eta]").innerHTML = `+${Math.round(5 + trafficValue * .16 + routeValue / 500)} <small>min</small>`;
    $("[data-confidence]").textContent = `${confidence}% CONFIDENCE`;

    let label = "LOW RISK";
    let recommendation = "Continue + monitor";
    let reason = "Conditions remain inside the supervised operating envelope.";
    let color = "var(--green)";
    if (risk > .72 || temp > 10.5) {
      label = "CRITICAL RISK";
      recommendation = "Stop + inspect";
      reason = "Cold-chain integrity may be compromised. Secure cargo and dispatch support.";
      color = "var(--coral)";
    } else if (risk > .42) {
      label = "MEDIUM RISK";
      recommendation = "Reroute + notify";
      reason = "Protect the cold-chain SLA using Ring Road and reserve Dock 4.";
      color = "var(--amber)";
    }
    riskLabel.textContent = label;
    riskLabel.style.color = color;
    $("[data-recommendation]").textContent = recommendation;
    $("[data-reason]").textContent = reason;
    sceneController?.updateIncident(risk, { temp, traffic: trafficValue, route: routeValue });
  };

  [temperature, traffic, route].forEach((input) => input?.addEventListener("input", update));
  update();

  $("[data-approve]")?.addEventListener("click", (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    button.innerHTML = "Executing <span>···</span>";
    sceneController?.executeIncident();
    setTimeout(() => {
      button.innerHTML = "Action complete <span>✓</span>";
      showToast("Route, dock, driver, and customer updated · audit saved");
    }, 950);
    setTimeout(() => { button.disabled = false; button.innerHTML = "Approve <span>↗</span>"; }, 3600);
  });
  $("[data-escalate]")?.addEventListener("click", () => {
    sceneController?.pulseIncident();
    showToast("Exception escalated to the regional operations lead");
  });
}

function initModelControls() {
  const buttons = $$('[data-model-part]');
  buttons.forEach((button) => button.setAttribute("aria-pressed", String(button.classList.contains("active"))));
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      appState.modelPart = button.dataset.modelPart;
      buttons.forEach((item) => {
        const active = item === button;
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      sceneController?.selectModelPart(appState.modelPart);
      audioController?.ping(0x8b6dff);
    });
  });
}

function selectSystem(name, fromScene = false) {
  if (!systemContent[name]) return;
  appState.system = name;
  $$('[data-system]').forEach((button) => {
    const active = button.dataset.system === name;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const content = systemContent[name];
  $("[data-system-index]").textContent = content.index;
  $("[data-system-title]").textContent = content.title;
  $("[data-system-copy]").textContent = content.copy;
  const list = $("[data-system-list]");
  if (list) list.innerHTML = content.list.map((item) => `<li>${item}</li>`).join("");
  if (!fromScene) sceneController?.selectSystem(name);
  audioController?.ping(0x4ce5ff);
}

function initSystemControls() {
  $$('[data-system]').forEach((button) => button.setAttribute("aria-pressed", String(button.classList.contains("active"))));
  $$('[data-system]').forEach((button) => button.addEventListener("click", () => selectSystem(button.dataset.system)));
  $("[data-launch-system]")?.addEventListener("click", () => {
    if (appState.system === "fleet") goToChapter("incident");
    else showToast(`${systemContent[appState.system].index.split(" / ")[1]} digital twin opened in preview mode`);
  });
}

function initPolicyControls() {
  const input = $("[data-policy-risk]");
  const result = $(".gate-result");
  const status = $("[data-gate-status]");
  const gateButton = $("[data-test-gate]");
  let testTimer = 0;

  const update = () => {
    clearTimeout(testTimer);
    if (gateButton) gateButton.disabled = false;
    const risk = Number(input?.value || 2);
    appState.policyRisk = risk;
    $("[data-policy-risk-value]").textContent = String(risk).padStart(2, "0");
    $("[data-risk-tier]").textContent = String(risk).padStart(2, "0");
    const blocked = risk >= 4;
    const limit = $("[data-limit-check]");
    const human = $("[data-human-check]");
    limit.classList.toggle("fail", blocked);
    $("i", limit).textContent = blocked ? "×" : "✓";
    human.classList.toggle("fail", risk === 5);
    $("i", human).textContent = risk === 5 ? "!" : "✓";
    status.textContent = blocked ? "REVIEW REQUIRED" : "READY";
    status.style.color = blocked ? "var(--coral)" : "var(--green)";
    result.classList.remove("visible");
    sceneController?.updatePolicy(risk);
  };

  input?.addEventListener("input", update);
  update();

  gateButton?.addEventListener("click", () => {
    clearTimeout(testTimer);
    const blocked = appState.policyRisk >= 4;
    gateButton.disabled = true;
    sceneController?.testPolicy(blocked);
    result.classList.remove("visible", "blocked");
    testTimer = setTimeout(() => {
      gateButton.disabled = false;
      result.classList.add("visible");
      result.classList.toggle("blocked", blocked);
      $("i", result).textContent = blocked ? "×" : "✓";
      $("strong", result).textContent = blocked ? "Action held for review" : "Action permitted";
      $("span", result).textContent = blocked ? "No tool call executed · human notified" : "Logged · reversible · monitored";
      showToast(blocked ? "Policy gate blocked the action safely" : "Policy gate cleared the action");
    }, 700);
  });
}

function initReplayAndSecrets() {
  const replay = $(".replay-overlay");
  const incident = $(".incident-mode");
  const closeButton = $("[data-close-incident]");
  const background = [$("#stage"), $(".topbar"), $(".experience"), $(".command-dock"), $(".shortcuts")].filter(Boolean);
  let typed = "";
  let logoClicks = [];
  let previousFocus = null;

  const setReplay = (visible) => {
    replay?.classList.toggle("visible", visible);
    replay?.setAttribute("aria-hidden", String(!visible));
  };
  const openIncident = () => {
    if (incident?.classList.contains("visible")) return;
    previousFocus = document.activeElement;
    incident?.classList.add("visible");
    incident?.setAttribute("aria-hidden", "false");
    background.forEach((element) => { element.inert = true; });
    sceneController?.setIncidentMode(true);
    audioController?.ping(0xff665c);
    closeButton?.focus();
  };
  const closeIncident = () => {
    if (!incident?.classList.contains("visible")) return;
    incident?.classList.remove("visible");
    incident?.setAttribute("aria-hidden", "true");
    background.forEach((element) => { element.inert = false; });
    sceneController?.setIncidentMode(false);
    previousFocus?.focus?.();
    previousFocus = null;
  };

  document.addEventListener("keydown", (event) => {
    if (incident?.classList.contains("visible")) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeIncident();
      } else if (event.key === "Tab") {
        event.preventDefault();
        closeButton?.focus();
      }
      return;
    }
    if (event.code === "Space" && !event.repeat && !/INPUT|BUTTON|A/.test(document.activeElement?.tagName || "")) {
      event.preventDefault(); setReplay(true);
    }
    if (event.key === "Escape") { setReplay(false); closeIncident(); }
    if (event.key.length === 1 && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName || "")) {
      typed = `${typed}${event.key.toUpperCase()}`.slice(-4);
      if (typed === "HELM") openIncident();
    }
  });
  document.addEventListener("keyup", (event) => { if (event.code === "Space") setReplay(false); });
  closeButton?.addEventListener("click", closeIncident);

  $(".wordmark")?.addEventListener("click", (event) => {
    const now = Date.now();
    logoClicks = [...logoClicks.filter((time) => now - time < 2600), now];
    if (logoClicks.length >= 5) { event.preventDefault(); logoClicks = []; openIncident(); }
  });
}

function initFocusControl() {
  $("[data-focus]")?.addEventListener("click", () => {
    sceneController?.focusNode(appState.selectedNode);
    showToast(`Camera focused on ${nodes[appState.selectedNode].city}`);
  });
}

async function initThreeExperience() {
  const canvas = $("#stage");
  try {
    const THREE = await import("https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js");
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05050a, .033);
    const camera = new THREE.PerspectiveCamera(37, innerWidth / innerHeight, .1, 100);
    camera.position.set(0, .1, 9);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
    renderer.setSize(innerWidth, innerHeight, false);
    renderer.setClearColor(0x05050a, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;

    const ambient = new THREE.AmbientLight(0x8891b5, 1.45);
    const key = new THREE.DirectionalLight(0x93f4ff, 5.2);
    key.position.set(5, 4, 7);
    const violetLight = new THREE.PointLight(0x7657ff, 45, 18, 2);
    violetLight.position.set(-4, -1, 2);
    const cyanLight = new THREE.PointLight(0x4ce5ff, 35, 15, 2);
    cyanLight.position.set(4, 2, 3);
    scene.add(ambient, key, violetLight, cyanLight);

    const createGlowTexture = () => {
      const c = document.createElement("canvas"); c.width = c.height = 128;
      const context = c.getContext("2d");
      const gradient = context.createRadialGradient(64,64,0,64,64,64);
      gradient.addColorStop(0,"rgba(255,255,255,1)"); gradient.addColorStop(.12,"rgba(255,255,255,.7)"); gradient.addColorStop(.45,"rgba(255,255,255,.13)"); gradient.addColorStop(1,"rgba(255,255,255,0)");
      context.fillStyle = gradient; context.fillRect(0,0,128,128);
      return new THREE.CanvasTexture(c);
    };
    const glowTexture = createGlowTexture();
    const glowSprite = (color, size = 1) => {
      const material = new THREE.SpriteMaterial({ map: glowTexture, color, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false });
      const sprite = new THREE.Sprite(material); sprite.scale.setScalar(size); return sprite;
    };

    const starGeometry = new THREE.BufferGeometry();
    const starCount = 900;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i += 1) {
      starPositions[i*3] = THREE.MathUtils.randFloatSpread(28);
      starPositions[i*3+1] = THREE.MathUtils.randFloatSpread(18);
      starPositions[i*3+2] = THREE.MathUtils.randFloat(-7, 3);
    }
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions,3));
    const stars = new THREE.Points(starGeometry,new THREE.PointsMaterial({ color:0x777f9c,size:.014,transparent:true,opacity:.55 }));
    scene.add(stars);

    const floorGrid = new THREE.GridHelper(22, 44, 0x23243c, 0x10111e);
    floorGrid.position.set(0,-3.2,-1); floorGrid.material.transparent = true; floorGrid.material.opacity = .24;
    scene.add(floorGrid);

    const chapterGroups = {};
    const rayTargets = { world: [], incident: [], model: [], systems: [], policy: [] };
    const interactiveRoots = {};

    function mapTexture() {
      const c = document.createElement("canvas"); c.width = 2048; c.height = 1024;
      const x = c.getContext("2d"); x.clearRect(0,0,c.width,c.height);
      const polys = [
        [[55,220],[205,90],[440,80],[590,180],[515,275],[390,325],[320,420],[190,375],[125,295]],
        [[435,390],[565,420],[620,545],[570,720],[505,885],[425,735],[410,555]],
        [[850,195],[1020,140],[1175,188],[1250,275],[1125,335],[1000,300],[920,350]],
        [[975,348],[1135,335],[1230,438],[1180,635],[1080,810],[985,670],[920,490]],
        [[1150,175],[1420,100],[1740,135],[1970,250],[1890,380],[1660,400],[1480,340],[1305,425],[1180,315]],
        [[1585,610],[1780,570],[1910,675],[1830,795],[1625,775],[1535,690]],
        [[650,70],[775,30],[860,92],[795,165],[675,150]],
      ];
      x.fillStyle="rgba(58,76,108,.75)"; x.strokeStyle="rgba(76,229,255,.7)"; x.lineWidth=2;
      polys.forEach(poly=>{x.beginPath();poly.forEach(([px,py],i)=>i?x.lineTo(px,py):x.moveTo(px,py));x.closePath();x.fill();x.stroke();});
      x.fillStyle="rgba(76,229,255,.3)";
      for(let i=0;i<420;i+=1){x.fillRect(Math.random()*2048,Math.random()*1024,1.5,1.5);}
      const texture = new THREE.CanvasTexture(c); texture.colorSpace=THREE.SRGBColorSpace; return texture;
    }

    const latLng = (lat,lng,r=2.35) => {
      const phi=THREE.MathUtils.degToRad(90-lat), theta=THREE.MathUtils.degToRad(lng+180);
      return new THREE.Vector3(-r*Math.sin(phi)*Math.cos(theta),r*Math.cos(phi),r*Math.sin(phi)*Math.sin(theta));
    };

    function createWorld() {
      const group = new THREE.Group();
      const root = new THREE.Group(); group.add(root); interactiveRoots.world=root;
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(2.28,72,48),new THREE.MeshStandardMaterial({ map:mapTexture(),color:0x354057,roughness:.78,metalness:.22,transparent:true,opacity:.9 }));
      const wire = new THREE.Mesh(new THREE.SphereGeometry(2.3,36,24),new THREE.MeshBasicMaterial({ color:0x8891b5,wireframe:true,transparent:true,opacity:.09 }));
      const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(2.43,48,32),new THREE.MeshBasicMaterial({ color:0x4ce5ff,transparent:true,opacity:.045,side:THREE.BackSide }));
      root.add(sphere,wire,atmosphere);
      root.userData.sphere=sphere;
      const markers=new Map();
      Object.entries(nodes).forEach(([id,node])=>{
        const marker=new THREE.Group(); const position=latLng(node.lat,node.lng,2.34); marker.position.copy(position); marker.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),position.clone().normalize());
        const core=new THREE.Mesh(new THREE.SphereGeometry(.045,10,10),new THREE.MeshBasicMaterial({color:node.color}));
        const ring=new THREE.Mesh(new THREE.TorusGeometry(.12,.008,5,24),new THREE.MeshBasicMaterial({color:node.color,transparent:true,opacity:.85}));
        const halo=glowSprite(node.color,.5); halo.position.z=-.01;
        const hit=new THREE.Mesh(new THREE.SphereGeometry(.18,8,8),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}));
        hit.userData={type:"node",id,label:node.city,eyebrow:node.code};
        marker.add(core,ring,halo,hit); marker.userData={id,core,ring,halo,targetScale:1}; root.add(marker); markers.set(id,marker); rayTargets.world.push(hit);
      });
      const connections=[["delhi","singapore"],["delhi","dubai"],["dubai","berlin"],["berlin","vancouver"],["vancouver","saopaulo"],["saopaulo","nairobi"],["nairobi","singapore"],["berlin","delhi"]];
      const pulses=[];
      connections.forEach(([a,b],index)=>{const start=latLng(nodes[a].lat,nodes[a].lng,2.37),end=latLng(nodes[b].lat,nodes[b].lng,2.37),mid=start.clone().add(end).multiplyScalar(.5).normalize().multiplyScalar(2.8+start.distanceTo(end)*.16);const curve=new THREE.QuadraticBezierCurve3(start,mid,end);root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(60)),new THREE.LineBasicMaterial({color:index%3?0x46506d:0x4ce5ff,transparent:true,opacity:index%3?.34:.8})));const pulse=new THREE.Mesh(new THREE.SphereGeometry(.025,6,6),new THREE.MeshBasicMaterial({color:index%2?0x4ce5ff:0x8b6dff}));pulse.userData={curve,offset:index/connections.length};root.add(pulse);pulses.push(pulse);});
      const orbit=new THREE.Group(); orbit.rotation.set(.65,.2,.35); const sat=new THREE.Group(); sat.position.x=3.05; const metal=new THREE.MeshStandardMaterial({color:0xaeb8ca,metalness:.75,roughness:.3}); const panel=new THREE.MeshStandardMaterial({color:0x3345a1,emissive:0x101b70,emissiveIntensity:1.5}); sat.add(new THREE.Mesh(new THREE.BoxGeometry(.17,.15,.2),metal)); const p1=new THREE.Mesh(new THREE.BoxGeometry(.32,.02,.14),panel),p2=p1.clone();p1.position.x=-.27;p2.position.x=.27;sat.add(p1,p2);orbit.add(sat);root.add(orbit);const orbitLine=new THREE.Mesh(new THREE.TorusGeometry(3.05,.006,4,160),new THREE.MeshBasicMaterial({color:0x4ce5ff,transparent:true,opacity:.18}));orbitLine.rotation.copy(orbit.rotation);root.add(orbitLine);
      group.userData={root,markers,pulses,orbit,selected:"delhi",focusQuaternion:null}; return group;
    }

    const mats={ dark:new THREE.MeshStandardMaterial({color:0x151722,metalness:.65,roughness:.35}), panel:new THREE.MeshStandardMaterial({color:0x202640,metalness:.45,roughness:.3}), cyan:new THREE.MeshStandardMaterial({color:0x4ce5ff,emissive:0x0b6170,emissiveIntensity:1.3}), violet:new THREE.MeshStandardMaterial({color:0x8b6dff,emissive:0x291f66,emissiveIntensity:1}), glass:new THREE.MeshPhysicalMaterial({color:0x6bcfff,transparent:true,opacity:.5,roughness:.1,metalness:.1}) };

    function createTruck(scale=1) {
      const truck=new THREE.Group();
      const cargo=new THREE.Mesh(new THREE.BoxGeometry(1.48,.88,.82,2,2,2),mats.panel);cargo.position.set(-.43,.68,0);truck.add(cargo);
      const cargoEdge=new THREE.LineSegments(new THREE.EdgesGeometry(cargo.geometry),new THREE.LineBasicMaterial({color:0x64749f,transparent:true,opacity:.7}));cargoEdge.position.copy(cargo.position);truck.add(cargoEdge);

      const cabProfile=new THREE.Shape();
      cabProfile.moveTo(.3,.14);cabProfile.lineTo(.3,.94);cabProfile.lineTo(.58,.94);cabProfile.lineTo(.9,.73);cabProfile.lineTo(1.18,.38);cabProfile.lineTo(1.18,.14);cabProfile.closePath();
      const cabGeometry=new THREE.ExtrudeGeometry(cabProfile,{depth:.8,bevelEnabled:true,bevelSegments:2,bevelSize:.035,bevelThickness:.035});
      cabGeometry.translate(0,0,-.4);
      const cab=new THREE.Mesh(cabGeometry,mats.dark);truck.add(cab);

      const windowGeometry=new THREE.BufferGeometry();
      windowGeometry.setAttribute("position",new THREE.Float32BufferAttribute([.43,.61,.426,.86,.61,.426,.68,.84,.426,.42,.84,.426],3));
      windowGeometry.setIndex([0,1,2,0,2,3]);windowGeometry.computeVertexNormals();
      const windowMesh=new THREE.Mesh(windowGeometry,mats.glass);truck.add(windowMesh);
      const doorLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(.42,.18,.432),new THREE.Vector3(.42,.88,.432),new THREE.Vector3(.7,.94,.432)]),new THREE.LineBasicMaterial({color:0x68718d,transparent:true,opacity:.65}));truck.add(doorLine);

      const chassis=new THREE.Mesh(new THREE.BoxGeometry(2.42,.14,.74),mats.dark);chassis.position.set(-.02,.12,0);truck.add(chassis);
      const bumper=new THREE.Mesh(new THREE.BoxGeometry(.16,.16,.88),new THREE.MeshStandardMaterial({color:0x384052,metalness:.8,roughness:.25}));bumper.position.set(1.2,.18,0);truck.add(bumper);
      [-.88,-.45,-.02].forEach(x=>{const rib=new THREE.Mesh(new THREE.BoxGeometry(.025,.75,.025),new THREE.MeshBasicMaterial({color:0x59678d,transparent:true,opacity:.75}));rib.position.set(x,.68,.425);truck.add(rib);});

      const labelCanvas=document.createElement("canvas");labelCanvas.width=512;labelCanvas.height=128;const labelContext=labelCanvas.getContext("2d");
      const labelGradient=labelContext.createLinearGradient(0,0,512,0);labelGradient.addColorStop(0,"rgba(76,229,255,.04)");labelGradient.addColorStop(1,"rgba(139,109,255,.25)");labelContext.fillStyle=labelGradient;labelContext.fillRect(0,0,512,128);labelContext.strokeStyle="rgba(76,229,255,.8)";labelContext.strokeRect(2,2,508,124);labelContext.fillStyle="#bff8ff";labelContext.font="500 34px monospace";labelContext.fillText("TRK—204  /  COLD CHAIN",24,55);labelContext.fillStyle="rgba(191,248,255,.58)";labelContext.font="20px monospace";labelContext.fillText("LIVE TELEMETRY · POLICY LINKED",24,91);
      const labelTexture=new THREE.CanvasTexture(labelCanvas);labelTexture.colorSpace=THREE.SRGBColorSpace;
      const labelPanel=new THREE.Mesh(new THREE.PlaneGeometry(1.12,.28),new THREE.MeshBasicMaterial({map:labelTexture,transparent:true,opacity:.92,depthWrite:false}));labelPanel.position.set(-.48,.72,.432);truck.add(labelPanel);

      const coolingPod=new THREE.Mesh(new THREE.BoxGeometry(.58,.16,.52),mats.cyan);coolingPod.position.set(-.78,1.2,0);truck.add(coolingPod);
      const coolingFins=[];[-.12,0,.12].forEach(z=>{const fin=new THREE.Mesh(new THREE.BoxGeometry(.42,.07,.025),mats.dark);fin.position.set(-.78,1.285,z);truck.add(fin);coolingFins.push(fin);});
      const wheels=[];[-.76,.78].forEach(x=>[-.45,.45].forEach(z=>{const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,.16,22),new THREE.MeshStandardMaterial({color:0x07080c,roughness:.88,metalness:.18}));wheel.rotation.x=Math.PI/2;wheel.position.set(x,.03,z);truck.add(wheel);wheels.push(wheel);const rim=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.17,16),mats.cyan);rim.rotation.x=Math.PI/2;rim.position.copy(wheel.position);truck.add(rim);}));
      [-.27,.27].forEach(z=>{const headlight=glowSprite(0x4ce5ff,.22);headlight.position.set(1.3,.31,z);truck.add(headlight);});
      const cooling=glowSprite(0x4ce5ff,.68);cooling.position.set(-.48,.72,.45);truck.add(cooling);
      truck.scale.setScalar(scale);truck.userData={wheels,cooling,label:"Cold-chain fleet",eyebrow:"GPS + TELEMETRY"};return truck;
    }

    function createIncident() {
      const group=new THREE.Group();const root=new THREE.Group();group.add(root);interactiveRoots.incident=root;
      const platform=new THREE.Mesh(new THREE.CylinderGeometry(2.2,2.35,.17,64),new THREE.MeshStandardMaterial({color:0x11131e,metalness:.75,roughness:.28}));platform.position.y=-.5;root.add(platform);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(2.08,.018,6,100),new THREE.MeshBasicMaterial({color:0x4ce5ff,transparent:true,opacity:.48}));ring.rotation.x=Math.PI/2;ring.position.y=-.4;root.add(ring);
      const road=new THREE.Mesh(new THREE.PlaneGeometry(4.1,1.3),new THREE.MeshStandardMaterial({color:0x12141c,roughness:.8}));road.rotation.x=-Math.PI/2;road.position.y=-.38;root.add(road);
      for(let x=-1.8;x<2;x+=.45){const line=new THREE.Mesh(new THREE.BoxGeometry(.22,.01,.018),new THREE.MeshBasicMaterial({color:0x82899c}));line.position.set(x,-.365,0);root.add(line);}
      const truck=createTruck(1.15);truck.position.set(-.15,-.25,0);truck.rotation.y=-.12;root.add(truck);
      const hit=new THREE.Mesh(new THREE.BoxGeometry(2.8,1.4,1.5),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}));hit.position.set(-.05,.18,0);hit.userData={type:"incident",label:"TRK-204",eyebrow:"LIVE VEHICLE"};root.add(hit);rayTargets.incident.push(hit);
      const riskGlow=glowSprite(0xff665c,2.3);riskGlow.position.set(-.25,.3,-.7);root.add(riskGlow);riskGlow.material.opacity=.08;
      const routeArc=new THREE.Mesh(new THREE.TorusGeometry(1.7,.017,5,90,Math.PI*1.3),new THREE.MeshBasicMaterial({color:0x8b6dff,transparent:true,opacity:.65}));routeArc.rotation.x=Math.PI/2;routeArc.rotation.z=-.6;routeArc.position.y=-.32;root.add(routeArc);
      group.userData={root,truck,platform,ring,riskGlow,routeArc,risk:.5,executeAt:-10};return group;
    }

    function createModel() {
      const group=new THREE.Group();const root=new THREE.Group();group.add(root);interactiveRoots.model=root;
      const coreGroup=new THREE.Group();root.add(coreGroup);
      const core=new THREE.Mesh(new THREE.IcosahedronGeometry(.72,3),new THREE.MeshPhysicalMaterial({color:0x6c54da,emissive:0x211765,emissiveIntensity:1.5,transparent:true,opacity:.72,roughness:.25,metalness:.25}));
      const coreWire=new THREE.Mesh(new THREE.IcosahedronGeometry(.82,2),new THREE.MeshBasicMaterial({color:0x9d8aff,wireframe:true,transparent:true,opacity:.55}));coreGroup.add(glowSprite(0x8b6dff,3.2),core,coreWire);
      const rings=[];[1.12,1.45,1.82].forEach((radius,index)=>{const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,.012,5,100),new THREE.MeshBasicMaterial({color:index===1?0x4ce5ff:0x8b6dff,transparent:true,opacity:.28}));ring.rotation.set(index*.72,.4+index*.4,index*.32);root.add(ring);rings.push(ring);});
      const background=new THREE.Group();background.position.set(2.45,.45,-.5);const bgCore=new THREE.Mesh(new THREE.DodecahedronGeometry(.48,1),new THREE.MeshStandardMaterial({color:0x16223b,emissive:0x102c4c,emissiveIntensity:1.2,metalness:.5,roughness:.3}));background.add(glowSprite(0x4ce5ff,2),bgCore);root.add(background);
      const contextRing=new THREE.Mesh(new THREE.TorusGeometry(2.6,.02,6,120),new THREE.MeshBasicMaterial({color:0x4ce5ff,transparent:true,opacity:.2}));contextRing.rotation.set(1.1,.3,.2);root.add(contextRing);
      const hitContext=new THREE.Mesh(new THREE.TorusGeometry(2.6,.16,8,100),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}));hitContext.rotation.copy(contextRing.rotation);hitContext.userData={type:"model",part:"context",label:"Living shared context",eyebrow:"FOREGROUND + BACKGROUND"};root.add(hitContext);rayTargets.model.push(hitContext);
      const toolGroup=new THREE.Group();toolGroup.position.set(-2.25,-.2,0);for(let i=0;i<4;i+=1){const cube=new THREE.Mesh(new THREE.BoxGeometry(.28,.28,.28),i===3?mats.cyan:mats.dark);cube.position.set((i%2)*.55,Math.floor(i/2)*.55,0);cube.rotation.set(.2,i*.4,.1);cube.userData={type:"model",part:"tools",label:["Route API","Alert API","Scheduler","Policy"][i],eyebrow:"TOOL"};toolGroup.add(cube);rayTargets.model.push(cube);}root.add(toolGroup);
      const streams=[];for(let lane=0;lane<3;lane+=1){for(let i=0;i<8;i+=1){const particle=new THREE.Mesh(new THREE.SphereGeometry(.025,6,6),new THREE.MeshBasicMaterial({color:lane===0?0x4ce5ff:lane===1?0x8b6dff:0x67f7b5}));particle.userData={lane,offset:i/8};root.add(particle);streams.push(particle);}}
      const hitCore=new THREE.Mesh(new THREE.SphereGeometry(1.05,10,10),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}));hitCore.userData={type:"model",part:"interaction",label:"Interaction model",eyebrow:"200MS / FOREGROUND"};coreGroup.add(hitCore);rayTargets.model.push(hitCore);
      const hitBackground=new THREE.Mesh(new THREE.SphereGeometry(.7,8,8),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}));hitBackground.userData={type:"model",part:"background",label:"Background reasoning",eyebrow:"ASYNC AGENT"};background.add(hitBackground);rayTargets.model.push(hitBackground);
      group.userData={root,coreGroup,core,coreWire,rings,background,contextRing,hitContext,toolGroup,streams,part:"interaction"};return group;
    }

    function createFactory() {
      const root=new THREE.Group();const floor=new THREE.Mesh(new THREE.BoxGeometry(2.1,.1,1.55),mats.dark);root.add(floor);
      for(let i=0;i<3;i+=1){const machine=new THREE.Mesh(new THREE.BoxGeometry(.42,.65,.5),i===1?mats.violet:mats.panel);machine.position.set(-.65+i*.65,.38,.15);root.add(machine);const light=glowSprite(i===1?0x8b6dff:0x4ce5ff,.32);light.position.set(machine.position.x,.62,-.3);root.add(light);}
      const conveyor=new THREE.Mesh(new THREE.BoxGeometry(1.85,.12,.3),mats.dark);conveyor.position.set(0,.17,-.5);root.add(conveyor);
      const items=[];for(let i=0;i<5;i+=1){const item=new THREE.Mesh(new THREE.BoxGeometry(.14,.14,.14),mats.cyan);item.position.set(-.75+i*.37,.31,-.5);root.add(item);items.push(item);}
      root.userData={label:"Factory intelligence",eyebrow:"VISION + VIBRATION",items};return root;
    }

    function createEnergy() {
      const root=new THREE.Group();const base=new THREE.Mesh(new THREE.CylinderGeometry(1.25,1.35,.12,40),mats.dark);root.add(base);const rotors=[];
      [-.55,.55].forEach((x,index)=>{const tower=new THREE.Mesh(new THREE.CylinderGeometry(.035,.07,1.25,12),mats.panel);tower.position.set(x,.68,index?.15:-.15);root.add(tower);const hub=new THREE.Group();hub.position.set(x,1.3,index?.15:-.15);const center=new THREE.Mesh(new THREE.SphereGeometry(.09,10,10),mats.cyan);hub.add(center);for(let b=0;b<3;b+=1){const blade=new THREE.Mesh(new THREE.BoxGeometry(.05,.52,.018),mats.glass);blade.position.y=.29;const pivot=new THREE.Group();pivot.rotation.z=b*Math.PI*2/3;pivot.add(blade);hub.add(pivot);}root.add(hub);rotors.push(hub);});
      for(let i=0;i<3;i+=1){const panel=new THREE.Mesh(new THREE.BoxGeometry(.55,.035,.38),new THREE.MeshStandardMaterial({color:0x253b78,metalness:.5,roughness:.25}));panel.position.set(-.6+i*.6,.16,.7);panel.rotation.x=-.25;root.add(panel);}root.userData={label:"Energy orchestration",eyebrow:"LOAD + WEATHER",rotors};return root;
    }

    function createField() {
      const root=new THREE.Group();for(let x=-2;x<=2;x+=1){for(let z=-1;z<=1;z+=1){const soil=new THREE.Mesh(new THREE.BoxGeometry(.35,.08,.35),new THREE.MeshStandardMaterial({color:(x+z)%2?0x1c2922:0x18231e,roughness:.9}));soil.position.set(x*.38,0,z*.38);root.add(soil);if((x+z)%2===0){const stem=new THREE.Mesh(new THREE.CylinderGeometry(.012,.018,.35,6),new THREE.MeshStandardMaterial({color:0x4a9b70}));stem.position.set(x*.38,.22,z*.38);root.add(stem);const leaf=new THREE.Mesh(new THREE.SphereGeometry(.07,7,5),new THREE.MeshStandardMaterial({color:0x67f7b5,emissive:0x123a28,emissiveIntensity:.5}));leaf.scale.set(1.5,.45,.65);leaf.position.set(x*.38+.06,.38,z*.38);root.add(leaf);}}}
      const sensor=new THREE.Mesh(new THREE.CylinderGeometry(.025,.035,1.05,8),mats.panel);sensor.position.set(.7,.56,-.35);root.add(sensor);const beacon=glowSprite(0x4ce5ff,.42);beacon.position.set(.7,1.05,-.35);root.add(beacon);root.userData={label:"Field coordination",eyebrow:"SOIL + CLIMATE"};return root;
    }

    function createSystems() {
      const group=new THREE.Group();const carousel=new THREE.Group();group.add(carousel);interactiveRoots.systems=carousel;
      const objects={fleet:createTruck(.9),factory:createFactory(),energy:createEnergy(),field:createField()};const names=Object.keys(objects);
      names.forEach((name,index)=>{const angle=index*Math.PI/2;const object=objects[name];object.userData.baseScale=object.scale.x;object.position.set(Math.sin(angle)*3.2,0,Math.cos(angle)*3.2);object.rotation.y=angle;object.traverse(child=>{if(child.material){if(Array.isArray(child.material))child.material=child.material.map(material=>material.clone());else child.material=child.material.clone();const materials=Array.isArray(child.material)?child.material:[child.material];materials.forEach(material=>{material.transparent=true;material.userData.systemOpacity=material.opacity;});}if(child.isMesh){child.userData={...child.userData,type:"system",system:name,label:object.userData.label||systemContent[name].index,eyebrow:object.userData.eyebrow||"PHYSICAL SYSTEM"};rayTargets.systems.push(child);}});carousel.add(object);});
      const orbit=new THREE.Mesh(new THREE.TorusGeometry(3.2,.008,4,160),new THREE.MeshBasicMaterial({color:0x4ce5ff,transparent:true,opacity:.16}));orbit.rotation.x=Math.PI/2;carousel.add(orbit);
      group.userData={carousel,objects,targetRotation:0,system:"fleet"};return group;
    }

    function createPolicy() {
      const group=new THREE.Group();const root=new THREE.Group();group.add(root);interactiveRoots.policy=root;
      const rings=[];[1.25,1.65,2.05].forEach((r,index)=>{const ring=new THREE.Mesh(new THREE.TorusGeometry(r,.018,6,100),new THREE.MeshBasicMaterial({color:index===1?0x4ce5ff:0x8b6dff,transparent:true,opacity:.28}));ring.rotation.set(index*.7,.5+index*.25,index*.35);root.add(ring);rings.push(ring);});
      const shield=new THREE.Mesh(new THREE.OctahedronGeometry(.72,1),new THREE.MeshPhysicalMaterial({color:0x183c48,emissive:0x0e5162,emissiveIntensity:1.2,metalness:.45,roughness:.25,transparent:true,opacity:.9}));shield.scale.set(.85,1.15,.45);root.add(glowSprite(0x4ce5ff,3),shield);
      const scanMaterial=new THREE.MeshBasicMaterial({color:0x4ce5ff,transparent:true,opacity:.12,depthWrite:false,side:THREE.DoubleSide});
      const threshold=new THREE.Mesh(new THREE.PlaneGeometry(.13,3.25),scanMaterial);threshold.position.z=.38;root.add(threshold);
      const thresholdGlow=glowSprite(0x4ce5ff,1);thresholdGlow.scale.set(.55,3.5,1);thresholdGlow.position.z=.3;root.add(thresholdGlow);
      [-1.48,1.48].forEach(y=>{const bracket=new THREE.Mesh(new THREE.BoxGeometry(.55,.025,.025),new THREE.MeshBasicMaterial({color:0x4ce5ff,transparent:true,opacity:.55}));bracket.position.set(.2,y,.4);root.add(bracket);});
      const tokenMaterial=mats.violet.clone();
      const token=new THREE.Mesh(new THREE.BoxGeometry(.34,.34,.34),tokenMaterial);token.position.set(-2.75,0,0);token.rotation.set(.4,.4,.15);root.add(token);
      const destination=new THREE.Mesh(new THREE.TorusGeometry(.3,.025,6,40),new THREE.MeshBasicMaterial({color:0x67f7b5,transparent:true,opacity:.6}));destination.position.x=2.75;destination.rotation.y=Math.PI/2;root.add(destination);
      const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-2.5,0,0),new THREE.Vector3(2.5,0,0)]),new THREE.LineDashedMaterial({color:0x60677e,dashSize:.12,gapSize:.1,transparent:true,opacity:.45}));line.computeLineDistances();root.add(line);
      const hit=new THREE.Mesh(new THREE.SphereGeometry(1,10,10),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}));hit.userData={type:"policy",label:"Deterministic policy gate",eyebrow:"CONTROL BOUNDARY"};root.add(hit);rayTargets.policy.push(hit);
      group.userData={root,rings,shield,threshold,thresholdGlow,token,destination,risk:2,testAt:-10,blocked:false};return group;
    }

    chapterGroups.world=createWorld();chapterGroups.incident=createIncident();chapterGroups.model=createModel();chapterGroups.systems=createSystems();chapterGroups.policy=createPolicy();
    Object.entries(chapterGroups).forEach(([name,group])=>{group.userData.fade=name==="world"?1:0;group.userData.target=name==="world"?1:0;scene.add(group);});

    const cameraTarget=new THREE.Vector3(0,0,0);const desiredCamera=new THREE.Vector3(0,.1,9);
    let dragging=false,dragMoved=0,dragStart={x:0,y:0},rootStart={x:0,y:0},pointerClient={x:0,y:0},activeHover=null,documentVisible=true;
    const pointer=new THREE.Vector2(10,10);const raycaster=new THREE.Raycaster();const clock=new THREE.Clock();

    function layoutGroups() {
      const mobile=innerWidth<760;
      chapterGroups.world.userData.home=new THREE.Vector3(mobile?0:1.25,mobile?-.35:.05,0);
      chapterGroups.incident.userData.home=new THREE.Vector3(mobile?0:.8,mobile?-.35:0,0);
      chapterGroups.model.userData.home=new THREE.Vector3(mobile?0:.55,mobile?-.45:0,0);
      chapterGroups.systems.userData.home=new THREE.Vector3(mobile?0:.1,mobile?-.45:0,0);
      chapterGroups.policy.userData.home=new THREE.Vector3(mobile?0:.65,mobile?-.45:0,0);
      Object.values(chapterGroups).forEach(group=>{if(group.userData.fade>.9)group.position.copy(group.userData.home);});
      desiredCamera.z=mobile?10:9;
    }
    layoutGroups();

    function setChapter(name) {
      Object.entries(chapterGroups).forEach(([key,group])=>{
        const active=key===name;
        group.userData.target=active?1:0;
        group.userData.fade=active?0:group.userData.fade;
        group.visible=active;
        if(active){const home=group.userData.home||new THREE.Vector3();group.position.copy(home).add(new THREE.Vector3(0,-.25,-1.5));}
      });
      desiredCamera.set(0,name==="systems"?.15:.05,innerWidth<760?10:9);
      activeHover=null;window.tracehelmHover?.(null,false);
    }

    function selectNode(id) {const data=chapterGroups.world.userData;data.selected=id;data.markers.forEach((marker,key)=>marker.userData.targetScale=key===id?1.55:1);updateSelectedNode(id,true);}
    function focusNode(id){const data=chapterGroups.world.userData;const marker=data.markers.get(id);if(!marker)return;data.focusQuaternion=new THREE.Quaternion().setFromUnitVectors(marker.position.clone().normalize(),new THREE.Vector3(0,0,1));selectNode(id);}
    function updateIncident(risk,values){const data=chapterGroups.incident.userData;data.risk=risk;data.riskGlow.material.opacity=.07+risk*.33;data.riskGlow.material.color.set(risk>.72?0xff665c:risk>.42?0xffc866:0x67f7b5);data.truck.userData.cooling.material.color.copy(data.riskGlow.material.color);data.truck.rotation.z=(risk-.5)*.03;}
    function executeIncident(){chapterGroups.incident.userData.executeAt=clock.elapsedTime;}
    function pulseIncident(){const glow=chapterGroups.incident.userData.riskGlow;glow.material.opacity=.8;glow.scale.setScalar(3.3);}
    function selectModelPart(part){const data=chapterGroups.model.userData;data.part=part;const targets={interaction:new THREE.Vector3(0,0,0),background:new THREE.Vector3(-.5,-.08,0),context:new THREE.Vector3(.2,0,0),tools:new THREE.Vector3(.45,.1,0)};data.root.userData.targetPosition=targets[part]||targets.interaction;}
    function selectSystemScene(name){const data=chapterGroups.systems.userData;const index=Object.keys(data.objects).indexOf(name);data.system=name;data.targetRotation=-index*Math.PI/2;selectSystem(name,true);}
    function updatePolicy(risk){const data=chapterGroups.policy.userData;data.risk=risk;const color=risk>=4?0xff665c:risk===3?0xffc866:0x4ce5ff;data.shield.material.color.set(color);data.shield.material.emissive.set(color).multiplyScalar(.25);data.threshold.material.color.set(color);data.thresholdGlow.material.color.set(color);data.rings.forEach(r=>r.material.color.set(color));}
    function testPolicy(blocked){const data=chapterGroups.policy.userData;data.blocked=blocked;data.testAt=clock.elapsedTime;data.token.position.set(-2.75,0,0);data.token.material.color.set(blocked?0xff665c:0x8b6dff);}
    function setIncidentMode(enabled){scene.fog.color.set(enabled?0x130407:0x05050a);key.color.set(enabled?0xff665c:0x93f4ff);stars.material.color.set(enabled?0xff665c:0x777f9c);}

    sceneController={setChapter,selectNode,focusNode,updateIncident,executeIncident,pulseIncident,selectModelPart,selectSystem:selectSystemScene,updatePolicy,testPolicy,setIncidentMode};

    const ndc=(event)=>{pointer.x=event.clientX/innerWidth*2-1;pointer.y=-(event.clientY/innerHeight)*2+1;pointerClient={x:event.clientX,y:event.clientY};};
    canvas.addEventListener("pointerdown",event=>{dragging=true;dragMoved=0;dragStart={x:event.clientX,y:event.clientY};const root=interactiveRoots[appState.chapter];rootStart={x:root?.rotation.x||0,y:root?.rotation.y||0};if(appState.chapter==="world")chapterGroups.world.userData.focusQuaternion=null;canvas.setPointerCapture?.(event.pointerId);});
    canvas.addEventListener("pointermove",event=>{ndc(event);if(!dragging)return;const dx=event.clientX-dragStart.x,dy=event.clientY-dragStart.y;dragMoved=Math.max(dragMoved,Math.abs(dx)+Math.abs(dy));const root=interactiveRoots[appState.chapter];if(!root)return;if(appState.chapter==="systems"){const data=chapterGroups.systems.userData;data.targetRotation=rootStart.y+dx*.006;}else{root.rotation.y=rootStart.y+dx*.006;root.rotation.x=clamp(rootStart.x+dy*.004,-1.05,1.05);}});
    const pointerEnd=event=>{
      if(!dragging)return;
      dragging=false;
      if(appState.chapter==="systems"&&dragMoved>=7){
        const data=chapterGroups.systems.userData;
        const quarter=Math.round(data.targetRotation/(Math.PI/2));
        const index=(((-quarter)%4)+4)%4;
        selectSystemScene(Object.keys(data.objects)[index]);
        return;
      }
      if(dragMoved<7){
        ndc(event);raycaster.setFromCamera(pointer,camera);
        const hit=raycaster.intersectObjects(rayTargets[appState.chapter],false)[0]?.object;
        if(hit){
          const d=hit.userData;
          if(d.type==="node")selectNode(d.id);
          if(d.type==="model"){
            appState.modelPart=d.part;
            $$('[data-model-part]').forEach(button=>{const active=button.dataset.modelPart===d.part;button.classList.toggle("active",active);button.setAttribute("aria-pressed",String(active));});
            selectModelPart(d.part);
          }
          if(d.type==="system")selectSystemScene(d.system);
          if(d.type==="incident")pulseIncident();
          if(d.type==="policy")$("[data-test-gate]")?.click();
        }
      }
    };
    canvas.addEventListener("pointerup",pointerEnd);canvas.addEventListener("pointercancel",()=>dragging=false);
    canvas.addEventListener("wheel",event=>{desiredCamera.z=clamp(desiredCamera.z+event.deltaY*.003,7.2,10.5);},{passive:true});
    canvas.addEventListener("keydown",event=>{if(appState.chapter!=="world")return;if(event.key==="Enter"){event.preventDefault();focusNode(appState.selectedNode);return;}if(event.key.startsWith("Arrow")){event.preventDefault();const ids=Object.keys(nodes),index=ids.indexOf(appState.selectedNode);const next=event.key==="ArrowLeft"||event.key==="ArrowUp"?(index-1+ids.length)%ids.length:(index+1)%ids.length;selectNode(ids[next]);}});

    window.addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));layoutGroups();});
    document.addEventListener("visibilitychange",()=>{documentVisible=!document.hidden;});

    const tempColor=new THREE.Color();
    const smoothScale=(object,target,amount=.08)=>{const next=object.scale.x+(target-object.scale.x)*amount;object.scale.setScalar(next);};
    function animateChapterGroups(){Object.values(chapterGroups).forEach(group=>{const home=group.userData.home||cameraTarget;if(reducedMotion){group.userData.fade=group.userData.target;group.position.copy(home);group.scale.setScalar(1);return;}const delta=group.userData.target-group.userData.fade;group.userData.fade+=delta*.085;group.position.lerp(home,.08);smoothScale(group,.72+group.userData.fade*.28);});}

    function animateWorld(time,motion){const data=chapterGroups.world.userData;if(!dragging&&!data.focusQuaternion)data.root.rotation.y+=.0007*motion;if(data.focusQuaternion){data.root.quaternion.slerp(data.focusQuaternion,reducedMotion?1:.045);if(data.root.quaternion.angleTo(data.focusQuaternion)<.006)data.focusQuaternion=null;}data.orbit.rotation.z+=.0025*motion;data.pulses.forEach((pulse,index)=>{pulse.position.copy(pulse.userData.curve.getPointAt((pulse.userData.offset+time*(.045+index*.001))%1));});data.markers.forEach((marker,id)=>{const selected=id===data.selected;const pulse=1+Math.sin(time*2.3+marker.position.x)*.08*motion;const scale=marker.userData.targetScale*(id===activeHover?.userData?.id?1.22:1)*pulse;smoothScale(marker,scale,.12);marker.userData.ring.rotation.z+=.012*motion;marker.userData.halo.material.opacity=(selected ? .4 : .2)+Math.sin(time*2)*.05*motion;});}
    function animateIncident(time,motion){const data=chapterGroups.incident.userData;data.root.rotation.y+=dragging?0:.0005*motion;data.truck.userData.wheels.forEach(w=>w.rotation.y-=.015*motion);data.ring.rotation.z+=.002*motion;data.routeArc.material.opacity=.35+Math.sin(time*2)*.25;if(time-data.executeAt<1.7){const p=clamp((time-data.executeAt)/1.7,0,1);data.truck.position.x=-.15+p*.85;data.routeArc.material.color.set(0x67f7b5);}else if(time-data.executeAt>3){data.truck.position.x+=(-.15-data.truck.position.x)*.03;data.routeArc.material.color.set(0x8b6dff);}data.riskGlow.scale.setScalar(1.8+data.risk*.8+Math.sin(time*2.5)*.08);}
    function animateModel(time,motion){const data=chapterGroups.model.userData;data.coreGroup.rotation.y+=.004*motion;data.coreWire.rotation.x-=.002*motion;data.rings.forEach((ring,i)=>{ring.rotation.z+=(i%2?-.003:.002)*motion;ring.rotation.y+=.001*(i+1)*motion;});data.background.rotation.y-=.003*motion;data.contextRing.rotation.z+=.0015*motion;data.hitContext.rotation.copy(data.contextRing.rotation);data.toolGroup.children.forEach((cube,i)=>cube.rotation.y+=.002*(i+1)*motion);data.streams.forEach(p=>{const t=(p.userData.offset+time*(.12+p.userData.lane*.025))%1;p.position.set(-3.1+t*6.2,(p.userData.lane-1)*.32+Math.sin(t*Math.PI)*.35,Math.sin(t*Math.PI*2+p.userData.lane)*.4);});if(data.root.userData.targetPosition){if(reducedMotion)data.root.position.copy(data.root.userData.targetPosition);else data.root.position.lerp(data.root.userData.targetPosition,.05);}const emphasis={interaction:data.coreGroup,background:data.background,tools:data.toolGroup,context:data.contextRing}[data.part];[data.coreGroup,data.background,data.toolGroup,data.contextRing].forEach(object=>smoothScale(object,object===emphasis?1.18:1));const contextOpacity=data.part === "context" ? 0.55 : 0.2;data.contextRing.material.opacity+=(contextOpacity-data.contextRing.material.opacity)*.08;}
    function animateSystems(time,motion){const data=chapterGroups.systems.userData;const mobile=innerWidth<760;data.carousel.rotation.y=reducedMotion?data.targetRotation:data.carousel.rotation.y+(data.targetRotation-data.carousel.rotation.y)*.06;Object.entries(data.objects).forEach(([name,object])=>{const active=name===data.system;const base=object.userData.baseScale||1;const targetScale=base*(active ? (mobile ? 0.94 : 1.12) : (mobile ? 0.48 : 0.58));smoothScale(object,targetScale,reducedMotion?1:.08);const targetY=active?0:-.34;object.position.y+=(targetY-object.position.y)*(reducedMotion?1:.08);object.traverse(child=>{if(!child.material)return;const materials=Array.isArray(child.material)?child.material:[child.material];materials.forEach(material=>{if(material.userData.systemOpacity===undefined)return;const target=material.userData.systemOpacity*(active?1:.2);material.opacity+=(target-material.opacity)*(reducedMotion?1:.1);});});});data.objects.fleet.userData.wheels?.forEach(w=>w.rotation.y-=.01*motion);data.objects.factory.userData.items?.forEach((item,index)=>{item.position.x=-.75+((time*.25+index*.37+2)%1.85);});data.objects.energy.userData.rotors?.forEach((rotor,index)=>rotor.rotation.z+=(.012+index*.004)*motion);}
    function animatePolicy(time,motion){const data=chapterGroups.policy.userData;data.rings.forEach((ring,index)=>{ring.rotation.z+=(index%2?.003:-.002)*motion;ring.rotation.y+=.001*motion;});data.shield.rotation.y+=.004*motion;data.threshold.material.opacity=.1+Math.sin(time*2.4)*.045*motion;const elapsed=time-data.testAt;if(elapsed>=0&&elapsed<1.35){const p=clamp(elapsed/1.35,0,1);if(data.blocked){const blockedP=Math.min(p,.48);data.token.position.x=-2.75+blockedP*5.5;data.token.position.y=Math.sin(p*Math.PI*6)*.08;if(p>.5)data.token.position.x-=Math.sin((p-.5)*Math.PI)*.7;}else data.token.position.x=-2.75+p*5.5;data.token.rotation.x+=.06*motion;data.token.rotation.y+=.08*motion;}else if(elapsed>2.5)data.token.position.x+=(-2.75-data.token.position.x)*.04;data.destination.material.color.set(data.blocked?0xff665c:0x67f7b5);}

    function updateHover(){raycaster.setFromCamera(pointer,camera);const target=raycaster.intersectObjects(rayTargets[appState.chapter],false)[0]?.object||null;if(target!==activeHover){activeHover=target;canvas.style.cursor=target?"pointer":dragging?"grabbing":"grab";window.tracehelmHover?.(target?.userData,Boolean(target),pointerClient.x,pointerClient.y);}}

    let lastReducedFrame=0;
    renderer.setAnimationLoop(timestamp=>{
      if(!documentVisible||reducedMotion&&timestamp-lastReducedFrame<100)return;lastReducedFrame=timestamp;clock.getDelta();const time=reducedMotion?0:clock.elapsedTime,motion=reducedMotion?0:1;
      animateChapterGroups();if(reducedMotion)camera.position.copy(desiredCamera);else camera.position.lerp(desiredCamera,.045);camera.lookAt(cameraTarget);stars.rotation.y+=.00008*motion;floorGrid.position.z=(time*.08)%1-1;
      if(appState.chapter==="world")animateWorld(time,motion);else if(appState.chapter==="incident")animateIncident(time,motion);else if(appState.chapter==="model")animateModel(time,motion);else if(appState.chapter==="systems")animateSystems(time,motion);else animatePolicy(time,motion);updateHover();
      renderer.render(scene,camera);
    });

    setChapter("world");selectNode("delhi");selectSystemScene("fleet");updatePolicy(2);
    return true;
  } catch (error) {
    console.error("Tracehelm 3D initialization failed",error);
    $(".scene-fallback")?.classList.add("visible");
    showToast("WebGL unavailable · interface fallback active");
    return false;
  }
}

async function boot() {
  initNavigation();
  initCursor();
  initAudio();
  initIncidentControls();
  initModelControls();
  initSystemControls();
  initPolicyControls();
  initReplayAndSecrets();
  initFocusControl();

  const percent = $("[data-boot-percent]");
  const line = $(".boot__line span");
  let progress = 0;
  const timer = setInterval(() => {
    progress = Math.min(88, progress + Math.ceil(Math.random() * 7));
    if (percent) percent.textContent = `${progress}%`;
    if (line) line.style.width = `${progress}%`;
  }, 85);

  await initThreeExperience();
  clearInterval(timer);
  if (percent) percent.textContent = "100%";
  if (line) line.style.width = "100%";
  setTimeout(() => $(".boot")?.classList.add("done"), 280);
  const initialChapter = chapterOrder.includes(location.hash.slice(1)) ? location.hash.slice(1) : "world";
  goToChapter(initialChapter, { silent: true, noHistory: true });
}

boot();
