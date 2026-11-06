import './style.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import CameraControls from 'camera-controls';
import { EffectComposer, RenderPass, EffectPass, SMAAEffect, SMAAPreset, BloomEffect, ToneMappingEffect, ToneMappingMode, VignetteEffect } from 'postprocessing';
import { N8AOPostPass } from 'n8ao';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { CENTER, FLOORS, CAMS, ROOMS, VIEWS, LAMPS, I18N } from './data.js';

CameraControls.install({ THREE });
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

// ---------- helpers ----------
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const C = new THREE.Vector3(...CENTER);
const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]).sub(C);
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const isSmall = Math.min(innerWidth, innerHeight) < 700;
const lowPower = isTouch || isSmall;
if (isTouch) document.body.classList.add('touch');
const EYE = 1.62;
const HOUSE_C = new THREE.Vector3(0.3, 0, 0.1);
let lang = 'uz';
try { lang = localStorage.getItem('kv_lang') || 'uz'; } catch (e) {}
if (!I18N[lang]) lang = 'uz';
const t = (k) => (I18N[lang] && I18N[lang][k]) || I18N.uz[k] || k;
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

// ---------- renderer ----------
const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false, depth: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, lowPower ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.05, 4000);

// clipping plane for floor cut (keeps y <= constant)
const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e5);
let clipTarget = 1e5, clipCurrent = 1e5;

// ---------- sky & lights ----------
const sky = new Sky();
sky.scale.setScalar(3000);
scene.add(sky);
const skyU = sky.material.uniforms;
const pmrem = new THREE.PMREMGenerator(renderer);
let envRT = null;

const sun = new THREE.DirectionalLight(0xfff1dc, 3.2);
sun.castShadow = true;
sun.shadow.mapSize.set(lowPower ? 2048 : 4096, lowPower ? 2048 : 4096);
const sc = sun.shadow.camera;
sc.left = -24; sc.right = 24; sc.top = 24; sc.bottom = -24; sc.near = 1; sc.far = 180;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.035;
sun.shadow.radius = 3;
scene.add(sun, sun.target);
sun.target.position.copy(HOUSE_C);

const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x6b5a45, 0.35);
scene.add(hemi);

// interior lamp pool (evening)
const lampPool = [];
for (let i = 0; i < (lowPower ? 5 : 8); i++) {
  const l = new THREE.PointLight(0xffc98a, 0, 9, 2);
  scene.add(l); lampPool.push(l);
}
const lampPts = LAMPS.map(v3);

let evening = false;
function applyTime() {
  const elev = evening ? THREE.MathUtils.degToRad(3.5) : THREE.MathUtils.degToRad(38);
  const az = evening ? THREE.MathUtils.degToRad(-125) : Math.atan2(0.37, -0.696); // from Blender LGT_Sun
  const dir = new THREE.Vector3(Math.cos(elev) * Math.cos(az), Math.sin(elev), Math.cos(elev) * Math.sin(az));
  skyU.sunPosition.value.copy(dir);
  skyU.turbidity.value = evening ? 7 : 3.2;
  skyU.rayleigh.value = evening ? 2.6 : 1.4;
  skyU.mieCoefficient.value = evening ? 0.012 : 0.004;
  skyU.mieDirectionalG.value = evening ? 0.86 : 0.8;
  sun.position.copy(HOUSE_C).addScaledVector(dir, 90);
  sun.color.set(evening ? 0xff9c55 : 0xfff1dc);
  sun.intensity = evening ? 0.9 : 2.6;
  hemi.intensity = evening ? 0.08 : 0.22;
  // environment from sky
  const envScene = new THREE.Scene();
  const s2 = new Sky(); s2.scale.setScalar(1000);
  Object.keys(skyU).forEach((k) => { if (s2.material.uniforms[k]) s2.material.uniforms[k].value = skyU[k].value.clone ? skyU[k].value.clone() : skyU[k].value; });
  envScene.add(s2);
  if (envRT) envRT.dispose();
  envRT = pmrem.fromScene(envScene, 0.02);
  scene.environment = envRT.texture;
  scene.environmentIntensity = evening ? 0.26 : 0.6;
  scene.fog = new THREE.Fog(evening ? 0x3a2c2a : 0xc9d3dc, 90, 520);
  emissiveMats.forEach((m) => { m.emissiveIntensity = evening ? 6 : 1.2; });
  if (bloom) bloom.intensity = evening ? 0.9 : 0.0;
  lampPool.forEach((l) => (l.intensity = 0));
  lastLampPos.set(1e9, 0, 0);
  document.body.classList.toggle('evening', evening);
  dirty = 30;
}
const lastLampPos = new THREE.Vector3(1e9, 0, 0);
function updateLamps(force) {
  if (!evening) return;
  const p = mode === 'walk' ? walk.pos : controls.getTarget(new THREE.Vector3());
  if (!force && p.distanceTo(lastLampPos) < 1.5) return;
  lastLampPos.copy(p);
  const sorted = lampPts.map((q) => ({ q, d: q.distanceToSquared(p) })).sort((a, b) => a.d - b.d);
  lampPool.forEach((l, i) => {
    const s = sorted[i];
    if (!s) { l.intensity = 0; return; }
    l.position.copy(s.q).add(new THREE.Vector3(0, -0.25, 0));
    l.intensity = 9;
  });
}

// ground with a hole for the site (so the sunken lower courtyard stays open)
{
  const sh = new THREE.Shape();
  sh.moveTo(-600, -600); sh.lineTo(600, -600); sh.lineTo(600, 600); sh.lineTo(-600, 600); sh.lineTo(-600, -600);
  const hole = new THREE.Path();
  hole.moveTo(-17, -20); hole.lineTo(-17, 12.8); hole.lineTo(19.1, 12.8); hole.lineTo(19.1, -20); hole.lineTo(-17, -20);
  sh.holes.push(hole);
  const g = new THREE.ShapeGeometry(sh);
  g.rotateX(-Math.PI / 2);
  // subtle procedural texture
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const cx = cv.getContext('2d'); cx.fillStyle = '#7d7e5b'; cx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 9000; i++) { const s = Math.random(); cx.fillStyle = `rgba(${60 + s * 60},${70 + s * 50},${40 + s * 30},0.35)`; cx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
  const tex = new THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(120, 120); tex.colorSpace = THREE.SRGBColorSpace;
  const ground = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0 }));
  ground.position.y = 0.57;
  ground.receiveShadow = true;
  ground.userData.ground = true;
  scene.add(ground);
}

// ---------- post processing ----------
const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType, multisampling: 0 });
composer.addPass(new RenderPass(scene, camera));
const n8 = new N8AOPostPass(scene, camera, innerWidth, innerHeight);
n8.configuration.aoRadius = 1.2;
n8.configuration.distanceFalloff = 0.6;
n8.configuration.intensity = 2.6;
n8.configuration.gammaCorrection = false;
n8.setQualityMode(lowPower ? 'Low' : 'Medium');
if (lowPower) n8.configuration.halfRes = true;
composer.addPass(n8);
let bloom = new BloomEffect({ intensity: 0.0, luminanceThreshold: 2.2, luminanceSmoothing: 0.2, mipmapBlur: true, radius: 0.7 });
const tone = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
const vign = new VignetteEffect({ offset: 0.3, darkness: 0.45 });
composer.addPass(new EffectPass(camera, bloom, tone, vign));
composer.addPass(new EffectPass(camera, new SMAAEffect({ preset: lowPower ? SMAAPreset.MEDIUM : SMAAPreset.HIGH })));
renderer.toneMappingExposure = 0.9;

// ---------- controls ----------
const controls = new CameraControls(camera, canvas);
controls.smoothTime = 0.7;
controls.draggingSmoothTime = 0.12;
controls.minDistance = 4;
controls.maxDistance = 140;
controls.maxPolarAngle = THREE.MathUtils.degToRad(86);
controls.dollyToCursor = true;
controls.azimuthRotateSpeed = 0.9;
controls.polarRotateSpeed = 0.9;
controls.truckSpeed = 1.6;
controls.setBoundary(new THREE.Box3(new THREE.Vector3(-60, -5, -60), new THREE.Vector3(60, 60, 60)));
controls.boundaryEnclosesCamera = false;

let autoRotate = true;
let userTouched = false;
controls.addEventListener('controlstart', () => { userTouched = true; setAutoRotate(false); });

// ---------- state ----------
let mode = 'overview'; // overview | floor | walk
let curFloor = 'all';
let planView = false;
let dirty = 60;
let model = null;
const colliders = [];
const emissiveMats = [];

// ---------- load model ----------
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const base = import.meta.env.BASE_URL;
const barFill = $('#bar-fill'), pctEl = $('#loader-pct');

// models are .glb on GitHub Pages; the Claude artifact host only serves text, so there they are base64 JSON
const MODEL_EXT = import.meta.env.VITE_MODEL_FMT === 'json' ? 'json' : 'glb';
function loadModel(name, onLoad, onProgress, onError) {
  const url = `${base}models/${name}.${MODEL_EXT}`;
  if (MODEL_EXT === 'glb') return loader.load(url, onLoad, onProgress, onError);
  const xhr = new XMLHttpRequest();
  xhr.open('GET', url); xhr.responseType = 'text';
  xhr.onprogress = (e) => onProgress && onProgress({ loaded: e.loaded, total: e.lengthComputable ? e.total : 14e6 });
  xhr.onload = () => {
    try {
      const b64 = JSON.parse(xhr.responseText);
      const bin = atob(b64); const buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      loader.parse(buf.buffer, '', onLoad, onError);
    } catch (e) { onError && onError(e); }
  };
  xhr.onerror = () => onError && onError(new Error('network'));
  xhr.send();
}
function setPct(p) { const v = Math.round(p * 100); barFill.style.width = v + '%'; pctEl.textContent = v + '%'; }

loadModel('ipakchi', (gltf) => {
  model = gltf.scene;
  model.position.sub(C);
  $('#loader-msg').textContent = t('preparing');
  setPct(1);
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const seen = new Set();
  model.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    let glass = false;
    mats.forEach((m) => {
      const isGlass = (m.transmission && m.transmission > 0) || /glass|oyna|shisha|стекл|steklo|vitraj/i.test(m.name || '');
      if (isGlass) glass = true;
      if (seen.has(m)) return; seen.add(m);
      if (isGlass) {
        m.transmission = 0; m.transparent = true; m.opacity = 0.18; m.roughness = 0.03; m.metalness = 0.0;
        m.depthWrite = false; m.color.set(0xcfe3ea); m.envMapIntensity = 1.4; m.side = THREE.DoubleSide;
      }
      ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap'].forEach((k) => { if (m[k]) m[k].anisotropy = maxAniso; });
      if (m.emissive && (m.emissive.r + m.emissive.g + m.emissive.b) > 0.01) emissiveMats.push(m);
      m.clippingPlanes = [clipPlane];
      m.clipShadows = true;
      m.shadowSide = THREE.DoubleSide;
    });
    o.castShadow = !glass;
    o.receiveShadow = true;
    if (glass) { o.userData.glass = true; o.renderOrder = 2; }
    else colliders.push(o);
  });
  scene.add(model);
  model.updateMatrixWorld(true);
  // neighbouring houses: soft "white clay" context massing
  loadModel('context', (g2) => {
    const clay = new THREE.MeshStandardMaterial({ color: 0xe8e1d4, roughness: 0.95, metalness: 0 });
    const roof = new THREE.MeshStandardMaterial({ color: 0xcfc7b8, roughness: 0.9, metalness: 0 });
    clay.clippingPlanes = roof.clippingPlanes = [clipPlane];
    g2.scene.position.sub(C);
    g2.scene.traverse((o) => {
      if (!o.isMesh) return;
      const n = (o.material && o.material.name) || '';
      o.material = /Tom/i.test(n) ? roof : clay;
      o.castShadow = o.receiveShadow = true;
    });
    scene.add(g2.scene);
    dirty = 20;
  });
  applyTime();
  buildHotspots();
  // compile, then reveal
  renderer.compile(scene, camera);
  requestAnimationFrame(() => {
    $('#loader').classList.add('done');
    dirty = 120;
    setTimeout(() => buildBVH(), 300);
  });
}, (e) => {
  if (e.total) setPct(Math.min(0.99, e.loaded / e.total));
  else setPct(Math.min(0.95, e.loaded / 11e6));
}, (err) => {
  console.error(err);
  $('#loader-msg').textContent = 'Error: ' + err.message;
});

let bvhReady = false;
function buildBVH() {
  let i = 0;
  const step = () => {
    const t0 = performance.now();
    while (i < colliders.length && performance.now() - t0 < 30) {
      try { colliders[i].geometry.computeBoundsTree(); } catch (e) { console.warn('bvh', e); }
      i++;
    }
    if (i < colliders.length) requestAnimationFrame(step); else bvhReady = true;
  };
  step();
}

// ---------- camera framing ----------
function fovFromLens(lens) {
  const h = 2 * Math.atan(18 / lens); // horizontal on 36mm
  const v = 2 * Math.atan(Math.tan(h / 2) / Math.max(1, camera.aspect));
  return THREE.MathUtils.radToDeg(v);
}
function walkFov() {
  // ~92° horizontal on landscape, a bit taller on portrait
  const hf = THREE.MathUtils.degToRad(92);
  let v = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hf / 2) / camera.aspect));
  return THREE.MathUtils.clamp(v, 55, 88);
}
function baseFov() { return camera.aspect < 0.8 ? 52 : 40; }

let fovAnim = null;
function animateFov(to, dur = 1.0) { fovAnim = { from: camera.fov, to, t: 0, dur }; }

function goHome(instant = false) {
  mode = 'overview'; curFloor = 'all'; planView = false;
  setClip(null);
  animateFov(baseFov());
  const d = camera.aspect < 0.8 ? 50 : 44;
  controls.minDistance = 4; controls.maxDistance = 140;
  controls.setLookAt(HOUSE_C.x - d * 0.5, camera.aspect < 0.8 ? 19 : 15, HOUSE_C.z + d * 0.85, HOUSE_C.x, camera.aspect < 0.8 ? 1.5 : 3.2, HOUSE_C.z, !instant);
  updateUI();
}

function goFloor(id) {
  const f = FLOORS.find((x) => x.id === id);
  if (!f) return;
  if (mode === 'walk') exitWalkCore();
  mode = id === 'all' ? 'overview' : 'floor';
  curFloor = id;
  setClip(f.clip);
  animateFov(baseFov());
  setAutoRotate(false);
  const ty = id === 'all' ? 3.2 : f.y + 0.6;
  const dist = camera.aspect < 0.8 ? 52 : 36;
  if (planView && id !== 'all') {
    controls.setLookAt(HOUSE_C.x, ty + dist * 1.05, HOUSE_C.z + 0.01, HOUSE_C.x, ty, HOUSE_C.z, true);
  } else {
    const az = controls.azimuthAngle;
    const polar = THREE.MathUtils.degToRad(id === 'all' ? 68 : 48);
    const x = HOUSE_C.x + dist * Math.sin(polar) * Math.sin(az);
    const z = HOUSE_C.z + dist * Math.sin(polar) * Math.cos(az);
    const y = ty + dist * Math.cos(polar);
    controls.setLookAt(x, y, z, HOUSE_C.x, ty, HOUSE_C.z, true);
  }
  updateUI();
}

function goView(v) {
  if (mode === 'walk') exitWalkCore();
  if (!v.cam) { goHome(); return; }
  const c = CAMS[v.cam];
  const p = v3(c.pos), d = new THREE.Vector3(...c.dir).normalize();
  mode = 'overview'; curFloor = 'all';
  setClip(null);
  setAutoRotate(false);
  animateFov(THREE.MathUtils.clamp(fovFromLens(c.lens) * 0.85, 38, 68));
  const tgt = p.clone().addScaledVector(d, v.cam === 'Aerial' ? 40 : 9);
  controls.minDistance = 1; controls.maxDistance = 140;
  controls.setLookAt(p.x, p.y, p.z, tgt.x, tgt.y, tgt.z, true);
  updateUI();
}

function setClip(y) {
  clipTarget = y == null ? 1e5 : y;
  dirty = 90;
}

// ---------- walk (first-person) ----------
const walk = {
  pos: new THREE.Vector3(), yaw: 0, pitch: 0, yawT: 0, pitchT: 0,
  tween: null, room: null, keys: {}, joy: new THREE.Vector2(),
};
const ray = new THREE.Raycaster();
ray.firstHitOnly = true;
const DOWN = new THREE.Vector3(0, -1, 0);

function floorBelow(p, up = 0.6, far = 6) {
  if (!colliders.length) return null;
  ray.set(new THREE.Vector3(p.x, p.y + up, p.z), DOWN);
  ray.far = far;
  ray.firstHitOnly = false;
  const hits = ray.intersectObjects(colliders, false);
  ray.firstHitOnly = true;
  for (const h of hits) {
    const n = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : null;
    if (!n || Math.abs(n.y) > 0.6) return h.point.y;
  }
  return null;
}

function enterRoom(room, fly = true) {
  const c = CAMS[room.cam];
  const p = v3(c.pos), d = new THREE.Vector3(...c.dir).normalize();
  const yaw = Math.atan2(-d.x, -d.z);
  const pitch = THREE.MathUtils.clamp(Math.asin(d.y) * 0.45, -0.3, 0.2);
  // snap eye height to the floor under the camera
  const fy = floorBelow(p, 0.2, 4);
  if (fy != null) p.y = fy + EYE;
  walk.room = room;
  setAutoRotate(false);
  if (mode === 'walk' || !fly) {
    fadeSwap(() => { startWalk(p, yaw, pitch); });
    return;
  }
  // fly in: cut the floor, glide to the room, then lift the cut
  const f = FLOORS.find((x) => x.id === room.floor);
  setClip(f ? f.clip + 0.4 : null);
  mode = 'flying';
  document.body.classList.add('flying');
  updateUI();
  const look = p.clone().add(new THREE.Vector3(-Math.sin(yaw), Math.sin(pitch), -Math.cos(yaw)).multiplyScalar(0.4));
  controls.minDistance = 0.01;
  animateFov(walkFov(), 1.4);
  controls.smoothTime = 0.55;
  const token = (enterRoom.token = (enterRoom.token || 0) + 1);
  let done = false;
  const finish = () => {
    if (done || token !== enterRoom.token || mode !== 'flying') return;
    done = true;
    controls.smoothTime = 0.7;
    startWalk(p, yaw, pitch);
  };
  controls.setLookAt(p.x, p.y, p.z, look.x, look.y, look.z, true).then(finish);
  setTimeout(finish, 2600);
}

function startWalk(p, yaw, pitch) {
  mode = 'walk';
  document.body.classList.remove('flying');
  controls.enabled = false;
  walk.pos.copy(p);
  walk.yaw = walk.yawT = yaw;
  walk.pitch = walk.pitchT = pitch;
  walk.tween = null;
  camera.fov = walkFov(); camera.updateProjectionMatrix(); fovAnim = null;
  setClip(null);
  clipCurrent = clipTarget = 1e5; clipPlane.constant = 1e5;
  document.body.classList.add('walk');
  updateWalkHud();
  updateLamps(true);
  updateUI();
  showHint();
  dirty = 40;
}

function exitWalkCore() {
  document.body.classList.remove('walk');
  $('#cursor-ring').classList.remove('show');
  controls.enabled = true;
  const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
  const tgt = camera.position.clone().addScaledVector(dir, 6);
  controls.minDistance = 0.01;
  controls.setLookAt(camera.position.x, camera.position.y, camera.position.z, tgt.x, tgt.y, tgt.z, false);
  controls.minDistance = 4;
}
function exitWalk() {
  const fl = walk.room ? walk.room.floor : 'f1';
  exitWalkCore();
  goFloor(fl);
}

function walkDir() {
  return new THREE.Vector3(-Math.sin(walk.yaw) * Math.cos(walk.pitch), Math.sin(walk.pitch), -Math.cos(walk.yaw) * Math.cos(walk.pitch));
}

function moveTo(target, dur) {
  const dist = walk.pos.distanceTo(target);
  walk.tween = { from: walk.pos.clone(), to: target.clone(), t: 0, dur: dur || THREE.MathUtils.clamp(dist / 3.2, 0.45, 1.6) };
}

function blocked(from, delta) {
  const len = delta.length();
  if (len < 1e-5 || !colliders.length) return delta;
  const dir = delta.clone().normalize();
  // check at knee and chest height
  for (const h of [-1.15, -0.45]) {
    ray.set(new THREE.Vector3(from.x, from.y + h, from.z), dir);
    ray.far = len + 0.32;
    const hit = ray.intersectObjects(colliders, false)[0];
    if (hit && hit.face) {
      const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
      if (Math.abs(n.y) < 0.6) {
        n.y = 0; n.normalize();
        if (n.dot(dir) > 0) n.negate();
        const slide = delta.clone().sub(n.multiplyScalar(delta.dot(n)));
        return slide.multiplyScalar(0.9);
      }
    }
  }
  return delta;
}

function stepWalk(dt) {
  // smooth look
  const k = 1 - Math.pow(0.0005, dt);
  walk.yaw += (walk.yawT - walk.yaw) * k;
  walk.pitch += (walk.pitchT - walk.pitch) * k;
  let moved = Math.abs(walk.yawT - walk.yaw) > 1e-4 || Math.abs(walk.pitchT - walk.pitch) > 1e-4;

  if (walk.tween) {
    const tw = walk.tween;
    tw.t = Math.min(1, tw.t + dt / tw.dur);
    walk.pos.lerpVectors(tw.from, tw.to, ease(tw.t));
    if (tw.t >= 1) { walk.tween = null; updateLamps(); }
    moved = true;
  } else {
    const kk = walk.keys;
    let f = (kk.KeyW || kk.ArrowUp ? 1 : 0) - (kk.KeyS || kk.ArrowDown ? 1 : 0) + (-walk.joy.y);
    let r = (kk.KeyD ? 1 : 0) - (kk.KeyA ? 1 : 0) + walk.joy.x;
    if (kk.ArrowLeft) walk.yawT += dt * 1.6;
    if (kk.ArrowRight) walk.yawT -= dt * 1.6;
    if (Math.abs(f) > 0.01 || Math.abs(r) > 0.01) {
      const speed = (kk.ShiftLeft || kk.ShiftRight ? 3.2 : 1.7) * dt;
      const fw = new THREE.Vector3(-Math.sin(walk.yaw), 0, -Math.cos(walk.yaw));
      const rt = new THREE.Vector3(Math.cos(walk.yaw), 0, -Math.sin(walk.yaw));
      let delta = fw.multiplyScalar(f).add(rt.multiplyScalar(r));
      if (delta.length() > 1) delta.normalize();
      delta.multiplyScalar(speed);
      delta = blocked(walk.pos, delta);
      const np = walk.pos.clone().add(delta);
      const fy = floorBelow(np, -EYE + 0.55, 3.5);
      if (fy != null) {
        const curFloorY = walk.pos.y - EYE;
        if (fy - curFloorY < 0.5) {
          np.y += (fy + EYE - np.y) * Math.min(1, dt * 10);
          walk.pos.copy(np);
          moved = true;
        }
      }
      updateLamps();
    }
  }
  camera.position.copy(walk.pos);
  camera.lookAt(walk.pos.clone().add(walkDir()));
  return moved;
}

function pickFloorPoint(clientX, clientY) {
  if (!colliders.length) return null;
  const ndc = new THREE.Vector2((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  ray.far = 60;
  const hit = ray.intersectObjects(colliders, false)[0];
  if (!hit || !hit.face) return null;
  const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
  return { point: hit.point, normal: n, isFloor: n.y > 0.7, distance: hit.distance };
}

function walkClick(x, y) {
  const h = pickFloorPoint(x, y);
  if (!h) return;
  let target;
  if (h.isFloor) {
    target = h.point.clone(); target.y += EYE;
  } else {
    // walk toward a wall: stop 0.6 m before it
    const flat = h.point.clone().sub(walk.pos); flat.y = 0;
    const len = Math.max(0, flat.length() - 0.6);
    if (len < 0.2) return;
    target = walk.pos.clone().add(flat.normalize().multiplyScalar(len));
    const fy = floorBelow(target, 0.2, 4);
    if (fy == null) return;
    target.y = fy + EYE;
  }
  if (target.distanceTo(walk.pos) < 0.15) return;
  moveTo(target);
  pulseRing(x, y);
}

function fadeSwap(fn) {
  let ov = $('#fade');
  if (!ov) { ov = document.createElement('div'); ov.id = 'fade'; Object.assign(ov.style, { position: 'absolute', inset: 0, background: '#0b0907', opacity: 0, transition: 'opacity .28s', pointerEvents: 'none', zIndex: 12 }); $('#app').appendChild(ov); }
  ov.style.opacity = 1;
  setTimeout(() => { fn(); dirty = 40; setTimeout(() => { ov.style.opacity = 0; dirty = 40; }, 60); }, 300);
}

// ---------- input for walk ----------
let pDown = null;
const pointers = new Map();
canvas.addEventListener('pointerdown', (e) => {
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  pDown = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
  if (mode === 'walk') canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  const prev = pointers.get(e.pointerId);
  if (mode === 'walk') {
    if (prev && pointers.size === 1) {
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      const kf = (camera.fov / 70) * (isTouch ? 0.0055 : 0.0042);
      walk.yawT += dx * kf;
      walk.pitchT = THREE.MathUtils.clamp(walk.pitchT + dy * kf, -1.25, 1.25);
      if (pDown) pDown.moved += Math.abs(dx) + Math.abs(dy);
      $('#cursor-ring').classList.remove('show');
    } else if (pointers.size === 2 && prev) {
      // pinch = zoom (fov)
      const pts = [...pointers.values()];
      const other = pts.find((p) => p !== prev);
      const d0 = Math.hypot(prev.x - other.x, prev.y - other.y);
      const d1 = Math.hypot(e.clientX - other.x, e.clientY - other.y);
      camera.fov = THREE.MathUtils.clamp(camera.fov * (d0 / d1), 30, 90); camera.updateProjectionMatrix();
      if (pDown) pDown.moved += 100;
    } else if (!isTouch) {
      hoverRing(e.clientX, e.clientY);
    }
    dirty = 3;
  }
  if (prev) { prev.x = e.clientX; prev.y = e.clientY; }
});
const endPointer = (e) => {
  pointers.delete(e.pointerId);
  if (mode === 'walk' && pDown && pDown.moved < 8 && performance.now() - pDown.t < 500 && pointers.size === 0) {
    walkClick(e.clientX, e.clientY);
  }
  if (pointers.size === 0) pDown = null;
};
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', (e) => { pointers.delete(e.pointerId); pDown = null; });
canvas.addEventListener('pointerleave', () => $('#cursor-ring').classList.remove('show'));
canvas.addEventListener('wheel', (e) => {
  if (mode !== 'walk') return;
  e.preventDefault();
  const step = -Math.sign(e.deltaY) * 0.7;
  const fw = new THREE.Vector3(-Math.sin(walk.yaw), 0, -Math.cos(walk.yaw));
  let delta = blocked(walk.pos, fw.multiplyScalar(step));
  const np = walk.pos.clone().add(delta);
  const fy = floorBelow(np, -EYE + 0.55, 3.5);
  if (fy != null && fy - (walk.pos.y - EYE) < 0.5) { np.y = fy + EYE; moveTo(np, 0.35); }
}, { passive: false });

let ringT = 0;
function hoverRing(x, y) {
  const now = performance.now();
  if (now - ringT < 40) return; ringT = now;
  const ring = $('#cursor-ring');
  const h = pickFloorPoint(x, y);
  if (h && h.isFloor) {
    const s = THREE.MathUtils.clamp(3.2 / Math.max(0.6, h.distance), 0.35, 1.6);
    ring.style.transform = `translate(${x}px, ${y}px) scale(${s}, ${s * 0.45})`;
    ring.classList.add('show');
  } else ring.classList.remove('show');
}
function pulseRing(x, y) {
  const ring = $('#cursor-ring');
  ring.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500 });
}

addEventListener('keydown', (e) => {
  if (mode !== 'walk') return;
  walk.keys[e.code] = true;
  if (e.code === 'Escape') exitWalk();
});
addEventListener('keyup', (e) => { walk.keys[e.code] = false; });
addEventListener('blur', () => { walk.keys = {}; });

// joystick
{
  const joy = $('#joystick'), knob = joy.querySelector('.knob');
  let id = null, cx = 0, cy = 0;
  joy.addEventListener('pointerdown', (e) => {
    id = e.pointerId; joy.setPointerCapture(id);
    const r = joy.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2;
    e.stopPropagation();
  });
  joy.addEventListener('pointermove', (e) => {
    if (e.pointerId !== id) return;
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const m = Math.hypot(dx, dy), max = 40;
    if (m > max) { dx *= max / m; dy *= max / m; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    walk.joy.set(dx / max, dy / max);
  });
  const end = () => { id = null; knob.style.transform = ''; walk.joy.set(0, 0); };
  joy.addEventListener('pointerup', end); joy.addEventListener('pointercancel', end);
}

// ---------- hotspots ----------
const hsEls = [];
function buildHotspots() {
  const wrap = $('#hotspots');
  wrap.innerHTML = '';
  hsEls.length = 0;
  ROOMS.forEach((room) => {
    const c = CAMS[room.cam];
    const f = FLOORS.find((x) => x.id === room.floor);
    const p = v3(c.pos), d = new THREE.Vector3(c.dir[0], 0, c.dir[2]).normalize();
    p.addScaledVector(d, 2.2);
    p.y = f.y + 1.0;
    const el = document.createElement('div');
    el.className = 'hs';
    el.innerHTML = `<div class="lbl">${room.name[lang]}</div><div class="stem"></div><div class="pt"></div>`;
    el.addEventListener('click', (e) => { e.stopPropagation(); enterRoom(room); });
    wrap.appendChild(el);
    hsEls.push({ el, p, room });
  });
}
const tmpV = new THREE.Vector3();
function updateHotspots() {
  const showFloor = mode === 'floor' ? curFloor : null;
  for (const h of hsEls) {
    const vis = showFloor && h.room.floor === showFloor;
    if (!vis) { h.el.classList.remove('show'); h.el.classList.add('hidden'); continue; }
    tmpV.copy(h.p).project(camera);
    if (tmpV.z > 1 || Math.abs(tmpV.x) > 1.1 || Math.abs(tmpV.y) > 1.1) { h.el.classList.add('hidden'); continue; }
    h.el.classList.remove('hidden');
    h.el.style.transform = `translate(${(tmpV.x * 0.5 + 0.5) * innerWidth}px, ${(-tmpV.y * 0.5 + 0.5) * innerHeight}px) translate(-50%, -100%)`;
    h.el.classList.add('show');
  }
}

// ---------- UI ----------
function setAutoRotate(v) {
  autoRotate = v;
  $('#btn-rotate').classList.toggle('on', v);
}

function renderLists() {
  // views
  $('#views').innerHTML = '';
  VIEWS.forEach((v) => {
    const b = document.createElement('button');
    b.className = 'view-btn';
    b.innerHTML = `<small>${v.k[lang]}</small>${v.name[lang]}`;
    b.onclick = () => { goView(v); collapsePanel(); };
    $('#views').appendChild(b);
  });
  // floors
  const fl = $('#floor-list'); fl.innerHTML = '';
  const fdefs = [['all', '⌂', 'f_all'], ['f2', '2', 'f2'], ['f1', '1', 'f1'], ['b', 'Y', 'b']];
  fdefs.forEach(([id, num, key]) => {
    const b = document.createElement('button');
    b.className = 'floor-btn'; b.dataset.floor = id;
    b.innerHTML = `<div class="num">${num}</div><div><div class="t">${t(key)}</div><div class="s">${t(key + (key === 'f_all' ? '_s' : '_s'))}</div></div>`;
    b.onclick = () => { goFloor(id); collapsePanel(); };
    fl.appendChild(b);
  });
  // rooms
  const rl = $('#room-list'); rl.innerHTML = '';
  [['f1', 'f1'], ['f2', 'f2'], ['b', 'b']].forEach(([fid, key]) => {
    const g = document.createElement('div'); g.className = 'room-group';
    g.innerHTML = `<h4>${t(key)}</h4>`;
    ROOMS.filter((r) => r.floor === fid).forEach((r) => {
      const b = document.createElement('button');
      b.className = 'room-btn'; b.dataset.room = r.id;
      b.textContent = r.name[lang];
      b.onclick = () => { enterRoom(r); collapsePanel(); };
      g.appendChild(b);
    });
    rl.appendChild(g);
  });
  $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  if (isTouch) $('#walk-hint').textContent = t('walk_hint_touch');
  hsEls.forEach((h) => { h.el.querySelector('.lbl').textContent = h.room.name[lang]; });
  $$('#lang button').forEach((b) => b.classList.toggle('on', b.dataset.lang === lang));
  document.documentElement.lang = lang;
  updateUI();
}

function updateUI() {
  $$('.floor-btn').forEach((b) => b.classList.toggle('on', (mode === 'floor' || mode === 'overview') && b.dataset.floor === curFloor && mode !== 'walk'));
  $$('.room-btn').forEach((b) => b.classList.toggle('on', mode === 'walk' && walk.room && b.dataset.room === walk.room.id));
  $('#btn-plan').classList.toggle('on', planView);
  updateWalkHud();
}

function updateWalkHud() {
  if (!walk.room) return;
  $('#walk-room').textContent = walk.room.name[lang];
  $('#walk-floor').textContent = t(walk.room.floor);
}

let hintTimer = null;
function showHint() {
  const h = $('#walk-hint'); h.style.opacity = 1;
  clearTimeout(hintTimer); hintTimer = setTimeout(() => (h.style.opacity = 0), 6000);
}

function collapsePanel() { if (innerWidth <= 760) $('#panel').classList.add('collapsed'); }

$$('.tabs button').forEach((b) => b.addEventListener('click', () => {
  $$('.tabs button').forEach((x) => x.classList.toggle('on', x === b));
  $$('.tab-body section').forEach((s) => s.classList.toggle('on', s.dataset.pane === b.dataset.tab));
  $('#panel').classList.remove('collapsed');
  if (b.dataset.tab === 'floors' && mode === 'overview' && curFloor === 'all') goFloor('f1');
}));
$('#panel-handle').addEventListener('click', () => $('#panel').classList.toggle('collapsed'));
$$('#lang button').forEach((b) => b.addEventListener('click', () => { lang = b.dataset.lang; try { localStorage.setItem('kv_lang', lang); } catch (e) {} renderLists(); }));
$('#btn-rotate').addEventListener('click', () => { if (mode !== 'overview') goHome(); setAutoRotate(!autoRotate); });
$('#btn-plan').addEventListener('click', () => { planView = !planView; goFloor(curFloor === 'all' ? 'f1' : curFloor); });
$('#btn-time').addEventListener('click', () => { evening = !evening; applyTime(); updateLamps(true); toast(t(evening ? 'evening' : 'day')); });
$('#btn-full').addEventListener('click', () => {
  const el = document.documentElement;
  if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => {});
  else if (document.exitFullscreen) document.exitFullscreen();
});
$('#btn-exit').addEventListener('click', exitWalk);
function cycleRoom(dir) {
  const i = ROOMS.indexOf(walk.room);
  const r = ROOMS[(i + dir + ROOMS.length) % ROOMS.length];
  enterRoom(r);
}
$('#btn-prev').addEventListener('click', () => cycleRoom(-1));
$('#btn-next').addEventListener('click', () => cycleRoom(1));

let toastT = null;
function toast(msg) { const el = $('#toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 1600); }

if (innerWidth <= 760) $('#panel').classList.add('collapsed');

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  if (mode === 'walk') camera.fov = walkFov();
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  dirty = 10;
});

// ---------- loop ----------
const clock = new THREE.Clock();
let idleFrames = 0;
function loop() {
  requestAnimationFrame(loop);
  const dt = window.__fast ? 0.25 : Math.min(clock.getDelta(), 0.05);
  let changed = false;
  if (mode === 'walk') {
    changed = stepWalk(dt) || changed;
    const kk = walk.keys;
    if (kk.KeyW || kk.KeyS || kk.KeyA || kk.KeyD || kk.ArrowUp || kk.ArrowDown || kk.ArrowLeft || kk.ArrowRight || walk.joy.lengthSq() > 0) changed = true;
  } else {
    if (autoRotate && mode === 'overview' && model) controls.rotate(dt * 0.07, 0, false);
    changed = controls.update(dt) || changed;
  }
  if (fovAnim) {
    fovAnim.t = Math.min(1, fovAnim.t + dt / fovAnim.dur);
    camera.fov = fovAnim.from + (fovAnim.to - fovAnim.from) * ease(fovAnim.t);
    camera.updateProjectionMatrix();
    if (fovAnim.t >= 1) fovAnim = null;
    changed = true;
  }
  if (Math.abs(clipCurrent - clipTarget) > 0.001) {
    const from = Math.min(clipCurrent, 14), to = Math.min(clipTarget, 14);
    let next = from + (to - from) * (1 - Math.pow(0.002, dt));
    if (Math.abs(next - to) < 0.01) next = to;
    clipCurrent = next >= 14 && clipTarget > 14 ? clipTarget : next;
    clipPlane.constant = clipCurrent;
    changed = true;
  }
  if (evening && mode !== 'walk' && changed) updateLamps();
  if (changed) dirty = Math.max(dirty, 2);
  updateHotspots();
  if (dirty > 0 && model) {
    dirty--;
    composer.render(dt);
  } else if (!model) {
    composer.render(dt);
  }
}

renderLists();
applyTime();
goHome(true);
setAutoRotate(true);
loop();

// debug hooks (used for automated screenshots)
window.__kv = { goFloor, goHome, enterRoom, ROOMS, goView, VIEWS, setPlan: (v) => { planView = v; }, setEvening: (v) => { evening = v; applyTime(); updateLamps(true); }, state: () => ({ mode, curFloor, bvhReady, loaded: !!model, cam: camera.position.toArray().map(v=>+v.toFixed(2)), tgt: controls.getTarget(new THREE.Vector3()).toArray().map(v=>+v.toFixed(2)), dist: +controls.distance.toFixed(3), active: controls.active }) };
