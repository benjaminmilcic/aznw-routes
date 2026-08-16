/** Visual + physical data for the Orbit gimmick. Distances and radii are
 *  compressed for a readable model (true AU scale would hide the planets).
 *  Mean longitudes at J2000 give a rough "where are they today" start. */

export type BodyId =
  | 'sun'
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'moon'
  | 'mars'
  | 'jupiter'
  | 'io'
  | 'europa'
  | 'ganymede'
  | 'callisto'
  | 'saturn'
  | 'titan'
  | 'uranus'
  | 'neptune';

export interface OrbitBody {
  id: BodyId;
  parent: BodyId | null;
  kind: 'star' | 'planet' | 'moon';
  /** Visual sphere radius in scene units. */
  radius: number;
  /** Visual orbit radius around the parent. */
  orbitRadius: number;
  /** Sidereal orbit in days. */
  orbitDays: number;
  /** Sidereal rotation in hours. Negative = retrograde. */
  rotationHours: number;
  axialTilt: number;
  inclination: number;
  /** Ecliptic longitude at J2000, degrees. */
  meanLongJ2000: number;
  color: number;
  swatch: string;
  texture?: string;
  normalMap?: string;
  specularMap?: string;
  lightsMap?: string;
  cloudsMap?: string;
  rings?: { inner: number; outer: number; opacity: number };
  haze?: { color: number; scale: number; power: number };
  /** Shown in the left rail. */
  major: boolean;
}

export const J2000_MS = Date.UTC(2000, 0, 1, 12);

export const ORBIT_BODIES: OrbitBody[] = [
  {
    id: 'sun',
    parent: null,
    kind: 'star',
    radius: 9.4,
    orbitRadius: 0,
    orbitDays: 1,
    rotationHours: 609.12,
    axialTilt: 7.25,
    inclination: 0,
    meanLongJ2000: 0,
    color: 0xffc14a,
    swatch: '#ffc14a',
    texture: 'sun.jpg',
    major: true,
  },
  {
    id: 'mercury',
    parent: 'sun',
    kind: 'planet',
    radius: 0.58,
    orbitRadius: 16.5,
    orbitDays: 87.97,
    rotationHours: 1407.6,
    axialTilt: 0.03,
    inclination: 7.0,
    meanLongJ2000: 252.25,
    color: 0xb5a48a,
    swatch: '#c4b49a',
    texture: 'mercury.jpg',
    major: true,
  },
  {
    id: 'venus',
    parent: 'sun',
    kind: 'planet',
    radius: 1.05,
    orbitRadius: 22.8,
    orbitDays: 224.7,
    rotationHours: -5832.5,
    axialTilt: 177.4,
    inclination: 3.4,
    meanLongJ2000: 181.98,
    color: 0xe6c98a,
    swatch: '#e8c98a',
    texture: 'venus.jpg',
    haze: { color: 0xe8d09a, scale: 1.045, power: 3.2 },
    major: true,
  },
  {
    id: 'earth',
    parent: 'sun',
    kind: 'planet',
    radius: 1.12,
    orbitRadius: 30.4,
    orbitDays: 365.256,
    rotationHours: 23.934,
    axialTilt: 23.44,
    inclination: 0,
    meanLongJ2000: 100.46,
    color: 0x3b82c4,
    swatch: '#6db3e8',
    texture: 'earth.jpg',
    normalMap: 'earth-normal.jpg',
    specularMap: 'earth-specular.jpg',
    lightsMap: 'earth-lights.png',
    cloudsMap: 'earth-clouds.png',
    haze: { color: 0x6eb6ff, scale: 1.085, power: 4.4 },
    major: true,
  },
  {
    id: 'moon',
    parent: 'earth',
    kind: 'moon',
    radius: 0.3,
    orbitRadius: 3.15,
    orbitDays: 27.32,
    rotationHours: 655.7,
    axialTilt: 6.68,
    inclination: 5.14,
    meanLongJ2000: 125.0,
    color: 0xc8c2b4,
    swatch: '#d4cfc4',
    texture: 'moon.jpg',
    major: false,
  },
  {
    id: 'mars',
    parent: 'sun',
    kind: 'planet',
    radius: 0.72,
    orbitRadius: 39.8,
    orbitDays: 686.98,
    rotationHours: 24.623,
    axialTilt: 25.19,
    inclination: 1.85,
    meanLongJ2000: 355.45,
    color: 0xc45a32,
    swatch: '#e07040',
    texture: 'mars.jpg',
    haze: { color: 0xc56a42, scale: 1.04, power: 3.6 },
    major: true,
  },
  {
    id: 'jupiter',
    parent: 'sun',
    kind: 'planet',
    radius: 4.55,
    orbitRadius: 58.5,
    orbitDays: 4332.6,
    rotationHours: 9.925,
    axialTilt: 3.13,
    inclination: 1.3,
    meanLongJ2000: 34.35,
    color: 0xc4a078,
    swatch: '#d4b48c',
    texture: 'jupiter.jpg',
    haze: { color: 0xd2b090, scale: 1.035, power: 3.8 },
    major: true,
  },
  {
    id: 'io',
    parent: 'jupiter',
    kind: 'moon',
    radius: 0.22,
    orbitRadius: 6.4,
    orbitDays: 1.769,
    rotationHours: 42.46,
    axialTilt: 0,
    inclination: 0.05,
    meanLongJ2000: 40,
    color: 0xe8c45a,
    swatch: '#f0d060',
    major: false,
  },
  {
    id: 'europa',
    parent: 'jupiter',
    kind: 'moon',
    radius: 0.2,
    orbitRadius: 7.85,
    orbitDays: 3.551,
    rotationHours: 85.23,
    axialTilt: 0.1,
    inclination: 0.47,
    meanLongJ2000: 120,
    color: 0xd8d0c0,
    swatch: '#e8e0d4',
    major: false,
  },
  {
    id: 'ganymede',
    parent: 'jupiter',
    kind: 'moon',
    radius: 0.28,
    orbitRadius: 9.7,
    orbitDays: 7.155,
    rotationHours: 171.7,
    axialTilt: 0.3,
    inclination: 0.2,
    meanLongJ2000: 210,
    color: 0xb0a090,
    swatch: '#c4b4a4',
    major: false,
  },
  {
    id: 'callisto',
    parent: 'jupiter',
    kind: 'moon',
    radius: 0.26,
    orbitRadius: 12.1,
    orbitDays: 16.69,
    rotationHours: 400.5,
    axialTilt: 0,
    inclination: 0.2,
    meanLongJ2000: 300,
    color: 0x6a6058,
    swatch: '#8a8078',
    major: false,
  },
  {
    id: 'saturn',
    parent: 'sun',
    kind: 'planet',
    radius: 3.85,
    orbitRadius: 80.5,
    orbitDays: 10759,
    rotationHours: 10.656,
    axialTilt: 26.73,
    inclination: 2.49,
    meanLongJ2000: 49.95,
    color: 0xe0c898,
    swatch: '#edd4a4',
    texture: 'saturn.jpg',
    rings: { inner: 1.22, outer: 2.28, opacity: 0.92 },
    major: true,
  },
  {
    id: 'titan',
    parent: 'saturn',
    kind: 'moon',
    radius: 0.3,
    orbitRadius: 8.4,
    orbitDays: 15.95,
    rotationHours: 382.7,
    axialTilt: 0,
    inclination: 0.3,
    meanLongJ2000: 80,
    color: 0xc48a48,
    swatch: '#d4a060',
    haze: { color: 0xd4a060, scale: 1.12, power: 2.8 },
    major: false,
  },
  {
    id: 'uranus',
    parent: 'sun',
    kind: 'planet',
    radius: 2.15,
    orbitRadius: 102,
    orbitDays: 30687,
    rotationHours: -17.24,
    axialTilt: 97.77,
    inclination: 0.77,
    meanLongJ2000: 313.24,
    color: 0x7ec8d4,
    swatch: '#8ed8e0',
    texture: 'uranus.jpg',
    rings: { inner: 1.35, outer: 1.72, opacity: 0.28 },
    haze: { color: 0x9ee0ea, scale: 1.05, power: 3.4 },
    major: true,
  },
  {
    id: 'neptune',
    parent: 'sun',
    kind: 'planet',
    radius: 2.08,
    orbitRadius: 122,
    orbitDays: 60190,
    rotationHours: 16.11,
    axialTilt: 28.32,
    inclination: 1.77,
    meanLongJ2000: 304.88,
    color: 0x3a6adf,
    swatch: '#5a8aff',
    texture: 'neptune.jpg',
    haze: { color: 0x5a8cff, scale: 1.05, power: 3.4 },
    major: true,
  },
];

export const BODY_BY_ID = Object.fromEntries(
  ORBIT_BODIES.map((b) => [b.id, b]),
) as Record<BodyId, OrbitBody>;

export const MAJOR_BODIES = ORBIT_BODIES.filter((b) => b.major);

export const SPEED_STEPS = [1, 8, 30, 120, 365];
