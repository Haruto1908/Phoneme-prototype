/**
 * th-frontview.js — front view of a child's mouth (lips, teeth, tongue) for /θ/ /ð/ /ɹ/ /k/ /æ/ /t/.
 *
 * Companion to th-sideview.js: it uses the same per-sound keyframes (SOUNDS[s].keys) and timing, so when it is
 * driven with the same clock the two views move in lock-step. It has no audio of its own — call render(t).
 *
 *   import { createThFrontview } from './th-frontview.js'
 *   const front = createThFrontview(document.querySelector('#front'), { sound: 'θ' })
 *   side = createThSideview(sideEl, { …, onTime: (t) => front.render(t) })
 *   front.setSound('ɹ'); front.destroy()
 *
 * Drawing: parametric SVG (viewBox 400×320). A front pose is a handful of numbers — jaw opening, lip lift,
 * mouth width, lip rounding, and what the tongue is doing — eased between keyframes. Upper teeth are fixed to the
 * skull; the lower teeth, lower lip and chin follow the jaw. Teeth are always drawn over the tongue so they stay
 * visible, as the reviewers asked.
 */
import { SOUNDS, evalKeys } from './th-sideview.js'

const CX = 200, CY = 176
const UE = CY - 1                      // upper incisor biting edge (fixed)
const NS = 'http://www.w3.org/2000/svg'
const C = {
  bg: '#cfe5f1', skin: '#f6d2bf', skinShade: '#e2ab95', skinDeep: '#c98a76', blush: '#ff9d9c',
  lipU: '#c9737a', lipUTop: '#b9646c', lipL: '#de8f90', lipLine: '#8f3f4a',
  cavity: '#7c3646', cavityDeep: '#3a121d', tongue: '#f09da0', tongueTop: '#f7b7b6', tongueDeep: '#cf6d77',
  tongueUnder: '#e5848f', back: '#b65d69', backDeep: '#7a3142',
  tooth: '#fffdf8', toothShade: '#eadccd', toothLine: '#d4bfae', gum: '#eb9ea6',
  air: '#dff4ff', airLine: '#4aa8e0', buzz: '#ff7fa3',
}

/**
 * Front poses (px). open: jaw opening (lower lip drop = 1.45·open, lower teeth drop = 0.62·open) · up: upper-lip
 * lift (shows the upper teeth) · W: half mouth width · round: lip rounding 0–1 · smile: corner lift ·
 * tOut: tongue tip out between the teeth 0–1 (θ ð) · tW: tongue half width · tTop: tongue surface relative to
 * the lower teeth edge · tipUp: tip raised behind the upper teeth (t) · rTip: /ɹ/ tip raised but NOT touching ·
 * hump: back of the tongue raised to the roof (k).
 */
const REST = { open: 0, up: 0, W: 50, round: 0, smile: 2, tOut: 0, tW: 28, tTop: 6, tipUp: 0, rTip: 0, hump: 0 }
const P = (o) => Object.assign({}, REST, o)
export const FRONT_POSES = {
  'θ': { out: P({ open: 22, up: 11, W: 54, tOut: 1, smile: 1 }), hold: P({ open: 15, up: 11, W: 54, tOut: 1, smile: 1 }) },
  'ð': { out: P({ open: 22, up: 11, W: 54, tOut: 1, smile: 1 }), hold: P({ open: 15, up: 11, W: 54, tOut: 1, smile: 1 }) },
  // /ɹ/ (expert's "soft ball"): the mouth opens wide like "ah" (tongue low), then squeezes softly — lips round and
  // the tongue pulls back, its tip lifted behind the lower teeth but stopping well short of the upper teeth:
  // the dark space between them (dashed ring) shows that the tip touches nothing
  'ɹ': {
    open: P({ open: 27, up: 9, W: 58, round: 0.1, tTop: -10, tW: 32, smile: 1 }),
    hold: P({ open: 16, up: 6, W: 40, round: 0.9, rTip: 1, tTop: 3, smile: 0 }),
  },
  // /k/: the tip stays DOWN behind the lower teeth; what rises is the back of the tongue, seen as a deep mound
  'k': { hold: P({ open: 19, up: 7, W: 52, hump: 1, tTop: 3 }), rel: P({ open: 15, up: 5, W: 51, hump: 0.25, tTop: 3 }) },
  'æ': { hold: P({ open: 34, up: 12, W: 64, tTop: -10, tW: 36, smile: 3 }) },
  't': { hold: P({ open: 12, up: 8, W: 52, tipUp: 1, tTop: 2 }), rel: P({ open: 12, up: 6, W: 52, tipUp: 0.2, tTop: 3 }) },
}
/** Where things touch in the front view, and the air: same time windows as the side view's contacts / flows. */
const FRONT_MARKS = {
  'θ': { touch: [[CX - 12, UE + 0.5], [CX + 12, UE + 0.5]], touchLow: true, air: 'around' },
  'ð': { touch: [[CX - 12, UE + 0.5], [CX + 12, UE + 0.5]], touchLow: true, air: 'around' },
  'ɹ': { gap: true },   // dashed ring in the space between the free tip and the upper teeth
  // no front glow for /k/: the seal is at the back of the mouth, and a glow under the front teeth would read as /t/
  'k': { air: 'scrape' },
  't': { touch: [[CX, UE - 0.5]], air: 'puff' },
  'æ': {},
}

function el(name, attrs = {}, parent) {
  const e = document.createElementNS(NS, name)
  for (const k in attrs) e.setAttribute(k, attrs[k])
  if (parent) parent.appendChild(e)
  return e
}
const f = (n) => n.toFixed(2)
const smooth = (u) => { u = Math.min(1, Math.max(0, u)); return u * u * (3 - 2 * u) }
const lerp = (a, b, u) => a + (b - a) * u
const polyD = (pts, close) => 'M' + pts.map((q) => f(q[0]) + ',' + f(q[1])).join('L') + (close ? 'Z' : '')

/** Front pose at time t for a sound (keyframes shared with the side view). */
export function frontPoseAt(t, sound = 'θ') {
  const c = SOUNDS[sound] || SOUNDS['θ'], poses = FRONT_POSES[sound] || FRONT_POSES['θ']
  return evalKeys(c.keys, t, (n) => (n === 'rest' ? REST : poses[n]), (a, b, u, toRest) => {
    const o = {}
    for (const k in REST) o[k] = lerp(a[k], b[k], u)
    // the tongue tip leads on the way out of a /θ/ (pulls in first) and the jaw follows, like the side view
    if (toRest && a.tOut > 0) { o.tOut = lerp(a.tOut, b.tOut, smooth(u / 0.7)); o.open = lerp(a.open, b.open, smooth((u - 0.3) / 0.7)) }
    return o
  })
}

/**
 * @param {HTMLElement} container
 * @param {{ sound?: string }} [options]
 */
export function createThFrontview(container, options = {}) {
  let sound = options.sound && SOUNDS[options.sound] ? options.sound : 'θ'
  const uid = 'fv' + Math.random().toString(36).slice(2, 8)
  const svg = el('svg', { xmlns: NS, viewBox: '100 96 200 160', role: 'img', 'aria-label': 'Front view of the mouth: lips, teeth and tongue' })
  svg.style.display = 'block'; svg.style.width = '100%'; svg.style.height = 'auto'
  const defs = el('defs', {}, svg)
  const lin = (id, x1, y1, x2, y2, stops) => { const g = el('linearGradient', { id: uid + id, x1, y1, x2, y2 }, defs); stops.forEach(([o, c, a]) => el('stop', { offset: o, 'stop-color': c, 'stop-opacity': a === undefined ? 1 : a }, g)); return `url(#${uid}${id})` }
  const rad = (id, cx, cy, r, stops, user) => { const g = el('radialGradient', Object.assign({ id: uid + id, cx, cy, r }, user ? { gradientUnits: 'userSpaceOnUse' } : {}), defs); stops.forEach(([o, c, a]) => el('stop', { offset: o, 'stop-color': c, 'stop-opacity': a === undefined ? 1 : a }, g)); return g }
  const blur = (id, sd) => { const fl = el('filter', { id: uid + id, x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs); el('feGaussianBlur', { stdDeviation: sd }, fl); return `url(#${uid}${id})` }

  const gSkin = lin('skin', 0, 0, 0, 1, [[0, '#f8dccc'], [0.55, C.skin], [1, '#efc2ac']])
  const gLipU = lin('lipU', 0, 0, 0, 1, [[0, C.lipUTop], [1, C.lipU]])
  const gLipL = lin('lipL', 0, 0, 0, 1, [[0, '#c9767c'], [0.35, C.lipL], [1, '#e9a6a2']])
  const gCav = rad('cav', CX, CY + 18, 80, [[0, C.cavity], [1, C.cavityDeep]], true)
  const gTongue = lin('tongue', 0, 0, 0, 1, [[0, C.tongueTop], [0.5, C.tongue], [1, C.tongueDeep]])
  const gUnder = lin('under', 0, 0, 0, 1, [[0, C.tongueTop], [0.55, C.tongueUnder], [1, C.tongueDeep]])
  const gBack = lin('back', 0, 0, 0, 1, [[0, C.back], [1, C.backDeep]])
  // /ɹ/: the underside of the curled-up tongue — darker high up (further back, in shadow under the roof), lighter
  // and pinker low down at the bend that faces the teeth
  const gRetro = lin('retro', 0, 0, 0, 1, [[0, C.backDeep], [0.3, C.back], [0.75, C.tongueUnder], [1, C.tongue]])
  const gTooth = lin('tooth', 0, 0, 0, 1, [[0, C.toothShade], [0.55, C.tooth], [1, '#ffffff']])
  const gToothL = lin('toothL', 0, 0, 0, 1, [[0, '#ffffff'], [0.45, C.tooth], [1, C.toothShade]])
  const gGlow = rad('glow', '50%', '50%', '50%', [[0, '#fffbe6', 1], [0.35, '#ffd84d', 0.95], [1, '#ffb300', 0]])
  const fSoft = blur('soft', 2.2), fBlush = blur('blush', 9), fShadow = blur('sh', 3.2), fNose = blur('nose', 5)

  // ---------- face ----------
  el('rect', { x: 0, y: 0, width: 400, height: 320, fill: C.bg }, svg)
  const face = el('path', { fill: gSkin }, svg)
  el('ellipse', { cx: 200, cy: 58, rx: 44, ry: 30, fill: C.skinShade, opacity: 0.35, filter: fNose }, svg)       // nose base shading
  el('ellipse', { cx: 200, cy: 50, rx: 20, ry: 14, fill: '#ffffff', opacity: 0.22, filter: fNose }, svg)         // nose tip light
  ;[-1, 1].forEach((s) => {
    el('ellipse', { cx: 200 + s * 17, cy: 76, rx: 9, ry: 4.6, fill: C.skinDeep, opacity: 0.75, transform: `rotate(${s * -14} ${200 + s * 17} 76)` }, svg) // nostrils
    el('ellipse', { cx: 200 + s * 112, cy: 180, rx: 44, ry: 28, fill: C.blush, opacity: 0.32, filter: fBlush }, svg)           // cheeks
    el('path', { d: `M ${200 + s * 7} 90 C ${200 + s * 8.5} 110, ${200 + s * 9.5} 128, ${200 + s * 11} 146`, fill: 'none', stroke: C.skinShade, 'stroke-width': 4, opacity: 0.16, filter: blur('ph' + (s > 0 ? 'r' : 'l'), 1.6) }, svg) // philtrum
  })
  const chinShade = el('ellipse', { rx: 34, ry: 10, fill: C.skinShade, opacity: 0.35, filter: fNose }, svg)
  const mouthShadow = el('path', { fill: C.skinDeep, opacity: 0.22, filter: fShadow }, svg)   // soft shadow under the lower lip

  // ---------- inside of the mouth (clipped to the lip opening) ----------
  const clipPath = el('path', {}, el('clipPath', { id: uid + 'mouth' }, defs))
  const inside = el('g', { 'clip-path': `url(#${uid}mouth)` }, svg)
  el('rect', { x: 100, y: 120, width: 200, height: 140, fill: url(gCav) }, inside)
  const hump = el('ellipse', { rx: 34, ry: 30, fill: gBack }, inside)               // back of the tongue (k)
  const humpHi = el('ellipse', { rx: 16, ry: 5, fill: '#ffffff', opacity: 0.18 }, inside)
  const body = el('ellipse', { fill: gTongue }, inside)                              // tongue body behind the lower teeth
  const bodyGroove = el('path', { fill: 'none', stroke: C.tongueDeep, 'stroke-width': 1.6, 'stroke-linecap': 'round', opacity: 0.35 }, inside)
  // tip raised (t) / curled (ɹ): the tongue rises from BEHIND the lower teeth, so it is drawn before them and the
  // lower teeth cover its base (the θ/ð tip, which comes out over the teeth, is drawn after them further down)
  const column = el('path', { fill: gUnder }, inside)
  const columnLine = el('path', { fill: 'none', stroke: C.tongueDeep, 'stroke-width': 1.4, 'stroke-linecap': 'round', opacity: 0.45 }, inside)
  const lowerTeeth = el('g', {}, inside)
  const bandShadow = el('ellipse', { fill: '#3a121d', opacity: 0, filter: fSoft }, inside)
  // tongue tip sandwiched between the teeth (θ ð): a rounded tip, lit in the middle and darker toward its sides
  const gTip = rad('tip', 0.45, 0.32, 0.8, [[0, C.tongueTop], [0.5, C.tongue], [1, C.tongueDeep]])
  const band = el('path', { fill: url(gTip) }, inside)
  const bandGroove = el('path', { fill: 'none', stroke: C.tongueDeep, 'stroke-width': 1.3, 'stroke-linecap': 'round', opacity: 0 }, inside)
  const bandHi = el('ellipse', { fill: '#ffffff', opacity: 0, filter: blur('bhi', 1.2) }, inside)
  el('rect', { x: 120, y: UE - 34, width: 160, height: 22, fill: C.gum }, inside)   // upper gum
  const upperTeeth = el('g', {}, inside)
  const innerShade = el('path', { fill: 'none', stroke: '#2a0a12', 'stroke-width': 6, opacity: 0.4, filter: fSoft }, inside)

  // teeth: [x offset, width, height, edge lift]; drawn as rounded crowns, side teeth a little shaded (further back)
  const UPPER = [[-9.6, 18.4, 26, 0], [9.6, 18.4, 26, 0], [-27, 14.6, 23, 1.6], [27, 14.6, 23, 1.6], [-41.5, 13, 22, 0.6], [41.5, 13, 22, 0.6], [-54, 11.5, 19, 2.4], [54, 11.5, 19, 2.4]]
  const LOWER = [[-6.6, 12.8, 18, 0], [6.6, 12.8, 18, 0], [-19.6, 12.4, 17, 0.6], [19.6, 12.4, 17, 0.6], [-31.8, 12, 16, 0.4], [31.8, 12, 16, 0.4], [-43, 10.5, 14, 1.4], [43, 10.5, 14, 1.4]]
  const crown = (x, w, top, bottom, r, edgeAtBottom) => edgeAtBottom
    ? `M ${f(x - w / 2)} ${f(top)} V ${f(bottom - r)} Q ${f(x - w / 2)} ${f(bottom)} ${f(x - w / 2 + r)} ${f(bottom)} H ${f(x + w / 2 - r)} Q ${f(x + w / 2)} ${f(bottom)} ${f(x + w / 2)} ${f(bottom - r)} V ${f(top)} Z`
    : `M ${f(x - w / 2)} ${f(bottom)} V ${f(top + r)} Q ${f(x - w / 2)} ${f(top)} ${f(x - w / 2 + r)} ${f(top)} H ${f(x + w / 2 - r)} Q ${f(x + w / 2)} ${f(top)} ${f(x + w / 2)} ${f(top + r)} V ${f(bottom)} Z`
  UPPER.forEach(([dx, w, h, lift]) => {
    const x = CX + dx, side = Math.abs(dx) > 20
    el('path', { d: crown(x, w - 0.8, UE - h, UE - lift, 4, true), fill: gTooth, stroke: C.toothLine, 'stroke-width': 0.7, opacity: side ? 0.92 : 1 }, upperTeeth)
    if (side) el('path', { d: crown(x, w - 0.8, UE - h, UE - lift, 4, true), fill: '#8a5a50', opacity: Math.abs(dx) > 45 ? 0.22 : 0.1 }, upperTeeth)
    el('path', { d: `M ${f(x - w / 2 + 3.2)} ${f(UE - h + 6)} V ${f(UE - lift - 5)}`, stroke: '#ffffff', 'stroke-width': 1.6, 'stroke-linecap': 'round', opacity: 0.75 }, upperTeeth)
  })
  LOWER.forEach(([dx, w, h, lift]) => {
    const x = dx, side = Math.abs(dx) > 25          // the lower-teeth group is translated to (CX, lower edge) each frame
    el('path', { d: crown(x, w - 0.8, lift, h, 3.5, false), fill: gToothL, stroke: C.toothLine, 'stroke-width': 0.7 }, lowerTeeth)
    if (side) el('path', { d: crown(x, w - 0.8, lift, h, 3.5, false), fill: '#8a5a50', opacity: Math.abs(dx) > 38 ? 0.22 : 0.1 }, lowerTeeth)
  })
  el('rect', { x: -60, y: 13, width: 120, height: 14, fill: C.gum, opacity: 0.9 }, lowerTeeth)   // lower gum (rarely visible)

  // ---------- lips ----------
  const lipLower = el('path', { fill: gLipL }, svg)
  const lipLowerHi = el('ellipse', { rx: 20, ry: 4.5, fill: '#ffffff', opacity: 0.28, filter: blur('lhi', 1.6) }, svg)
  const lipUpper = el('path', { fill: gLipU }, svg)
  const lipUpperHi = el('path', { fill: 'none', stroke: '#ffffff', 'stroke-width': 2, opacity: 0.22, 'stroke-linecap': 'round', filter: blur('uhi', 1) }, svg)
  const lipLine = el('path', { fill: 'none', stroke: C.lipLine, 'stroke-width': 1.6, 'stroke-linecap': 'round' }, svg)

  // ---------- marks: touch glows, the "touches nothing" ring, air, buzz ----------
  const marks = el('g', {}, svg)
  const glows = [0, 1, 2, 3].map(() => el('circle', { r: 6, fill: url(gGlow), opacity: 0 }, marks))
  const gapRing = el('circle', { r: 3.4, fill: 'none', stroke: '#ffffff', 'stroke-width': 1.1, 'stroke-dasharray': '2 1.6', opacity: 0 }, marks)
  const airDots = Array.from({ length: 12 }, () => el('ellipse', { rx: 3, ry: 2, fill: C.air, stroke: C.airLine, 'stroke-width': 0.8, opacity: 0 }, marks))
  const rings = [0, 1, 2].map(() => el('ellipse', { fill: 'none', stroke: C.airLine, 'stroke-width': 1.6, opacity: 0 }, marks))
  const buzz = el('g', { fill: 'none', stroke: C.buzz, 'stroke-width': 2.4, 'stroke-linecap': 'round', opacity: 0 }, marks)
  // voice "buzz" arcs beside the mouth (the throat is outside this mouth-focused frame)
  ;[-1, 1].forEach((s) => [8, 13, 18].forEach((r) => el('path', { d: `M ${200 + s * (66 + r)} ${200 - r * 0.75} A ${r} ${r} 0 0 ${s > 0 ? 1 : 0} ${200 + s * (66 + r)} ${200 + r * 0.75}` }, buzz)))
  function url(g) { return `url(#${g.getAttribute('id')})` }

  // ---------- geometry ----------
  function mouthGeom(p) {
    const q = 0.8 - 0.36 * p.round
    const yk = CY + p.open * 0.25 - p.smile
    const yTop = CY - p.up, yBot = CY + p.open * 1.45
    const W = p.W
    const TU = 12 + 6 * p.round, TL = 15 + 7 * p.round
    const N = 40, top = [], bot = [], outU = [], outL = []
    for (let i = 0; i <= N; i++) {
      const u = -1 + (2 * i) / N, w = Math.pow(Math.max(0, 1 - u * u), q), x = CX + W * u
      const ty = yk + (yTop - yk) * w, by = yk + (yBot - yk) * w
      top.push([x, ty]); bot.push([x, by])
      const taper = 0.1 + 0.9 * Math.sqrt(Math.max(0, 1 - u * u))
      const bow = 2.8 * Math.exp(-(((Math.abs(u) - 0.24) / 0.13) ** 2)) - 2.4 * Math.exp(-((u / 0.08) ** 2))
      const xo = CX + (W + 5) * u
      outU.push([xo, ty - TU * taper - bow * taper])
      outL.push([xo, by + TL * taper])
    }
    return { top, bot, outU, outL, yTop, yBot, yk }
  }

  function render(t) {
    const p = frontPoseAt(t, sound), c = SOUNDS[sound], T = c.timing, m = FRONT_MARKS[sound] || {}
    const g = mouthGeom(p)
    const chin = p.open * 0.6
    face.setAttribute('d', `M -10 -10 H 410 V 150 C 410 ${232 + chin * 0.5}, ${336} ${296 + chin}, 200 ${300 + chin} C 64 ${296 + chin}, -10 ${232 + chin * 0.5}, -10 150 Z`)
    chinShade.setAttribute('cx', 200); chinShade.setAttribute('cy', f(272 + chin))
    const inner = g.top.concat(g.bot.slice().reverse())
    clipPath.setAttribute('d', polyD(inner, true))
    innerShade.setAttribute('d', polyD(inner, true))
    lipUpper.setAttribute('d', polyD(g.outU.concat(g.top.slice().reverse()), true))
    lipLower.setAttribute('d', polyD(g.bot.concat(g.outL.slice().reverse()), true))
    mouthShadow.setAttribute('d', polyD(g.outL.map(([x, y]) => [x, y + 6]).concat(g.outL.slice().reverse().map(([x, y]) => [x, y - 2])), true))
    lipLine.setAttribute('d', p.open + p.up < 0.6 ? polyD(g.top, false) : polyD(inner, true))
    lipLine.setAttribute('opacity', p.open + p.up < 0.6 ? '1' : '0.55')
    const lowMid = g.outL[20][1], lowIn = g.bot[20][1]
    lipLowerHi.setAttribute('cx', CX); lipLowerHi.setAttribute('cy', f((lowMid + lowIn) / 2 + 1)); lipLowerHi.setAttribute('rx', f(p.W * 0.38))
    lipUpperHi.setAttribute('d', polyD(g.outU.slice(12, 29).map(([x, y]) => [x, y + 2.5]), false))

    // lower jaw: teeth drop with the jaw
    const LE = CY + 3 + p.open * 0.62
    lowerTeeth.setAttribute('transform', `translate(${CX} ${f(LE)})`)
    // tongue body (low, behind the lower teeth) and the back of the tongue (k)
    const bodyTop = LE + p.tTop
    body.setAttribute('cx', CX); body.setAttribute('cy', f(bodyTop + 36)); body.setAttribute('rx', f(p.tW + 30)); body.setAttribute('ry', 36)
    bodyGroove.setAttribute('d', `M ${CX} ${f(bodyTop + 4)} V ${f(bodyTop + 18)}`)
    const humpTop = lerp(LE + 16, UE - 3, p.hump)        // at the seal its top disappears behind the upper teeth (the roof)
    hump.setAttribute('cx', CX); hump.setAttribute('cy', f(humpTop + 30)); hump.setAttribute('opacity', f(Math.min(1, p.hump * 3)))
    humpHi.setAttribute('cx', CX); humpHi.setAttribute('cy', f(humpTop + 7)); humpHi.setAttribute('opacity', f(0.18 * p.hump))
    // raised tip: /t/ presses the tip up behind the upper teeth; /ɹ/ lifts its tip (pulled back, so shaded darker)
    // but stops ≈6 units below the upper teeth, leaving a dark space — it touches nothing
    const colUp = Math.max(p.tipUp, p.rTip)
    if (colUp > 0.01) {
      const retro = p.rTip > p.tipUp
      const colTop = retro ? lerp(bodyTop, UE + 6.5, p.rTip) : lerp(bodyTop, UE - 7, p.tipUp)
      const hw = retro ? 17 : 23, base = bodyTop + 10
      column.setAttribute('d', `M ${CX - hw - 6} ${f(base)} C ${CX - hw} ${f(colTop + 16)}, ${CX - hw * 0.75} ${f(colTop)}, ${CX} ${f(colTop)} C ${CX + hw * 0.75} ${f(colTop)}, ${CX + hw} ${f(colTop + 16)}, ${CX + hw + 6} ${f(base)} Z`)
      columnLine.setAttribute('d', retro
        ? `M ${CX} ${f(Math.max(colTop + 6, UE + 1))} C ${CX - 1.5} ${f(base - 12)}, ${CX + 1.5} ${f(base - 6)}, ${CX} ${f(base - 1)}`
        : `M ${CX} ${f(colTop + 7)} V ${f(Math.max(colTop + 8, base - 2))}`)
      column.setAttribute('fill', retro ? gRetro : gUnder)
      column.setAttribute('opacity', '1'); columnLine.setAttribute('opacity', retro ? '0.7' : '0.45')
      columnLine.setAttribute('stroke-width', retro ? '1.8' : '1.4')
    } else { column.setAttribute('opacity', '0'); columnLine.setAttribute('opacity', '0') }
    // θ ð: the tip comes out and is held between the teeth — top on the upper edge, underside on the lower edge
    // (top flat under the upper teeth, sides rounding into a soft tip that rests on the lower teeth)
    if (p.tOut > 0.01) {
      const hw = 6 + 24 * p.tOut, th = 6 + 12 * p.tOut, y0 = UE - 2.5, y1 = y0 + th
      band.setAttribute('d', `M ${f(CX - hw)} ${f(y0 + 3)} Q ${f(CX - hw)} ${f(y0)} ${f(CX - hw + 5)} ${f(y0)} H ${f(CX + hw - 5)} Q ${f(CX + hw)} ${f(y0)} ${f(CX + hw)} ${f(y0 + 3)}`
        + ` C ${f(CX + hw + 1)} ${f(y1 - 3)}, ${f(CX + hw * 0.55)} ${f(y1 + 2.5)}, ${CX} ${f(y1 + 2.5)} C ${f(CX - hw * 0.55)} ${f(y1 + 2.5)}, ${f(CX - hw - 1)} ${f(y1 - 3)}, ${f(CX - hw)} ${f(y0 + 3)} Z`)
      bandGroove.setAttribute('d', `M ${CX} ${f(y0 + 2)} V ${f(y0 + th * 0.55)}`); bandGroove.setAttribute('opacity', f(0.3 * p.tOut))
      bandHi.setAttribute('cx', f(CX - hw * 0.3)); bandHi.setAttribute('cy', f(y0 + th * 0.45)); bandHi.setAttribute('rx', f(hw * 0.35)); bandHi.setAttribute('ry', 2.2); bandHi.setAttribute('opacity', f(0.35 * p.tOut))
      bandShadow.setAttribute('cx', CX); bandShadow.setAttribute('cy', f(y1 + 3.5)); bandShadow.setAttribute('rx', f(hw * 0.85)); bandShadow.setAttribute('ry', 3); bandShadow.setAttribute('opacity', f(0.4 * p.tOut))
      band.setAttribute('opacity', '1')
    } else { band.setAttribute('opacity', '0'); bandHi.setAttribute('opacity', '0'); bandShadow.setAttribute('opacity', '0'); bandGroove.setAttribute('opacity', '0') }

    // ---------- marks (same time windows as the side view) ----------
    const contacts = c.contacts || []
    const win = (a, b, fade = 0.07) => Math.max(0, Math.min(1, (t - a) / fade, (b - t) / fade))
    const pulse = 0.5 + 0.5 * Math.sin(t * 14)
    const touchW = contacts.filter((q) => !q.gap).reduce((mx, q) => Math.max(mx, win(q.from, q.to)), 0)
    const glowPts = []
    if (m.touch) glowPts.push(...m.touch)
    if (m.touchLow) glowPts.push([CX - 14, LE + 0.5], [CX + 14, LE + 0.5])
    if (m.touchHump) glowPts.push([CX, humpTop + 2])
    glows.forEach((gl, k) => {
      const q = glowPts[k]
      if (!q) { gl.setAttribute('opacity', '0'); return }
      gl.setAttribute('cx', f(q[0])); gl.setAttribute('cy', f(q[1])); gl.setAttribute('r', f(5 + 1.6 * pulse))
      gl.setAttribute('opacity', f(touchW * (0.65 + 0.35 * pulse)))
    })
    const gapC = contacts.find((q) => q.gap)
    const gw = gapC ? win(gapC.from, gapC.to) : 0
    gapRing.setAttribute('cx', CX); gapRing.setAttribute('cy', f(UE + 3.2)); gapRing.setAttribute('opacity', f(gw * (0.75 + 0.25 * pulse)))

    // air: θ streams out all around the sandwiched tip; /k/ a rough, scraping burst; /t/ a small clean puff
    const flows = c.flows || []
    const aw = flows.length ? win(flows[0].from, flows[0].to + 0.1, 0.08) : 0
    airDots.forEach((d, k) => {
      if (m.air !== 'around' || !aw) { d.setAttribute('opacity', '0'); return }
      const n = c.voiced ? 6 : 12
      if (k >= n) { d.setAttribute('opacity', '0'); return }
      const ang = (k / n) * Math.PI * 2 + 0.3, v = ((t - flows[0].from) * 1.5 + (k % 3) / 3) % 1
      const bx = CX + Math.cos(ang) * 34, by = UE + 7 + Math.sin(ang) * 15
      const x = bx + Math.cos(ang) * v * 46, y = by + Math.sin(ang) * v * 26
      d.setAttribute('transform', `translate(${f(x)} ${f(y)}) rotate(${f((ang * 180) / Math.PI)})`)
      d.setAttribute('opacity', f(aw * Math.min(1, v * 5) * (1 - v)))
    })
    rings.forEach((r, k) => {
      if ((m.air !== 'scrape' && m.air !== 'puff') || !aw || (m.air === 'puff' && k > 0)) { r.setAttribute('opacity', '0'); return }
      const v = Math.max(0, Math.min(1, (t - flows[0].from - k * 0.06) / 0.26))
      if (v <= 0 || v >= 1) { r.setAttribute('opacity', '0'); return }
      const big = m.air === 'scrape' ? 1 : 0.7
      r.setAttribute('cx', CX); r.setAttribute('cy', f(CY + p.open * 0.5))
      r.setAttribute('rx', f((22 + v * 70) * big)); r.setAttribute('ry', f((10 + v * 36) * big))
      r.setAttribute('stroke-dasharray', m.air === 'scrape' ? '3 3.5' : 'none')
      r.setAttribute('stroke-dashoffset', f(t * 60))
      r.setAttribute('opacity', f(1 - v))
    })
    const sounding = t >= T.soundOn && t <= T.soundOff
    buzz.setAttribute('opacity', c.voiced && sounding ? f(0.55 + 0.45 * Math.abs(Math.sin(t * 22))) : '0')
  }

  container.appendChild(svg)
  let curT = 0
  render(0)
  return {
    el: svg,
    get sound() { return sound },
    render(t) { curT = t; render(t) },
    setSound(s) { if (SOUNDS[s]) { sound = s; render(curT) } },
    destroy() { svg.remove() },
  }
}
