import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  BODY_BY_ID,
  BodyId,
  J2000_MS,
  ORBIT_BODIES,
  OrbitBody,
} from './orbit.bodies';

export interface OrbitSceneHooks {
  onReady: () => void;
  onSelect: (id: BodyId | null) => void;
  onHover: (id: BodyId | null) => void;
  onDate: (simDays: number) => void;
}

interface BodyRuntime {
  def: OrbitBody;
  pivot: THREE.Object3D;
  anchor: THREE.Object3D;
  spin: THREE.Object3D;
  mesh: THREE.Object3D;
  orbitLine?: THREE.Line;
}

const TEX_PATH = 'assets/orbit/';
const OVERVIEW_POS = new THREE.Vector3(0, 42, 96);
const OVERVIEW_TARGET = new THREE.Vector3(0, 0, 0);

export class OrbitScene {
  simDays = (Date.now() - J2000_MS) / 86_400_000;
  speed = 8;
  paused = false;
  showOrbits = true;
  showLabels = true;

  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private clock = new THREE.Clock();
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private bodies = new Map<BodyId, BodyRuntime>();
  private pickables: THREE.Object3D[] = [];
  private textures = new Map<string, THREE.Texture>();
  private hoverId: BodyId | null = null;
  private selectedId: BodyId | null = null;
  private followId: BodyId | null = null;
  private highlight: THREE.Mesh;
  private raf = 0;
  private disposed = false;
  private lastDateEmit = 0;
  private pointerDown = new THREE.Vector2();
  private dragging = false;
  private camFly: {
    t: number;
    dur: number;
    fromPos: THREE.Vector3;
    toPos: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
    follow: BodyId | null;
  } | null = null;
  private readonly _world = new THREE.Vector3();
  private readonly _offset = new THREE.Vector3();
  private readonly _ndc = new THREE.Vector3();
  private ro?: ResizeObserver;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly viewport: HTMLElement,
    private readonly labelsRoot: HTMLElement,
    private readonly hooks: OrbitSceneHooks,
  ) {
    const w = viewport.clientWidth || 1;
    const h = viewport.clientHeight || 1;
    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.08, 900);
    this.camera.position.copy(OVERVIEW_POS);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setSize(w, h, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setClearColor(0x05040c, 1);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.055;
    this.controls.minDistance = 2.2;
    this.controls.maxDistance = 280;
    this.controls.target.copy(OVERVIEW_TARGET);
    this.controls.zoomSpeed = 1.1;
    this.controls.rotateSpeed = 0.72;

    this.highlight = this.makeHighlight();
    this.scene.add(this.highlight);

    this.bindInput();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(viewport);

    void this.boot();
  }

  select(id: BodyId | null, fly = true) {
    this.selectedId = id;
    this.followId = id;
    this.hooks.onSelect(id);
    if (!id) {
      this.followId = null;
      if (fly) this.flyToOverview();
      return;
    }
    if (fly) this.flyToBody(id);
  }

  resetView() {
    this.select(null, true);
  }

  jumpToToday() {
    this.simDays = (Date.now() - J2000_MS) / 86_400_000;
    this.hooks.onDate(this.simDays);
  }

  setSpeed(n: number) {
    this.speed = n;
  }

  setPaused(v: boolean) {
    this.paused = v;
  }

  setShowOrbits(v: boolean) {
    this.showOrbits = v;
    for (const b of this.bodies.values()) {
      if (b.orbitLine) b.orbitLine.visible = v;
    }
  }

  setShowLabels(v: boolean) {
    this.showLabels = v;
    this.labelsRoot.style.opacity = v ? '1' : '0';
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
    this.controls.dispose();
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      mesh.geometry?.dispose?.();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose?.();
    });
    for (const t of this.textures.values()) t.dispose();
    this.renderer.dispose();
  }

  private async boot() {
    this.buildSky();
    this.buildStarfield();
    await this.loadTextures();
    this.buildSun();
    this.buildBodies();
    this.buildAsteroids();
    this.scene.add(new THREE.AmbientLight(0x1a2238, 0.55));
    this.scene.add(new THREE.HemisphereLight(0x14182a, 0x050308, 0.35));
    this.resize();
    this.hooks.onReady();
    this.hooks.onDate(this.simDays);
    this.tick();
  }

  private async loadTextures() {
    const names = new Set<string>();
    for (const b of ORBIT_BODIES) {
      if (b.texture) names.add(b.texture);
      if (b.normalMap) names.add(b.normalMap);
      if (b.specularMap) names.add(b.specularMap);
      if (b.lightsMap) names.add(b.lightsMap);
      if (b.cloudsMap) names.add(b.cloudsMap);
    }
    const loader = new THREE.TextureLoader();
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    await Promise.all(
      [...names].map(
        (name) =>
          new Promise<void>((resolve) => {
            loader.load(
              TEX_PATH + name,
              (tex) => {
                tex.anisotropy = maxAniso;
                tex.wrapS = THREE.RepeatWrapping;
                tex.wrapT = THREE.ClampToEdgeWrapping;
                const isColor =
                  !name.includes('normal') && !name.includes('specular');
                tex.colorSpace = isColor
                  ? THREE.SRGBColorSpace
                  : THREE.NoColorSpace;
                this.textures.set(name, tex);
                resolve();
              },
              undefined,
              () => resolve(),
            );
          }),
      ),
    );
  }

  private tex(name?: string) {
    return name ? this.textures.get(name) ?? null : null;
  }

  private buildSky() {
    const geo = new THREE.SphereGeometry(420, 48, 32);
    const mat = new THREE.MeshBasicMaterial({
      map: makeSkyTexture(),
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.scene.add(new THREE.Mesh(geo, mat));
  }

  private buildStarfield() {
    const n = 4500;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 180 + Math.random() * 200;
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      const t = Math.random();
      col[i * 3] = 0.75 + t * 0.25;
      col[i * 3 + 1] = 0.78 + t * 0.18;
      col[i * 3 + 2] = 0.85 + (1 - t) * 0.15;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.55,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.scene.add(new THREE.Points(geo, mat));
  }

  private buildSun() {
    const def = BODY_BY_ID.sun;
    const pivot = new THREE.Group();
    const anchor = new THREE.Group();
    const spin = new THREE.Group();
    spin.rotation.z = THREE.MathUtils.degToRad(def.axialTilt);

    const map = this.tex(def.texture);
    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(def.radius, 64, 48),
      new THREE.MeshBasicMaterial({ map, color: map ? 0xffffff : def.color }),
    );
    sun.userData.bodyId = def.id;
    spin.add(sun);

    const corona = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeGlowTexture('#ffb347'),
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        opacity: 0.9,
      }),
    );
    corona.scale.setScalar(def.radius * 6.4);
    anchor.add(corona);

    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(def.radius * 1.08, 32, 24),
      makeAtmosphereMaterial(new THREE.Color(0xffc060), 0.55, 2.2),
    );
    halo.userData.ignorePick = true;
    spin.add(halo);

    const light = new THREE.PointLight(0xfff0c8, 1800, 0, 1.15);
    anchor.add(light);
    anchor.add(spin);
    pivot.add(anchor);
    this.scene.add(pivot);

    this.register(def, pivot, anchor, spin, sun);
  }

  private buildBodies() {
    const roots = new Map<BodyId, THREE.Object3D>();
    roots.set('sun', this.bodies.get('sun')!.anchor);

    for (const def of ORBIT_BODIES) {
      if (def.id === 'sun') continue;
      const parentAnchor = roots.get(def.parent!)!;
      const incline = new THREE.Group();
      incline.rotation.x = THREE.MathUtils.degToRad(def.inclination);

      const pivot = new THREE.Group();
      const anchor = new THREE.Group();
      anchor.position.x = def.orbitRadius;

      const tilt = new THREE.Group();
      tilt.rotation.z = THREE.MathUtils.degToRad(def.axialTilt);
      const spin = new THREE.Group();
      const mesh = this.makePlanetMesh(def);
      spin.add(mesh);
      tilt.add(spin);
      anchor.add(tilt);

      if (def.rings) {
        const rings = this.makeRings(def);
        tilt.add(rings);
      }

      const orbitLine = this.makeOrbitLine(def.orbitRadius, def.color);
      incline.add(orbitLine);
      incline.add(pivot);
      pivot.add(anchor);
      parentAnchor.add(incline);

      this.register(def, pivot, anchor, spin, mesh, orbitLine);
      roots.set(def.id, anchor);
    }
  }

  private makePlanetMesh(def: OrbitBody): THREE.Object3D {
    const group = new THREE.Group();
    const segs = def.radius > 3 ? 64 : def.radius > 1 ? 48 : 32;
    const geo = new THREE.SphereGeometry(def.radius, segs, Math.round(segs * 0.75));
    const map = this.tex(def.texture);
    const mat = new THREE.MeshStandardMaterial({
      map: map ?? undefined,
      color: map ? 0xffffff : def.color,
      roughness: def.id === 'earth' ? 0.52 : 0.72,
      metalness: def.id === 'earth' ? 0.08 : 0.04,
      normalMap: this.tex(def.normalMap) ?? undefined,
      emissiveMap: this.tex(def.lightsMap) ?? undefined,
      emissive: def.lightsMap ? new THREE.Color(0xfff4d8) : new THREE.Color(0x000000),
      emissiveIntensity: def.lightsMap ? 1.15 : 0,
    });
    if (def.id === 'earth' && def.lightsMap) {
      this.patchEarthNight(mat);
    }
    const sphere = new THREE.Mesh(geo, mat);
    sphere.userData.bodyId = def.id;
    group.add(sphere);
    this.pickables.push(sphere);

    const cloudsMap = this.tex(def.cloudsMap);
    if (cloudsMap) {
      const clouds = new THREE.Mesh(
        new THREE.SphereGeometry(def.radius * 1.018, segs, Math.round(segs * 0.75)),
        new THREE.MeshStandardMaterial({
          map: cloudsMap,
          transparent: true,
          opacity: 0.42,
          depthWrite: false,
          roughness: 1,
          metalness: 0,
        }),
      );
      clouds.userData.ignorePick = true;
      clouds.userData.cloudSpin = 0.08;
      group.add(clouds);
    }

    if (def.haze) {
      const haze = new THREE.Mesh(
        new THREE.SphereGeometry(def.radius * def.haze.scale, 32, 24),
        makeAtmosphereMaterial(
          new THREE.Color(def.haze.color),
          0.42,
          def.haze.power,
        ),
      );
      haze.userData.ignorePick = true;
      group.add(haze);
    }

    if (!def.texture && def.kind === 'moon') {
      mat.map = makeMoonTexture(def.color);
      mat.color.set(0xffffff);
    }

    return group;
  }

  private patchEarthNight(mat: THREE.MeshStandardMaterial) {
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
           varying vec3 vOrbitWorldP;
           varying vec3 vOrbitWorldN;`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           vOrbitWorldP = (modelMatrix * vec4(transformed, 1.0)).xyz;
           vOrbitWorldN = normalize(mat3(modelMatrix) * objectNormal);`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
           varying vec3 vOrbitWorldP;
           varying vec3 vOrbitWorldN;`,
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#ifdef USE_EMISSIVEMAP
            vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
            float ndl = dot(normalize(vOrbitWorldN), normalize(-vOrbitWorldP));
            float night = 1.0 - smoothstep(-0.05, 0.22, ndl);
            totalEmissiveRadiance *= emissiveColor.rgb * night;
          #endif`,
        );
    };
  }

  private makeRings(def: OrbitBody) {
    const inner = def.radius * def.rings!.inner;
    const outer = def.radius * def.rings!.outer;
    const geo = new THREE.RingGeometry(inner, outer, 96, 6);
    // RingGeometry UVs: u around, v radial. Rotate so the texture stripes run radially.
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const r = Math.sqrt(x * x + y * y);
      uv.setXY(i, (r - inner) / (outer - inner), 0.5);
    }
    uv.needsUpdate = true;
    const mat = new THREE.MeshBasicMaterial({
      map: makeRingTexture(def.id === 'uranus'),
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
      opacity: def.rings!.opacity,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = Math.PI / 2;
    mesh.userData.ignorePick = true;
    return mesh;
  }

  private makeOrbitLine(radius: number, color: number) {
    const pts = [];
    const n = 128;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.28,
    });
    const line = new THREE.Line(geo, mat);
    line.userData.ignorePick = true;
    return line;
  }

  private buildAsteroids() {
    const n = 1600;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 46 + Math.random() * 8.5;
      const a = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 1.4;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xb8a078,
      size: 0.18,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    const pts = new THREE.Points(geo, mat);
    pts.userData.asteroids = true;
    this.scene.add(pts);
  }

  private makeHighlight() {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(1.12, 1.2, 48),
      new THREE.MeshBasicMaterial({
        color: 0xd4b483,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    );
    mesh.visible = false;
    mesh.renderOrder = 20;
    mesh.userData.ignorePick = true;
    return mesh;
  }

  private register(
    def: OrbitBody,
    pivot: THREE.Object3D,
    anchor: THREE.Object3D,
    spin: THREE.Object3D,
    mesh: THREE.Object3D,
    orbitLine?: THREE.Line,
  ) {
    if (def.id === 'sun') {
      mesh.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) this.pickables.push(c);
      });
    }
    this.bodies.set(def.id, { def, pivot, anchor, spin, mesh, orbitLine });
  }

  private bindInput() {
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointerleave', this.onPointerLeave);
  }

  private onPointerDown = (e: PointerEvent) => {
    this.pointerDown.set(e.clientX, e.clientY);
    this.dragging = false;
  };

  private onPointerMove = (e: PointerEvent) => {
    if (e.buttons) {
      if (this.pointerDown.distanceTo(new THREE.Vector2(e.clientX, e.clientY)) > 5) {
        this.dragging = true;
      }
    }
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    const id = this.hitTest();
    if (id !== this.hoverId) {
      this.hoverId = id;
      this.canvas.style.cursor = id ? 'pointer' : 'grab';
      this.hooks.onHover(id);
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    if (this.dragging) return;
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    const id = this.hitTest();
    if (id) this.select(id);
  };

  private onPointerLeave = () => {
    if (this.hoverId) {
      this.hoverId = null;
      this.hooks.onHover(null);
    }
    this.canvas.style.cursor = 'grab';
  };

  private hitTest(): BodyId | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.pickables, true);
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object;
      while (o) {
        if (o.userData?.['ignorePick']) break;
        if (o.userData?.['bodyId']) return o.userData['bodyId'] as BodyId;
        o = o.parent;
      }
    }
    return null;
  }

  private flyToBody(id: BodyId) {
    const rt = this.bodies.get(id);
    if (!rt) return;
    rt.anchor.getWorldPosition(this._world);
    const dist = Math.max(rt.def.radius * 6.8, rt.def.rings ? rt.def.radius * 9.5 : 4.2);
    const toPos = this._world.clone().add(new THREE.Vector3(dist * 0.72, dist * 0.38, dist * 0.78));
    this.startFly(toPos, this._world.clone(), 1.15, id);
  }

  private flyToOverview() {
    this.startFly(OVERVIEW_POS.clone(), OVERVIEW_TARGET.clone(), 1.25, null);
  }

  private startFly(
    toPos: THREE.Vector3,
    toTarget: THREE.Vector3,
    dur: number,
    follow: BodyId | null,
  ) {
    this.camFly = {
      t: 0,
      dur,
      fromPos: this.camera.position.clone(),
      toPos,
      fromTarget: this.controls.target.clone(),
      toTarget,
      follow,
    };
  }

  private resize() {
    const w = this.viewport.clientWidth || 1;
    const h = this.viewport.clientHeight || 1;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  private tick = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.tick);
    const dt = Math.min(this.clock.getDelta(), 0.05);

    if (!this.paused) {
      this.simDays += this.speed * dt;
      const asteroids = this.scene.children.find((c) => c.userData?.['asteroids']);
      if (asteroids) asteroids.rotation.y += dt * 0.012 * Math.max(this.speed / 30, 0.15);
    }

    this.updateTransforms();
    this.updateCamera(dt);
    this.updateHighlight();
    this.updateLabels();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);

    const now = performance.now();
    if (now - this.lastDateEmit > 220) {
      this.lastDateEmit = now;
      this.hooks.onDate(this.simDays);
    }
  };

  private updateTransforms() {
    for (const rt of this.bodies.values()) {
      const d = rt.def;
      if (d.id !== 'sun') {
        const angle =
          THREE.MathUtils.degToRad(d.meanLongJ2000) +
          (this.simDays / d.orbitDays) * Math.PI * 2;
        rt.pivot.rotation.y = angle;
      }
      const hours = this.simDays * 24;
      rt.spin.rotation.y = (hours / d.rotationHours) * Math.PI * 2;
      rt.mesh.traverse((c) => {
        if (c.userData?.['cloudSpin']) {
          (c as THREE.Mesh).rotation.y += 0.0009 * (this.paused ? 0 : Math.max(this.speed, 1));
        }
      });
    }
  }

  private updateCamera(dt: number) {
    if (this.camFly) {
      this.camFly.t += dt;
      const u = Math.min(this.camFly.t / this.camFly.dur, 1);
      const e = u * u * (3 - 2 * u);
      this.camera.position.lerpVectors(this.camFly.fromPos, this.camFly.toPos, e);
      this.controls.target.lerpVectors(this.camFly.fromTarget, this.camFly.toTarget, e);
      if (u >= 1) {
        this.followId = this.camFly.follow;
        this.camFly = null;
      }
      return;
    }
    if (!this.followId) return;
    const rt = this.bodies.get(this.followId);
    if (!rt) return;
    rt.anchor.getWorldPosition(this._world);
    this._offset.copy(this.camera.position).sub(this.controls.target);
    this.controls.target.copy(this._world);
    this.camera.position.copy(this._world).add(this._offset);
  }

  private updateHighlight() {
    const id = this.selectedId || this.hoverId;
    const rt = id ? this.bodies.get(id) : null;
    if (!rt) {
      this.highlight.visible = false;
      return;
    }
    rt.anchor.getWorldPosition(this._world);
    this.highlight.position.copy(this._world);
    const s = rt.def.radius * 1.55;
    this.highlight.scale.set(s, s, s);
    this.highlight.lookAt(this.camera.position);
    this.highlight.visible = true;
  }

  private updateLabels() {
    const els = Array.from(
      this.labelsRoot.querySelectorAll<HTMLElement>('[data-orbit-id]'),
    );
    const camPos = this.camera.position;
    for (const el of els) {
      const id = el.dataset['orbitId'] as BodyId;
      const rt = this.bodies.get(id);
      if (!rt) continue;
      rt.anchor.getWorldPosition(this._world);
      const dist = camPos.distanceTo(this._world);
      this._ndc.copy(this._world).project(this.camera);
      const onScreen =
        this._ndc.z < 1 &&
        this._ndc.x > -1.15 &&
        this._ndc.x < 1.15 &&
        this._ndc.y > -1.15 &&
        this._ndc.y < 1.15;
      const minDist = rt.def.kind === 'moon' ? 6 : 10;
      const maxDist = rt.def.kind === 'moon' ? 42 : rt.def.kind === 'star' ? 220 : 160;
      const show =
        this.showLabels &&
        onScreen &&
        dist > minDist &&
        dist < maxDist &&
        id !== this.selectedId;
      const x = (this._ndc.x * 0.5 + 0.5) * this.viewport.clientWidth;
      const y = (-this._ndc.y * 0.5 + 0.5) * this.viewport.clientHeight;
      el.style.transform = `translate(-50%, -120%) translate(${x}px, ${y}px)`;
      el.style.opacity = show ? '1' : '0';
      el.style.pointerEvents = show ? 'auto' : 'none';
    }
  }
}

function makeAtmosphereMaterial(color: THREE.Color, coeff: number, power: number) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      glowColor: { value: color },
      coeff: { value: coeff },
      power: { value: power },
    },
    vertexShader: `
      varying vec3 vNormalW;
      varying vec3 vPosW;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vPosW = w.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      uniform float coeff;
      uniform float power;
      varying vec3 vNormalW;
      varying vec3 vPosW;
      void main() {
        vec3 view = normalize(cameraPosition - vPosW);
        float rim = pow(coeff - abs(dot(view, normalize(vNormalW))), power);
        gl_FragColor = vec4(glowColor, 1.0) * max(rim, 0.0);
      }
    `,
    toneMapped: true,
  });
}

function makeGlowTexture(hex: string) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
  g.addColorStop(0, hex);
  g.addColorStop(0.18, hex);
  g.addColorStop(0.42, 'rgba(255, 180, 70, 0.35)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeSkyTexture() {
  const w = 2048;
  const h = 1024;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#05040c';
  ctx.fillRect(0, 0, w, h);
  const band = ctx.createLinearGradient(0, h * 0.28, 0, h * 0.72);
  band.addColorStop(0, 'rgba(0,0,0,0)');
  band.addColorStop(0.45, 'rgba(48, 42, 78, 0.55)');
  band.addColorStop(0.5, 'rgba(90, 72, 110, 0.42)');
  band.addColorStop(0.55, 'rgba(40, 36, 70, 0.5)');
  band.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = band;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const nearBand = Math.abs(y - h / 2) < 140;
    const a = (nearBand ? 0.35 : 0.12) + Math.random() * 0.65;
    const s = Math.random() * (nearBand ? 1.6 : 1.1);
    ctx.fillStyle = `rgba(230,225,255,${a})`;
    ctx.fillRect(x, y, s, s);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeRingTexture(faint: boolean) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 8;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(1024, 8);
  for (let x = 0; x < 1024; x++) {
    const t = x / 1023;
    let a = 255;
    if (t < 0.04 || t > 0.97) a = 0;
    else if (t > 0.52 && t < 0.61) a = faint ? 10 : 18; // Cassini-ish gap
    else if (t > 0.78 && t < 0.81) a = faint ? 30 : 70;
    else a = faint ? 50 + Math.random() * 40 : 110 + Math.random() * 90;
    const shade = faint ? 180 : 210 - t * 40;
    for (let y = 0; y < 8; y++) {
      const i = (y * 1024 + x) * 4;
      img.data[i] = shade;
      img.data[i + 1] = shade - 18;
      img.data[i + 2] = shade - 55;
      img.data[i + 3] = a;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeMoonTexture(color: number) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const r = (color >> 16) & 255;
  const g = (color >> 8) & 255;
  const b = color & 255;
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 280; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 256;
    const rad = 2 + Math.random() * 14;
    ctx.fillStyle = `rgba(0,0,0,${0.08 + Math.random() * 0.18})`;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
