/**
 * th-sideview.js — side-view (sagittal) tongue animation for /θ/ /ð/ /ɹ/ /k/ /æ/ /t/.
 *
 * Framework-agnostic ES module: renders an SVG into a container and drives it from the audio clock.
 *
 *   import { createThSideview } from './th-sideview.js'
 *   const anim = createThSideview(document.querySelector('#stage'), {
 *     sound: 'θ',                               // 'θ' | 'ð' | 'ɹ' | 'k' | 'æ' | 't'
 *     audio: { 'θ': 'audio/θ.mp3', 'ð': 'audio/ð.mp3' },
 *     portrait: PORTRAIT_GIRL,                  // photo-real face with a soft cutaway window (or null for the flat diagram)
 *     onTime: (t) => {}, onEnd: () => {},
 *   })
 *   anim.play(); anim.stop(); anim.seek(1.5); anim.setSound('ð'); anim.destroy()
 *
 * React:
 *   useEffect(() => { const a = createThSideview(ref.current, opts); return () => a.destroy() }, [])
 *
 * Geometry: the IPA sagittal-section diagrams from Wikimedia Commons (IPA_θ / IPA_ð _Sagittal_Section.svg),
 * embedded unchanged in their millimetre coordinate system. Only the tongue is morphed and the lower jaw is
 * rigidly rotated, so the hold frame is exactly the reference drawing.
 *
 * Portrait mode: the photo is cut along the lip line; the lower lip + chin piece rotates about the jaw joint
 * together with the diagram's jaw (see `PORTRAIT_GIRL.jaw`), so the girl's mouth opens and closes with the sound.
 */

// Per-sound configuration (SOUNDS, TIMING) is defined below the tongue shapes it refers to.

/**
 * Portrait preset for assets/girl_profile.jpg (864×1152, facing right).
 * `anchor` maps diagram millimetres → image pixels:  X = scale·(x − mm[0]) + px[0],  Y = scale·(y − mm[1]) + px[1]
 * (mm anchor = the lip line / stomion of the diagram; px anchor = the same point on the photo).
 */
export const PORTRAIT_GIRL = {
  src: 'assets/girl_profile.jpg',
  width: 864,
  height: 1152,
  anchor: { mm: [160, 138], px: [730, 604], scale: 1.85 },
  /** viewBox shown (image px) — head and neck, nothing else */
  view: [250, 150, 614, 700],
  /** where the "buzz" marks go for /ð/ (image px, on the throat) */
  buzzAt: [515, 750],
  /**
   * Moving lower lip + chin ("puppet jaw"): the photo is cut along the lip line and the lower piece rotates
   * about the jaw joint together with the diagram's jaw, so the mouth really opens. All values are image px.
   */
  jaw: {
    seam: [[731, 599.5], [700, 600.2], [666, 600.5]],      // lip line, from the lip front back to the mouth corner
    cut: [[650, 591], [633, 576], [619, 556], [606, 700], [596, 900]], // soft cut from the corner up to the joint, then down the jaw
    feather: 9,       // blur of the cheek cut (px)
    gain: 1.5,        // photo lips open this much relative to the diagram jaw (>1 exaggerates for readability)
    bg: '#b8d1df',    // backdrop colour behind the lips (fills the sliver the lower lip uncovers)
    // mouth: '#...'  // optional colour of the opening between the lips (defaults to the theme's cavity colour)
  },
}

// ---------- themes ----------
const THEME_FLAT = {
  body: '#e6ebf2', line: '#5f6f82', tongue: '#f3a0ad', tongueTop: '#f8bfc6', tongueBottom: '#e68a98', tongueLine: '#c75f7c',
  tooth: '#ffffff', toothTop: '#eef1f5', toothEdge: '#ffffff', toothDeep: '#d3dae4', toothLine: '#5f6f82', gum: '#f0b9c0',
  cavity: 'transparent', accent: '#ff7fa3', lineWidth: 0.5, tissueOpacity: 1,
}
// Warm, natural palette: mucosal coral tongue with a moist highlight, deep burgundy cavity, enamel-shaded teeth, pink gums.
const THEME_WARM = {
  body: '#f3ccb8', line: '#cf9a86', tongue: '#e88c92', tongueTop: '#f3a9ab', tongueBottom: '#d8777f', tongueLine: '#c4646d',
  tooth: '#fffdf8', toothTop: '#efe3d6', toothEdge: '#f6f8f9', toothDeep: '#d6c3b1', toothLine: '#c9a08f', gum: '#e39aa3',
  // cavity: lit from the lips (cavityTop near the opening) and falling off to cavityDeep at the throat; cavityRim is the
  // ambient-occlusion tone along the oval's edge and under the tongue. skinShade darkens the tissue around the hole.
  cavity: '#6a2a3a', cavityTop: '#95505f', cavityDeep: '#3a121d', cavityRim: '#24080f', skinShade: '#7a3a34',
  accent: '#ff7fa3', lineWidth: 0.45, tissueOpacity: 0.62,
}
const CAVITY_FEATHER = 1.4   // mm: how softly the cavity tone melts into the surrounding tissue (portrait mode)

// ---------- source geometry (Wikimedia IPA sagittal sections, unchanged) ----------
const D9 = "m 88.988053,244.47499 0,0 1.499447,-14.19916 1.058333,-11.99445 0.441114,-5.55639 0.352777,-4.58611 0,0 0.264443,-5.7325 0.08834,-5.29166 0,-4.85084 -0.08834,-4.40972 -0.176389,-7.67278 -0.08805,-3.35167 0,-2.91027 0,0 0,-1.49917 -0.08834,-1.58778 -0.264442,-3.70388 -0.352778,-3.96889 -0.441113,-3.9689 -0.881945,-7.31999 -0.352778,-2.82223 -0.08805,-1.94027 0,0 -0.08834,-7.67306 -0.08834,-4.32139 0.08834,-2.02861 0.08834,-1.85194 0,0 0,-0.97028 0,-0.97 -0.08834,-2.46945 -0.08834,-1.32277 0.08834,-1.49945 0.08834,-1.49944 0.176107,-1.58722 0.352777,-1.58778 0.529449,-1.67556 0.705556,-1.67555 0.881662,-1.67584 0.529449,-0.88194 0.61722,-0.79389 0.705556,-0.88166 0.705555,-0.7939 0.881945,-0.88194 0.881944,-0.79361 0.969998,-0.88223 1.058333,-0.7936 0,0 3.792497,-2.82223 2.5575,-2.02861 1.58778,-1.49916 0.52889,-0.52917 0.44111,-0.44111 0.17639,-0.440835 0.17639,-0.264725 0.17639,-0.61722 0.17639,-0.61722 0.17639,-0.352777 0.26472,-0.441114 0,0 0.26444,-0.529166 0.17639,-0.529167 0.35278,-1.146669 0.17639,-1.23444 0.17639,-1.323058 0.26472,-1.146386 0.26444,-1.146669 0.26445,-0.441114 0.26472,-0.440831 0.35278,-0.440831 0.44083,-0.264724 0,0 1.67583,-0.793609 2.91028,-1.058333 3.70445,-1.411112 4.23333,-1.411111 4.145,-1.323057 3.88056,-1.058334 1.76388,-0.440831 1.41112,-0.264724 1.14666,-0.176389 0.88167,0 0,0 1.67583,0.264442 2.11667,0.617502 2.5575,0.881945 2.73417,0.969997 2.64583,1.235005 2.64583,1.322775 1.14639,0.61722 1.05833,0.705556 0.97028,0.617502 0.79361,0.705556 0,0 3.43973,3.086946 3.7925,3.527778 1.58722,1.675554 1.41111,1.499446 0.52945,0.705556 0.35277,0.528884 0.26445,0.529452 0.0883,0.44083 0,0 -0.0883,0.70555 -0.26445,0.70556 -0.35277,0.70555 -0.35278,0.61751 -0.70556,0.96999 -0.35278,0.35278 0,0 0.0881,0.26444 0.0881,0.35278 0.26473,0.26473 0.35277,0.17639 0.61751,0.0883 0.7936,-0.0883 1.14639,-0.35278 0,0 1.14667,-0.52917 0.88194,-0.6175 0.70556,-0.61722 0.52917,-0.61722 0.35277,-0.70556 0.26445,-0.6175 0.17667,-0.6175 0,-0.61722 0,0 -0.0883,-0.17639 -0.0883,-0.35278 -0.61722,-0.970277 -2.29306,-2.998329 -3.175,-3.968891 -3.61583,-4.497776 -7.14389,-8.731391 -2.64583,-3.351389 -0.79361,-1.146669 -0.52945,-0.793609 0,0 -0.26444,-0.617502 -0.17639,-0.61722 -0.0881,-0.705555 -0.0883,-0.793892 0,-1.675553 0.17639,-1.763889 0.35277,-3.880555 0.0881,-2.028331 0,-2.028614 0,0 -0.0881,-0.97028 -0.17638,-1.058333 -0.44112,-1.939996 -0.61722,-1.852224 -0.61722,-1.763889 -0.70555,-1.411111 -0.52945,-1.146669 -0.52889,-0.969998 0,0 -0.17667,-0.705555 -0.70555,-1.940278 -1.14639,-2.910276 -0.79361,-1.852224 -0.97028,-1.940278 -1.05833,-2.20472 -1.23472,-2.205002 -1.41112,-2.381109 -1.5875,-2.469444 -1.76388,-2.55778 -1.94028,-2.557639 -2.11667,-2.557639 -2.38111,-2.557639 -2.55778,-2.469445 -2.73388,-2.38125 -1.49945,-1.146527 -1.49945,-1.146528 -1.58722,-1.146528 -1.58778,-1.058333 -1.67555,-1.0583335 -1.76389,-0.9701389 -1.76389,-0.9701389 -1.85222,-0.9701389 -1.94,-0.79375 L 108.30278,4.6742994 106.27416,3.9687438 104.1575,3.2631883 102.04083,2.6458272 99.748058,2.028466 97.45472,1.5874938 95.073611,1.1465216 92.604167,0.79374382 90.134722,0.52916048 87.576942,0.3527716 84.931391,0.26457715 82.197222,0.17638271 79.375,0.26457715 76.552778,0.44096604 73.642502,0.70554937 70.555556,1.0583272 l -2.998612,0.5291666 -3.175,0.5291667 -3.263335,0.7055555 0,0 -3.175,0.79375 -3.175,0.79375 -2.998329,0.79375 -2.822222,0.9701389 -2.822222,0.8819445 -2.646116,0.9701389 -2.557498,0.9701389 -2.469444,1.0583328 -2.381391,1.058334 -2.20472,1.058333 -2.20472,1.146528 -2.116667,1.146528 -1.940419,1.146527 -1.940278,1.234723 -1.763889,1.234722 -1.763888,1.234722 -1.5875,1.234722 -1.5875,1.322917 -1.499306,1.234722 -1.322917,1.322917 -1.322916,1.322917 -1.322917,1.322916 -1.146528,1.411252 -1.146528,1.322776 -0.970138,1.411111 -0.9701393,1.322776 -0.9701389,1.411111 -0.79375,1.411111 -1.5875,2.734169 -1.2347222,2.822222 -1.1465278,2.734169 -0.8819445,2.822222 -0.79375,2.645551 -0.5291666,2.646116 -0.44097226,2.645551 -0.35277777,2.55778 -0.17638889,2.469444 -0.0881944,2.293056 -0.0881944,2.293055 0.0881944,2.116667 0.17638889,3.880556 0.17638889,3.263335 0.17638889,2.557498 0,0 0.17638889,2.469444 0.44097226,2.998612 0.6173611,3.439442 0.79375,3.880555 1.0583334,4.057227 1.1465277,4.321387 1.4111111,4.409717 1.4993056,4.40973 1.6756944,4.49805 1.7638885,4.23334 1.940278,4.05666 0.970139,1.94056 0.970139,1.85194 1.058333,1.76389 1.058334,1.67584 1.058333,1.49916 1.146528,1.41111 1.058333,1.32306 1.146528,1.14639 1.146528,0.97028 1.146527,0.79361 0,0 1.146528,0.7936 1.146528,0.88223 1.234722,0.88166 1.146528,1.05834 2.381109,2.205 2.381391,2.46944 2.293055,2.64584 2.205003,2.64583 2.116666,2.73389 2.028331,2.82222 1.852225,2.64611 1.675553,2.5575 1.5875,2.38139 1.323058,2.11667 1.851942,3.35111 0.529167,1.05833 0.264442,0.6175 0,0 0.176671,0.44083 0.264442,0.61751 0.793892,1.76388 1.058333,2.29306 0.528884,1.41111 0.529449,1.41111 0.440831,1.5875 0.440831,1.67584 0.352778,1.85194 0.264725,1.85194 0.08805,1.85223 -0.08805,2.02833 -0.176389,2.02861 -0.441114,2.11667 0,0 -1.322775,5.55639 -1.675553,7.76111 -3.880556,18.25611 -4.762782,23.10694 45.155555,0 z"      // head
const D7 = "m 98.248611,244.47499 0,0 -0.176389,-5.11527 -0.440831,-11.46528 -0.176671,-6.26195 0,-5.64444 0,-2.38111 0.08834,-1.94028 0.176388,-1.49916 0.08805,-0.44112 0.08834,-0.35278 0,0 1.234723,-2.46944 0.793608,-1.49945 0.705561,-1.58721 0.6175,-1.58779 0.44083,-1.49916 0.0883,-0.70556 0,-0.6175 0,-0.61722 -0.17639,-0.52917 0,0 -0.35278,-0.88194 -0.44083,-0.61722 -0.35278,-0.35278 -0.44111,-0.26472 -0.352783,-0.0881 -0.352778,0 -0.705555,0.0881 0,0 -0.176389,0.0881 -0.264724,0.17667 -0.61722,0.79361 -0.705556,1.05833 -0.881944,1.32306 -0.793609,1.49917 -0.705556,1.5875 -0.529449,1.49944 -0.440831,1.49917 0,0 -0.08805,0.79361 -0.08834,1.05833 -0.08834,2.55778 0,3.08666 0.08834,3.35168 0.176389,6.79083 0,2.91027 0,2.38139 0,0 -0.176389,9.87778 -0.08834,5.99722 5.027224,0 z"      // pharynx back wall
const D13 = "m 151.34167,136.96582 0,0 0.17639,-0.0881 0.17638,-0.0881 0.17639,-0.44112 0.17639,-0.70555 0.17639,-0.88195 0.17639,-2.20472 0.088,-2.64611 0.17667,-4.93889 0.0881,-1.67555 0.0881,-0.44112 0.0883,-0.1761 0,0 0.0883,0 0.0881,0.088 0.0881,0.35278 0.17667,1.49916 0.088,4.41001 0.17639,4.58611 0.17639,1.58722 0.088,0.44111 0.0883,0.26444 0,0 0.88194,0.44111 0.61751,0.35278 0.70555,0.26444 0.79361,0.0883 0.44083,0 0.52945,-0.0883 0.44083,-0.1761 0.44083,-0.17667 0.52945,-0.35278 0.44083,-0.35278 0,0 0.44083,-0.52888 0.35278,-0.52945 0.26473,-0.61722 0.17639,-0.70556 0.0883,-0.61722 0,-0.70555 -0.17667,-1.41111 -0.26444,-1.32306 -0.35278,-1.23472 -0.52917,-1.76389 0,0 -0.44083,-2.11667 -0.6175,-3.61611 -0.26472,-1.94 -0.0881,-1.76389 0,-1.58778 0.0881,-0.61722 0.0883,-0.44111 0,0 0.44111,-0.88167 0.35278,-0.79389 0.88166,-1.5875 0.26473,-0.6175 0.26472,-0.61722 0,-0.52917 -0.0883,-0.26472 -0.17639,-0.17611 0,0 -0.17639,-0.0883 -0.44111,0 -1.58722,0.17639 -2.46945,0.44083 -3.08694,0.70555 -7.67306,1.67584 -8.81944,2.02861 -16.93334,3.96861 -5.99722,1.32306 -2.02833,0.35278 -1.05833,0.1761 0,0 -0.7939,0 -1.05833,0.26473 -1.23444,0.35278 -1.49945,0.44083 -1.5875,0.6175 -1.67583,0.6175 -1.76389,0.88166 -1.763889,0.88223 -1.763889,0.97 -1.587218,1.05833 -1.499446,1.23472 -1.322776,1.23473 -0.617502,0.61722 -0.529167,0.6175 -0.441113,0.70555 -0.352778,0.70556 -0.352778,0.70555 -0.176106,0.70556 -0.176671,0.70556 0,0.7936 0,0 0,1.32306 -0.08805,1.23472 0,0.97 0,0.79389 0.176389,0.52917 0.08834,0.26472 0.176106,0.17611 0.176672,0.17667 0.264442,0.0881 0.705555,0.0881 0,0 0.61722,-0.17611 0.793891,-0.44111 0.969998,-0.61722 1.235005,-0.79389 2.733886,-2.02833 3.086669,-2.38139 3.175,-2.3814 2.91056,-2.20472 1.32277,-0.88194 1.14667,-0.79389 1.05833,-0.52889 0.70556,-0.35277 0,0 1.67555,-0.44112 2.11667,-0.52916 5.11556,-1.05834 4.85055,-0.97028 3.175,-0.52888 0,0 2.99861,-0.35278 2.02862,-0.17667 2.11666,-0.088 2.11667,0 1.85194,0.088 0.79361,0.0883 0.6175,0.17638 0.52917,0.17639 0.35278,0.26445 0,0 0.52916,0.52944 0.61751,0.70556 1.05833,1.49916 0.97,1.41112 0.70555,1.14638 0,0 0.35278,0.44112 0.35278,0.26444 0.44111,0.26472 0.35278,0.17639 0.97,0.26444 1.05833,0.17667 0,0 0.26444,0.0881 0.26473,0.26472 0.17639,0.35278 0.0883,0.52888 0.26444,1.14667 0.0883,1.41111 0.17611,1.32278 0.17667,1.235 0.1761,0.44084 0.17668,0.35277 0.1761,0.26473 0.26473,0.1761 0,0 z"    // palate + upper lip + upper teeth
const D15_TH = "m 122.2375,244.47499 0,0 1.23472,-7.67305 0.97028,-6.17333 0.35278,-2.55778 0.17611,-1.94028 0,0 0,-1.5875 0,-1.76389 -0.26445,-3.43944 -0.0883,-1.58778 0,-1.41112 0.0883,-1.14638 0.0883,-0.44083 0.17611,-0.35278 0,0 0.35277,-0.6175 0.35278,-0.79361 0.79389,-1.94056 0.70556,-1.94 0.44111,-0.88222 0.35278,-0.79361 0,0 0.35278,-0.79361 0.26444,-0.97028 0.52917,-2.38139 0.35277,-1.32278 0.44084,-1.14667 0.26472,-0.52888 0.26472,-0.44112 0.35278,-0.44111 0.35278,-0.35278 0,0 0.70556,-0.44083 1.05833,-0.44083 3.08666,-1.32306 4.05695,-1.5875 4.67416,-1.94027 2.38139,-0.97028 2.29306,-1.14639 2.29305,-1.05833 2.11667,-1.14639 1.94028,-1.14667 1.67555,-1.23472 0.70556,-0.6175 0.6175,-0.52889 0.52917,-0.6175 0.44111,-0.6175 0,0 0.44083,-0.70556 0.35278,-0.70555 0.26472,-0.88167 0.17611,-0.88222 0.17667,-0.88167 0.17611,-0.97028 0.0883,-2.11666 -0.0883,-2.20472 -0.17611,-2.205 -0.26472,-2.38111 -0.35278,-2.29334 -0.88195,-4.40944 -0.79389,-3.7925 -0.35277,-1.67584 -0.17611,-1.32277 -0.0883,-1.05834 0,-0.70555 0,0 0.44112,-1.05834 0.61722,-1.23472 1.41111,-2.46944 0.70555,-1.23473 0.61722,-1.23472 0.52945,-1.05833 0.0881,-0.44083 0.0881,-0.44112 0,0 0,-0.44111 0,-0.44083 -0.17611,-0.44083 -0.0883,-0.44111 -0.52917,-0.88195 -0.70556,-0.88194 -0.7936,-0.70556 -0.88223,-0.61722 -0.52889,-0.26472 -0.44111,-0.17639 -0.52917,-0.0883 -0.52916,-0.088 0,0 -0.26444,0 -0.26473,0.088 -0.26472,0.26473 -0.26445,0.26472 -0.52916,0.70556 -0.44083,0.96999 -0.52945,1.14667 -0.52889,1.32278 -0.88222,2.82222 -0.97,2.91056 -0.88195,2.46944 -0.35277,1.05834 -0.44083,0.88166 -0.35278,0.52945 -0.26473,0.1761 -0.17639,0.0883 0,0 -0.26444,0 -0.26472,-0.0883 -0.0881,-0.26444 -0.0883,-0.44111 -0.0883,-0.44083 0.0883,-0.52917 0.17639,-1.32277 0.52916,-2.64612 0.26445,-1.05833 0.0883,-0.79361 0,0 0,-4.14528 -0.0883,-2.11667 -0.0881,-0.61722 -0.0881,-0.17639 -0.0883,0 0,0 -0.17638,0.17639 -0.35278,0.26444 -0.35278,0.44112 -0.35278,0.61722 -0.35278,0.79389 -0.35277,0.88194 -0.35278,1.05834 -0.35278,1.14638 0,0 -0.26472,1.23501 -0.35278,1.23444 -0.79361,2.38139 -0.6175,2.29305 -0.26444,1.05834 -0.17639,1.05833 0,0 0,1.23472 0,1.5875 0.0881,3.52778 -0.0881,1.76389 -0.17639,1.41111 -0.0883,0.52917 -0.1761,0.44083 -0.17668,0.26472 -0.26444,0.0881 0,0 -0.26444,0 -0.17667,0 -0.26444,-0.0881 -0.26445,-0.17639 -0.17667,-0.26444 -0.26444,-0.26472 -0.35278,-0.79361 -0.26444,-1.14667 -0.17667,-1.41111 -0.0881,-1.76389 0,-2.11667 0,0 0.17639,-2.11666 0.26444,-1.94028 0.35278,-1.85194 0.52944,-1.76389 0.52889,-1.49945 0.6175,-1.49945 0.6175,-1.32277 0.70556,-1.23472 0.79361,-1.05834 0.79361,-0.97028 0.79389,-0.88166 0.79389,-0.70556 0.79361,-0.70555 0.70555,-0.52945 0.70556,-0.35278 0.70555,-0.35278 0,0 0.0881,-0.088 0.0883,-0.17639 -0.0883,-0.26444 -0.0881,-0.26472 -0.52916,-0.79361 -0.79389,-0.97028 -1.05834,-1.05834 -1.41111,-1.14638 -1.67555,-1.14667 -1.94028,-1.14667 -2.29305,-1.14639 -1.14667,-0.52916 -1.32278,-0.44112 -1.32277,-0.44083 -1.41112,-0.35278 -1.49944,-0.35277 -1.49945,-0.26473 -1.67555,-0.17611 -1.5875,-0.17667 -1.76389,-0.0881 -1.76389,0 -1.85194,0.17639 -1.94056,0.17639 -1.94,0.26472 -2.02861,0.44083 0,0 -1.67584,0.44083 -1.67555,0.61751 -1.5875,0.6175 -1.49916,0.79361 -1.32306,0.88194 -1.32306,0.97 -1.23444,1.05833 -1.14667,1.05834 -1.05833,1.14667 -1.05834,1.23472 -0.88194,1.32306 -0.88194,1.32277 -0.7939,1.32278 -0.70555,1.41111 -0.61722,1.41111 -0.61722,1.49945 -0.52945,1.41111 -0.44083,1.49944 -0.352779,1.49917 -0.352778,1.41111 -0.529166,2.91027 -0.352778,2.82223 -0.176389,2.64611 0.08805,2.46945 0.176671,2.20472 0.264443,1.94027 0,0 0.529166,1.67556 0.52917,1.41111 0.61722,1.235 0.70556,1.05834 0.79389,0.96999 0.88194,0.70556 0.88195,0.61722 0.88194,0.44111 0.97028,0.35278 0.97,0.26444 0.88194,0.0883 0.88195,0.0883 0.88194,0 0.88195,-0.0883 0.70555,-0.17639 0.70556,-0.17639 0,0 0.52916,-0.0883 0.17639,0 0,0 -0.0883,0.17667 -0.35278,0.26444 -0.52889,0.35278 -0.79389,0.44111 -0.88194,0.35278 -1.05833,0.35278 -1.14639,0.26444 -1.32306,0.17639 -1.32306,0.0881 -1.32277,-0.0881 -1.32278,-0.26473 -0.70555,-0.1761 -0.61751,-0.26473 -0.6175,-0.35278 -0.617221,-0.44083 -0.61722,-0.44111 -0.617502,-0.52917 0,0 1.234722,2.11667 1.322781,2.29305 1.76389,2.64584 1.05833,1.41111 1.05833,1.32306 1.23501,1.32277 1.23444,1.32278 1.32306,1.14667 1.32305,1.05833 1.32278,0.79389 0.70555,0.35278 0.70556,0.26444 0,0 2.55778,0.97 1.94,0.88223 0.70555,0.44083 0.70556,0.44083 0.52945,0.44111 0.44083,0.44111 0.35277,0.44084 0.26473,0.44083 0.17611,0.44111 0.0883,0.52917 0.17639,0.88194 0,1.05833 0,0 0,0.52917 -0.17639,0.6175 -0.17639,0.61722 -0.35278,0.61722 -0.70555,1.32306 -0.97028,1.49917 -0.88166,1.58778 -0.88223,1.67555 -0.35278,0.79389 -0.35278,0.88166 -0.26444,0.97028 -0.17639,0.88195 0,0 -0.44083,2.73389 -0.79389,4.05722 -2.29305,10.40666 -2.29306,9.87778 -0.88194,3.61612 -0.52917,1.94027 14.11111,0 z" // lower jaw + lower lip + tongue for /θ/ and /ð/
const D11_TH = "m 101.15917,205.66944 0,0 1.58722,-0.6175 1.94056,-0.52889 2.29277,-0.52945 2.38139,-0.35278 2.38139,-0.35277 2.29278,-0.0881 2.02861,0 0.88194,0.0881 0.70556,0.17667 0,0 -0.61722,0.35278 -0.88223,0.26444 -0.88166,0.26444 -1.14667,0.26472 -2.38111,0.44084 -2.46944,0.35277 -2.55778,0.17667 -2.29306,0.17611 -1.94028,0 -1.32277,-0.088 0,0 z" // vocal folds open
const D11_DH = "m 112.09528,205.05194 0,0 -0.26472,-0.0881 -0.35278,0 -0.70556,0.0881 -0.79361,0.17667 -0.79389,0.1761 -0.88194,0.26473 -0.79361,0.17639 -0.79389,0 -0.35278,-0.0883 -0.35278,-0.088 0,0 -0.70555,-0.17639 -0.61722,-0.0883 -0.61751,0.0883 -0.6175,0.0883 -1.14638,0.17611 -0.61751,0 -0.52888,-0.088 0,0 1.14639,-0.52917 0.7936,-0.35278 0.7939,-0.26444 0.88194,-0.26472 0.79361,-0.0881 0.88223,0 0.35277,0.0881 0.35278,0.0881 0,0 0.26444,0.0883 0.35278,0.0883 0.70556,-0.0883 0.70555,-0.0883 0.79389,-0.26444 0.88167,-0.17639 0.79389,-0.17639 0.70555,-0.0883 0.70556,0.0883 0,0 0.61722,0.0883 0.70555,0 0.61751,0 0.6175,-0.17668 1.14638,-0.1761 0.52917,-0.0883 0.35278,0.0883 0,0 -1.05833,0.52888 -1.5875,0.70556 -0.79361,0.26472 -0.79389,0.17639 -0.70556,0 -0.35278,0 -0.26444,-0.0883 0,0 z" // vocal folds vibrating

// Soft cutaway window (diagram mm): lips, nose and chin stay photo; palate, teeth, tongue, cavity show through.
// The big shape gets a wide vignette fade; FRONT_MM (teeth, tongue tip, lip opening) gets a tighter fade so it stays crisp.
const WINDOW_MM = 'M 154 114 C 147 109, 134 107.5, 118 110.5 C 104 113.5, 94 121, 90 135 C 85 147, 83 162, 88 177 C 95 190, 114 193, 132 188 C 145 184, 152 178, 154 170 C 155.5 160, 155.5 145, 155.5 130 C 155.5 124, 155 117, 154 114 Z'
const FRONT_MM = 'M 155.5 128 C 150 126, 144 127.5, 141 132 C 139 136.5, 139 141.5, 141 146.5 C 143 151, 150 152, 155.5 150 Z'
const WINDOW_BLUR = 12, FRONT_BLUR = 4.5
// the vignette's fade is clipped (softly) so it never spills onto the lips (x ≥ LIMIT_X) or up onto the nose (y ≤ LIMIT_Y)
const LIMIT_X = 156.5, LIMIT_Y = 103, LIMIT_BLUR = 2.2

const PIVOT = [100, 112] // jaw joint
const JAW_CLOSE = 3.2    // degrees the jaw closes at rest
// At hold the jaw opens SOUNDS[s].jawOpen degrees further than the Wikimedia drawing (e.g. 2° for /θ/, so the incisor
// gap is ~6 mm and the protruding tongue can be a plump blade; 5° for the open vowel /æ/).

// Raise the palate vault (mm). Smooth field: full strength under the vault (x 120–140, y 104–124), zero at the
// teeth (y ≥ 129), the lips (x ≥ 152) and the velum root (x ≤ 106). Applied to the palate shape only.
const PALATE_RAISE = 3.5
function palateLift(q) {
  const [x, y] = q
  const wx = ss((x - 106) / 14) * (1 - ss((x - 140) / 12))
  const wy = ss((y - 96) / 8) * (1 - ss((y - 124) / 5))
  return [x, y - PALATE_RAISE * wx * wy]
}

// Gingiva (mm): a soft pink band over the alveolar ridge whose margin laps 1 mm onto each crown.
const UPPER_GUM = [[146.4, 124.5], [155.2, 124.5], [155.2, 129.6], [154.4, 131.2], [153.4, 131.0], [150.9, 130.3], [148.2, 130.9], [147.0, 131.0], [146.4, 129.0]]
const LOWER_GUM = [[148.0, 144.2], [148.9, 144.6], [150.8, 145.5], [153.2, 147.0], [154.6, 147.2], [154.6, 151.5], [146.9, 150.0]]
// upper gum colour fades out upward from y≈131 to y≈125; lower gum fades downward from y≈145 to y≈151

function parsePath(d) {
  const tok = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g)
  const pts = []
  let cmd = null, x = 0, y = 0, i = 0
  while (i < tok.length) {
    if (/[a-zA-Z]/.test(tok[i])) { cmd = tok[i++]; if (cmd === 'z' || cmd === 'Z') continue }
    const a = parseFloat(tok[i]), b = parseFloat(tok[i + 1]); i += 2
    if (cmd === 'm') { x += a; y += b; cmd = 'l' }
    else if (cmd === 'M') { x = a; y = b; cmd = 'L' }
    else if (cmd === 'l') { x += a; y += b }
    else if (cmd === 'L') { x = a; y = b }
    const q = pts[pts.length - 1]
    if (!q || Math.abs(q[0] - x) > 1e-6 || Math.abs(q[1] - y) > 1e-6) pts.push([x, y])
  }
  return pts
}
const P = parsePath(D15_TH)   // 290 points

// Child-friendly incisors (diagram mm). The Wikimedia teeth are tapered cross-sections ("shark teeth");
// these are short crowns with flat, rounded biting edges at the same positions, kept clear of the tongue at hold.
// Upper: lingual gum → lingual face → biting edge (y 137) → labial face → labial gum. Replaces D13 points 0–8.
// Labial faces reach the inner surface of the lips (upper lip inner face ≈ x 154, lower ≈ x 153.3), so lip and tooth touch.
const UPPER_TOOTH = [[147.7, 129.7], [148.7, 133.2], [149.6, 136.3], [149.95, 136.85], [150.4, 137.05], [153.0, 137.05], [153.55, 136.7], [153.85, 135.9], [153.95, 130.0]]
// Lower: lingual gum (= P[116], start of the floor of the mouth) → biting edge (y 141.5) → labial face → labial gum. Replaces P 86–115.
const LOWER_TOOTH = [[148.17, 144.64], [148.55, 142.3], [148.85, 141.6], [149.3, 141.45], [152.5, 141.45], [153.0, 141.7], [153.25, 142.4], [153.4, 148.0]]
// Upper outline with the incisor replaced; the thin lip-to-gum slit (original points 9–21) is closed so the lip
// rests against the tooth. Lower: the lip meets the tooth here (closes the pocket between lip and tooth).
// Original D13 (146 pts): 0–7 tapered incisor, labial · 8–19 lip-to-gum slit · 20 lip bottom-front corner · 20–75 lip,
// nose base, nasal floor, velum (nasal side) · 76–100 uvula · 100–~130 oral surface of velum + palate + ridge · ~131–145 incisor, lingual.
const _D13 = parsePath(D13)
const _RIDGE_END = _D13.findIndex((q, k) => k > 110 && q[0] > 147.1)   // where the old spike's back face begins
const P13 = UPPER_TOOTH.slice(0, 8).concat(_D13.slice(20, _RIDGE_END)).map(palateLift)
const LOWER_LIP_MEETS_TOOTH = [153.26, 142.6]
const _SH = 8 - 20                                           // original index → P13 index
const PALATE_STROKE_A = 76 + _SH, PALATE_STROKE_B = P13.length - 1   // outline drawn: uvula → palate → ridge (no nasal-floor line)
// portrait mode: tissue behind/above the palate (maxilla, nasal floor) so the diagram's nasal-cavity hole never shows
// the dark cavity tone inside the window (the vignette limiter keeps it off the nose/lips)
const MAXILLA_FILL = P13.slice(100 + _SH).concat([[162, 118], [162, 60], [78, 60], [78, 128], [96, 128]])  // uvula → ridge → up & around
// Oral cavity (portrait): one smooth oval (mm) around the tongue, its long axis running from the mouth opening
// down and back toward the throat (rotate(−deg): the +x semi-axis points up-right, to the teeth). Inside it no tissue
// is drawn and the dark tone shows; outside it is plain tissue. Teeth, gums and the tongue are drawn on top.
// Each sound has its own oval (SOUNDS[s].oval) so the dark roof reaches wherever that sound's tongue has to go
// (the ridge for /t/, the velum for /k/), and its own lip opening (SOUNDS[s].front): the dark gap between the
// incisors / lips in front of the oval, so the tip comes out through darkness rather than skin-coloured tissue.
// The tongue is drawn inside a slightly smaller copy of the oval (so its root melts into the dark at the throat end)
// plus the mouth opening in front (x ≥ TONGUE_FRONT_X, y in TONGUE_FRONT_Y), where the tip comes out between the teeth.
const TONGUE_OVAL_INSET = 0.6, TONGUE_OVAL_FEATHER = 1.6
const TONGUE_FRONT_X = 140, TONGUE_FRONT_Y = [121, 156]

// ---------- tongue: a smooth, child-friendly silhouette (closed Catmull-Rom spline, mm) ----------
// Every posture has the same 21 points, so any two can be interpolated. Order: 0 tip → 1–8 dorsum (backward) →
// 9–12 root (slopes down and back into the throat, fading out at the oval's end) → 13–14 hidden bottom →
// 15–20 underside (forward) → tip.
// Landmarks (mm): upper incisor lingual face (147.7,129.7)→(149.6,136.3), biting edge y 137.05 · alveolar ridge
// (147,129)→(145.5,127.5)→(143.8,123) · hard palate vault y ≈ 118.3 (x 128–137) · velum (113,124)→(108.4,127.5)→
// (104,130.6) · lower incisor edge y 141.45 (x 149.3–152.5) and lingual gum (148.2,144.6) with the jaw at the drawing's
// position; the jaw rotates about PIVOT (100,112), +1° ≈ +0.85 mm at the incisors.
const TONGUE_REST = [
  [147.9, 139.0], [146.4, 137.0], [143.8, 135.2], [140.3, 133.0], [136.0, 130.9], [131.0, 129.6], [125.5, 129.9],
  [120.0, 131.9], [115.5, 135.8], [111.0, 141.0], [106.5, 147.5], [102.5, 155.0], [99.5, 162.0], [100.5, 169.5],
  [107.0, 171.5], [117.0, 167.0], [126.5, 160.5], [135.0, 153.5], [142.0, 147.0], [145.6, 142.8], [147.4, 141.0],
]
// /θ/ /ð/: jaw +2°, the blade passes between the incisors (gap y 137.05–143.15) ~5 mm thick, both teeth visible, and
// the rounded tip reaches x 158.6 — about 5 mm past the teeth, between the lips.
const HOLD_TH = [
  [158.6, 140.2], [156.6, 138.0], [152.5, 137.5], [147.8, 136.6], [142.5, 134.4], [136.0, 132.7], [129.0, 132.3],
  [122.0, 134.0], [116.5, 137.5], [111.0, 142.5], [106.0, 148.5], [102.0, 155.5], [99.5, 162.0], [100.5, 169.5],
  [107.0, 171.5], [117.5, 167.0], [127.0, 160.0], [135.5, 153.0], [143.0, 147.5], [150.0, 143.0], [156.0, 142.7],
]
// /t/: jaw +1°. Tip–blade raised and pressed on the alveolar ridge just behind the upper incisors (seal at
// (146.4,128.6)); the front of the tongue is a short column rising from behind the lower teeth; dorsum relaxed.
const HOLD_T = [
  [146.4, 128.6], [143.6, 128.6], [140.3, 129.9], [136.5, 131.0], [132.0, 131.6], [127.5, 132.3], [123.0, 133.8],
  [118.5, 136.5], [114.5, 140.5], [110.5, 145.5], [106.5, 151.0], [103.0, 157.5], [99.5, 163.0], [100.5, 169.5],
  [107.0, 171.5], [117.0, 167.0], [126.5, 160.5], [135.0, 153.5], [141.5, 147.0], [145.5, 140.5], [148.0, 134.0],
]
// /k/: jaw +2.5°. Tip stays down behind the lower incisors; the back of the tongue humps up and seals against the
// roof of the cavity (points 6–9 lie 0.4 mm inside CAVITY_OVAL's roof, x 109–121, so the seal is on the dark roof).
const HOLD_K = [
  [145.8, 145.0], [144.0, 142.4], [140.3, 138.3], [136.5, 133.6], [131.5, 128.6], [126.0, 124.6], [121.1, 125.7],
  [117.3, 127.5], [113.7, 129.6], [108.8, 133.3], [104.5, 139.5], [102.0, 148.0], [100.0, 157.0], [100.5, 166.0],
  [107.0, 170.0], [117.0, 166.5], [126.5, 160.0], [134.5, 153.5], [138.5, 151.0], [142.0, 148.8], [144.6, 147.2],
]
// /ɹ/: jaw +2.5°. Tip curled up and back toward the post-alveolar palate, NOT touching (≈3 mm of dark above it);
// body bunched and pulled back, root retracted toward the throat.
const HOLD_R = [
  [142.0, 125.9], [139.5, 127.0], [136.0, 128.3], [132.5, 128.3], [128.0, 128.5], [123.5, 129.8], [119.0, 132.3],
  [114.5, 136.0], [110.5, 140.5], [106.5, 146.0], [103.0, 152.5], [100.5, 159.0], [98.8, 164.8], [100.0, 171.0],
  [107.0, 172.0], [117.0, 168.0], [126.5, 162.0], [135.0, 156.0], [141.5, 149.0], [145.2, 139.0], [144.5, 129.2],
]
// /æ/: jaw +5° (mouth open). Tongue low and forward: tip behind the lower incisors, dorsum flat and low, leaving a
// big open space under the palate.
const HOLD_AE = [
  [144.3, 148.0], [142.5, 145.5], [139.5, 142.5], [135.5, 140.0], [130.5, 138.6], [125.0, 138.5], [119.5, 139.8],
  [114.5, 142.5], [110.5, 146.5], [107.0, 151.5], [104.0, 157.0], [101.5, 162.5], [100.6, 167.1], [101.5, 175.0],
  [109.0, 177.0], [119.2, 171.6], [128.5, 167.5], [136.0, 161.0], [141.5, 155.5], [144.0, 151.5], [144.8, 149.7],
]
const TONGUE_FRONT_IDX = new Set([0, 1, 2, 3, 18, 19, 20])  // blade/tip: lag a little, so the teeth part before the tip moves
const TONGUE_HI_RANGE = [1, 8]                                // moist highlight runs along the blade and dorsum between these points
const TONGUE_HI_INSET = 1.4

// ---------- per-sound configuration ----------
// timing (seconds) matches the 3 s audio clips (syllable centred at 1.5 s): moveStart → reach (posture reached) →
// holdEnd → rest; soundOn/soundOff bracket the audible part. Stops (kind 'stop') seal at `reach`, pop open at
// `release` (the burst) to the half-way posture `released`, then relax from holdEnd. steps[] are the 4 captions.
const T_TH = { moveStart: 1.05, reach: 1.28, holdEnd: 2.2, rest: 2.6, soundOn: 1.3, soundOff: 1.7, end: 2.7 }
const T_STOP = { moveStart: 0.98, reach: 1.2, release: 1.37, holdEnd: 1.85, rest: 2.25, soundOn: 1.376, soundOff: 1.62, end: 2.7 }
// One dark oral cavity for every sound (the /θ/ one), so the inside of the mouth never changes shape or place
// between sounds; the holds are fitted to it (the /k/ hump seals on its roof). Only the small lip opening in
// front (`front`) differs, following how far the jaw opens.
const CAVITY_OVAL = { cx: 124, cy: 147.5, a: 31, b: 21, deg: 36 }
export const SOUNDS = {
  'θ': {
    voiced: false, word: 'think', hint: 'Blow air softly over the tongue.', kind: 'hold', hold: HOLD_TH, jawOpen: 2,
    oval: CAVITY_OVAL, front: { cx: 154.5, cy: 140, rx: 6.5, ry: 3.4 }, timing: T_TH,
    steps: [['Ready', 'Mouth relaxed, tongue inside.'], ['Peek', 'Tongue tip slides out between the teeth.'], ['Blow', 'Blow air softly over the tongue.'], ['Back', 'Tongue goes back inside.']],
  },
  'ð': {
    voiced: true, word: 'this', hint: 'Hum! Feel the buzz in your throat.', kind: 'hold', hold: HOLD_TH, jawOpen: 2,
    oval: CAVITY_OVAL, front: { cx: 154.5, cy: 140, rx: 6.5, ry: 3.4 }, timing: T_TH,
    steps: [['Ready', 'Mouth relaxed, tongue inside.'], ['Peek', 'Tongue tip slides out between the teeth.'], ['Buzz', 'Hum! Feel the buzz in your throat.'], ['Back', 'Tongue goes back inside.']],
  },
  'ɹ': {
    voiced: true, word: 'red', hint: 'Curl the tip up — don’t let it touch!', kind: 'hold', hold: HOLD_R, jawOpen: 2.5,
    oval: CAVITY_OVAL, front: { cx: 154.5, cy: 140.3, rx: 6.5, ry: 3.6 },
    timing: { moveStart: 0.9, reach: 1.14, holdEnd: 1.95, rest: 2.35, soundOn: 1.16, soundOff: 1.84, end: 2.7 },
    steps: [['Ready', 'Mouth relaxed, tongue inside.'], ['Curl', 'Tip curls up and back; the tongue bunches up.'], ['Hum', 'Say “rrr” — the tip touches nothing.'], ['Back', 'Tongue relaxes.']],
  },
  'k': {
    voiced: false, word: 'cat', hint: 'Back of the tongue pops off the roof.', kind: 'stop', hold: HOLD_K, jawOpen: 2.5, released: 0.45,
    oval: CAVITY_OVAL, front: { cx: 154.5, cy: 140.3, rx: 6.5, ry: 3.6 }, timing: T_STOP,
    steps: [['Ready', 'Mouth relaxed, tongue inside.'], ['Lift', 'Back of the tongue lifts up to the roof.'], ['Pop!', 'Air bursts out as it lets go.'], ['Back', 'Tongue relaxes.']],
  },
  'æ': {
    voiced: true, word: 'cat', hint: 'Open wide, tongue low and flat.', kind: 'hold', hold: HOLD_AE, jawOpen: 5,
    oval: CAVITY_OVAL, front: { cx: 154.5, cy: 141.3, rx: 6.5, ry: 4.6 },
    timing: { moveStart: 0.95, reach: 1.2, holdEnd: 1.9, rest: 2.3, soundOn: 1.22, soundOff: 1.78, end: 2.7 },
    steps: [['Ready', 'Mouth relaxed, tongue inside.'], ['Open', 'Jaw drops; the tongue lies low and forward.'], ['Say “a”', 'Voice on — like “apple”.'], ['Back', 'Mouth closes.']],
  },
  't': {
    voiced: false, word: 'top', hint: 'Tip taps the bump behind the top teeth.', kind: 'stop', hold: HOLD_T, jawOpen: 1, released: 0.45,
    oval: CAVITY_OVAL, front: { cx: 154.5, cy: 139.7, rx: 6.5, ry: 2.8 }, timing: T_STOP,
    steps: [['Ready', 'Mouth relaxed, tongue inside.'], ['Tip up', 'Tongue tip presses the ridge behind the top teeth.'], ['Tap!', 'Air pops out as the tip lets go.'], ['Back', 'Tongue relaxes.']],
  },
}
/** Default timeline (/θ/); use SOUNDS[s].timing for other sounds. */
export const TIMING = T_TH
/** Catmull-Rom spline through pts as cubic Béziers (closed or open). */
function spline(pts, closed) {
  const n = pts.length, at = (k) => pts[closed ? (k + n) % n : Math.min(n - 1, Math.max(0, k))]
  let d = 'M' + f(pts[0][0]) + ',' + f(pts[0][1])
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2)
    d += 'C' + f(p1[0] + (p2[0] - p0[0]) / 6) + ',' + f(p1[1] + (p2[1] - p0[1]) / 6)
      + ' ' + f(p2[0] - (p3[0] - p1[0]) / 6) + ',' + f(p2[1] - (p3[1] - p1[1]) / 6)
      + ' ' + f(p2[0]) + ',' + f(p2[1])
  }
  return d + (closed ? 'Z' : '')
}
/** Tongue control points at progress p toward `hold` (the blade lags the body slightly). */
function tonguePts(p, hold) {
  const pf = ss((p - 0.1) / 0.9)
  return TONGUE_REST.map((r, k) => {
    const h = hold[k], u = TONGUE_FRONT_IDX.has(k) ? pf : p
    return [r[0] + (h[0] - r[0]) * u, r[1] + (h[1] - r[1]) * u]
  })
}
/** Highlight line: dorsum points pushed inward (toward the tongue's body) by TONGUE_HI_INSET. */
function tongueHiPts(pts) {
  const [a, b] = TONGUE_HI_RANGE, out = []
  for (let k = a; k <= b; k++) {
    const t = [pts[k + 1][0] - pts[k - 1][0], pts[k + 1][1] - pts[k - 1][1]], l = Math.hypot(t[0], t[1]) || 1
    let n = [t[1] / l, -t[0] / l]
    if (n[1] < 0) n = [-n[0], -n[1]]
    out.push([pts[k][0] + n[0] * TONGUE_HI_INSET, pts[k][1] + n[1] * TONGUE_HI_INSET])
  }
  return out
}

// Index map of P (290 pts): 0–29 neck · 30–85 chin, lower lip (85 = lip inner surface at y 142.7) · 86–115 original tapered
// lower incisor + root (replaced by LOWER_TOOTH) · 116–139 floor of mouth · 140–161 tongue underside · 162 tip
// · 163–195 dorsum · 196–211 root · 212–229 valleculae/epiglottis · 230–289 pharynx/neck
// The drawing's tongue (150–229) is not drawn: the jaw outline skips from the floor of the mouth to the pharynx and
// the spline tongue above is drawn instead, in both styles.
const TONGUE_A = 150, TONGUE_B = 229

function ss(u) { u = Math.min(1, Math.max(0, u)); return u * u * (3 - 2 * u) } // smoothstep (hoisted; used above)
function jawW(i) {
  if (i < 20) return 0
  if (i < 32) return ss((i - 20) / 12)
  if (i <= 139) return 1
  if (i < 190) return 1 - ss((i - 140) / 50)
  return 0
}
// Rest = proper resting posture: tip tucked behind the upper teeth, dorsum raised to rest along the (raised) palate
// with ~1.5–2.5 mm clearance. Hold (p = 1) is the untouched Wikimedia /θ/ shape.
// Smooth displacement field (no kinks): tip pulled back 4 mm, underside relaxed down 3 mm, dorsum (idx 165–189)
// lifted up to 9 mm. Clearance to the raised palate stays 1.3–4.7 mm along the dorsum.
function restD(i) {
  const dx = -4.0 * ss((i - 133) / 22) * (1 - ss((i - 164) / 14))
  const under = ss((i - 137) / 10) * (1 - ss((i - 153) / 10))
  const dorsum = ss((i - 159) / 12) * (1 - ss((i - 179) / 16))
  return [dx, 3.0 * under - 9.0 * dorsum]
}
// small mid-motion lift of the underside so it clears the lower teeth while sliding forward
const LIFT_D = [[143,0,0],[153,0,-0.8],[161,0,-0.5],[167,0,0]]
function interp(tab, i) {
  if (i <= tab[0][0] || i >= tab[tab.length - 1][0]) return [0, 0]
  for (let k = 1; k < tab.length; k++) {
    if (i <= tab[k][0]) {
      const a = tab[k - 1], b = tab[k], u = (i - a[0]) / (b[0] - a[0])
      return [a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]
    }
  }
  return [0, 0]
}
function rot(p, deg) {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a)
  const dx = p[0] - PIVOT[0], dy = p[1] - PIVOT[1]
  return [PIVOT[0] + dx * c - dy * s, PIVOT[1] + dx * s + dy * c]
}
/** Jaw angle at progress p: closed by JAW_CLOSE at rest, open by `open` degrees beyond the drawing at hold. */
const jawAngle = (p, open) => open * p - JAW_CLOSE * (1 - p)
/** Lower-shape point i at tongue progress p (0 = rest, 1 = /θ/ = the Wikimedia drawing). */
function pt(i, p, open = 0) {
  const q = rot(P[i], jawAngle(p, open) * jawW(i))
  const r = restD(i), l = interp(LIFT_D, i), s = Math.sin(Math.PI * Math.pow(p, 0.8))
  return [q[0] + r[0] * (1 - p) + l[0] * s, q[1] + r[1] * (1 - p) + l[1] * s]
}
const f = (n) => n.toFixed(2)
const poly = (pts, close) => 'M' + pts.map((q) => f(q[0]) + ',' + f(q[1])).join('L') + (close ? 'Z' : '')

/** Tongue progress 0 (rest) → 1 (the sound's posture) at time t. Stops pop open at `release` to `released`. */
export function progressAt(t, sound = 'θ') {
  const c = SOUNDS[sound] || SOUNDS['θ'], T = c.timing
  if (t <= T.moveStart) return 0
  if (t < T.reach) return ss((t - T.moveStart) / (T.reach - T.moveStart))
  let top = 1, from = T.holdEnd
  if (c.kind === 'stop') {
    const relEnd = T.release + 0.1, after = c.released
    if (t <= T.release) return 1
    if (t < relEnd) return 1 - (1 - after) * ss((t - T.release) / (relEnd - T.release))
    top = after
  }
  if (t <= from) return top
  if (t < T.rest) return top * (1 - ss((t - from) / (T.rest - from)))
  return 0
}
/** 0 ready · 1 tongue moves into position · 2 sound (blow / buzz / pop) · 3 back */
export function stepAt(t, sound = 'θ') {
  const c = SOUNDS[sound] || SOUNDS['θ'], T = c.timing
  if (t < T.moveStart) return 0
  if (t < T.soundOn) return 1
  if (t < (c.kind === 'stop' ? T.soundOff : T.holdEnd)) return 2
  return 3
}

const NS = 'http://www.w3.org/2000/svg'
function el(name, attrs = {}, parent) {
  const e = document.createElementNS(NS, name)
  for (const k in attrs) e.setAttribute(k, attrs[k])
  if (parent) parent.appendChild(e)
  return e
}

/**
 * @param {HTMLElement} container
 * @param {object} [options]
 * @param {'θ'|'ð'|'ɹ'|'k'|'æ'|'t'} [options.sound]
 * @param {Record<string,string>} [options.audio]   sound → audio URL (3 s clips)
 * @param {HTMLAudioElement} [options.audioElement] element to play through (pass one unlocked by a tap on iOS)
 * @param {object|null} [options.portrait]          PORTRAIT_GIRL-style preset, or null for the flat diagram
 * @param {object} [options.theme]                  colour overrides
 * @param {(t:number)=>void} [options.onTime]
 * @param {()=>void} [options.onEnd]
 */
export function createThSideview(container, options = {}) {
  const portrait = options.portrait === undefined ? null : options.portrait
  const theme = Object.assign({}, portrait ? THEME_WARM : THEME_FLAT, options.theme || {})
  const audioMap = options.audio || {}
  let sound = options.sound && SOUNDS[options.sound] ? options.sound : 'θ'
  const cfg = () => SOUNDS[sound]
  // every oval / lip-opening ellipse, re-pointed at the current sound's geometry by applySound()
  const ovalEls = [], frontEls = []
  const ovalRotOf = (E) => `rotate(${-E.deg} ${E.cx} ${E.cy})`
  const ovalEl = (parent, inset, attrs) => {
    const E = cfg().oval
    const e = el('ellipse', Object.assign({ cx: E.cx, cy: E.cy, rx: E.a - inset, ry: E.b - inset, transform: ovalRotOf(E) }, attrs), parent)
    ovalEls.push([e, inset])
    return e
  }
  const frontEl = (parent, attrs) => {
    const F = cfg().front
    const e = el('ellipse', Object.assign({ cx: F.cx, cy: F.cy, rx: F.rx, ry: F.ry }, attrs), parent)
    frontEls.push(e)
    return e
  }
  function applySound() {
    const E = cfg().oval, F = cfg().front
    ovalEls.forEach(([e, inset]) => { e.setAttribute('cx', E.cx); e.setAttribute('cy', E.cy); e.setAttribute('rx', E.a - inset); e.setAttribute('ry', E.b - inset); e.setAttribute('transform', ovalRotOf(E)) })
    frontEls.forEach((e) => { e.setAttribute('cx', F.cx); e.setAttribute('cy', F.cy); e.setAttribute('rx', F.rx); e.setAttribute('ry', F.ry) })
  }

  // ---------- SVG scaffold ----------
  const svg = el('svg', { xmlns: NS, role: 'img', 'aria-label': 'Side view of the mouth showing the tongue and teeth' })
  svg.style.display = 'block'
  svg.style.width = '100%'
  svg.style.height = 'auto'
  const defs = el('defs', {}, svg)
  const uid = 'th' + Math.random().toString(36).slice(2, 8)

  // positions in diagram mm unless a portrait overrides
  const unit = portrait ? portrait.anchor.scale : 1
  const toImg = (x, y) => {
    if (!portrait) return [x, y]
    const s = portrait.anchor.scale, [mx, my] = portrait.anchor.mm, [px, py] = portrait.anchor.px
    return [s * (x - mx) + px, s * (y - my) + py]
  }
  const jawCfg = portrait && portrait.jaw ? portrait.jaw : null
  const newMask = (id) => el('mask', { id, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: portrait.width, height: portrait.height }, defs)
  const blurFilter = (id, sd) => { const f0 = el('filter', { id, x: '-60%', y: '-60%', width: '220%', height: '220%' }, defs); el('feGaussianBlur', { stdDeviation: sd }, f0) }
  const fullRect = (fill, parent) => el('rect', { x: 0, y: 0, width: portrait.width, height: portrait.height, fill }, parent)

  let diagramTransform = ''
  if (portrait) {
    const [vx, vy, vw, vh] = portrait.view || [0, 0, portrait.width, portrait.height]
    svg.setAttribute('viewBox', `${vx} ${vy} ${vw} ${vh}`)
    const s = portrait.anchor.scale, [mx, my] = portrait.anchor.mm, [px, py] = portrait.anchor.px
    diagramTransform = `matrix(${s} 0 0 ${s} ${px - s * mx} ${py - s * my})`
    blurFilter(uid + 'blur', WINDOW_BLUR)
    blurFilter(uid + 'blurF', FRONT_BLUR)
    blurFilter(uid + 'blurL', LIMIT_BLUR)
    // limiter: white everywhere except (softly) over the lips (x ≥ LIMIT_X) and the nose (y ≤ LIMIT_Y)
    const limit = newMask(uid + 'limit')
    fullRect('#fff', limit)
    el('rect', { x: LIMIT_X, y: -500, width: 500, height: 1500, transform: diagramTransform, fill: '#000', filter: `url(#${uid}blurL)` }, limit)
    el('rect', { x: -500, y: -500, width: 1500, height: 500 + LIMIT_Y, transform: diagramTransform, fill: '#000', filter: `url(#${uid}blurF)` }, limit)
    const imgAttrs = { href: portrait.src, x: 0, y: 0, width: portrait.width, height: portrait.height, preserveAspectRatio: 'none' }
    if (jawCfg) {
      // backdrop + the photo WITHOUT its lower lip / chin (that piece is drawn later, on top, and rotates)
      fullRect(jawCfg.bg, svg)
      const front = jawCfg.seam[0], H = portrait.height + 200, W = portrait.width
      const hold = newMask(uid + 'static')
      fullRect('#fff', hold)
      el('path', { d: poly([[front[0] - 9, front[1] + 0.3], front, [W, front[1]], [W, H], [front[0] - 9, H]], true), fill: '#000' }, hold)
      el('image', Object.assign({ mask: `url(#${uid}static)` }, imgAttrs), svg)
    } else el('image', imgAttrs, svg)

    // soft-edged cutaway window: wide vignette + crisp mouth-front region (union of the two feathered shapes)
    const mask = newMask(uid + 'mask')
    windowShapes(mask, '#fff')
  } else {
    svg.setAttribute('viewBox', '0 0 186 222')
  }
  function windowShapes(parent, fill) {
    // the feathered shapes are themselves masked by the limiter so the fade never spills onto the lips / nose
    const g = el('g', { mask: `url(#${uid}limit)` }, parent)
    el('path', { d: WINDOW_MM, transform: diagramTransform, fill, filter: `url(#${uid}blur)` }, g)
    el('path', { d: FRONT_MM, transform: diagramTransform, fill, filter: `url(#${uid}blurF)` }, g)
  }

  // Portrait layer order: photo → mouth opening (dark wedge between the lips) → rotating lower-lip piece → cutaway
  // stage. The stage is on top, so inside the window the x-ray tissue sits over the *moving* lip, and along the
  // window's feathered edge the two simply crossfade — nothing else shows through.
  const gap = jawCfg ? el('g', {}, svg) : null
  const lipLayer = jawCfg ? el('g', {}, svg) : null
  const stage = el('g', portrait ? { mask: `url(#${uid}mask)` } : {}, svg)
  let cavG = null
  if (portrait) {
    // Warm cavity tone inside the oral ellipse; tissue everywhere else. The two masks are complementary copies of the
    // same feathered ellipse, so the dark tone melts softly into the tissue instead of ending in a hard line.
    // Both masked groups sit inside diagramTransform, so the mask content is in diagram mm (no transform here).
    blurFilter(uid + 'blurC', CAVITY_FEATHER)
    const mmMask = (id, bg) => {
      const m = el('mask', { id, maskUnits: 'userSpaceOnUse', x: -300, y: -300, width: 1200, height: 1200 }, defs)
      el('rect', { x: -300, y: -300, width: 1200, height: 1200, fill: bg }, m)
      return m
    }
    const cavityShape = (id, bg, fg) => {
      const g = el('g', { fill: fg, filter: `url(#${uid}blurC)` }, mmMask(id, bg))   // oval + lip opening, feathered as one
      ovalEl(g, 0, {})
      frontEl(g, {})
    }
    cavityShape(uid + 'cav', '#000', '#fff')
    cavityShape(uid + 'tissue', '#fff', '#000')
    // The tongue fades out just inside the cavity edge, so where its root leaves the picture it sinks into the dark
    // rather than ending on the skin; the front strip lets the tip out between the teeth.
    blurFilter(uid + 'blurT', TONGUE_OVAL_FEATHER)
    const tonW = el('g', { fill: '#fff', filter: `url(#${uid}blurT)` }, mmMask(uid + 'tongueM', '#000'))
    ovalEl(tonW, TONGUE_OVAL_INSET, {})
    el('rect', { x: TONGUE_FRONT_X, y: TONGUE_FRONT_Y[0], width: 60, height: TONGUE_FRONT_Y[1] - TONGUE_FRONT_Y[0] }, tonW)
    cavG = el('g', { transform: diagramTransform, mask: `url(#${uid}cav)` }, stage)   // rect added below, once gradients exist
  }
  const dg = el('g', { transform: diagramTransform, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, stage)
  const lw = theme.lineWidth
  // soft tissue ("x-ray"): slightly translucent so the child's cheek stays faintly visible through the cross-section.
  // The translucency is a *group* opacity on a wrapper, so the overlapping tissue shapes composite as one flat sheet
  // (per-shape fill-opacity would stack where shapes overlap and print their outlines as boxes). In portrait mode the
  // tissue is masked out of the oral ellipse.
  const bodyWrap = el('g', portrait ? { opacity: theme.tissueOpacity, mask: `url(#${uid}tissue)` } : {}, dg)
  const bodyG = el('g', { fill: theme.body, stroke: theme.line, 'stroke-width': lw, 'stroke-opacity': portrait ? 0.7 : 1 }, bodyWrap)

  // gradients (diagram mm, userSpaceOnUse so they stay put while shapes move)
  const grad = (id, y1, y2, stops) => {
    const g = el('linearGradient', { id: uid + id, gradientUnits: 'userSpaceOnUse', x1: 0, y1, x2: 0, y2 }, defs)
    stops.forEach(([o, c, a]) => el('stop', { offset: o, 'stop-color': c, 'stop-opacity': a === undefined ? 1 : a }, g))
    return `url(#${uid}${id})`
  }
  const rgrad = (id, cx, cy, r, stops) => {
    const g = el('radialGradient', { id: uid + id, gradientUnits: 'userSpaceOnUse', cx, cy, r }, defs)
    stops.forEach(([o, c, a]) => el('stop', { offset: o, 'stop-color': c, 'stop-opacity': a === undefined ? 1 : a }, g))
    return g
  }
  const url = (g) => `url(#${g.getAttribute('id')})`
  // tongue body: lit from the front-top like the rest of the scene — a radial fall-off from a bright patch on the
  // front of the dorsum to the darker tone at the root and underside (portrait); flat style keeps its simple ramp
  const tongueFill = portrait
    ? url(rgrad('tongueR', 139, 136, 44, [[0, theme.tongueTop], [0.3, theme.tongueTop], [0.62, theme.tongue], [1, theme.tongueBottom]]))
    : grad('tongueG', 118, 172, [[0, theme.tongueTop], [0.45, theme.tongue], [1, theme.tongueBottom]])
  // underside / core shadow: transparent on top, darkening down across the body (direction ≈ the oval's short axis)
  const tongueShadeG = el('linearGradient', { id: uid + 'tongueShade', gradientUnits: 'userSpaceOnUse', x1: 134, y1: 130, x2: 118, y2: 170 }, defs)
  el('stop', { offset: 0.35, 'stop-color': theme.tongueLine, 'stop-opacity': 0 }, tongueShadeG)
  el('stop', { offset: 1, 'stop-color': theme.tongueLine, 'stop-opacity': 0.5 }, tongueShadeG)
  // enamel: brightest at the labial-incisal corner (toward the lips), shading to toothDeep at the gum / lingual side,
  // so the crowns read as rounded solids. The lower tooth's gradient follows the jaw (gradientTransform per frame).
  const toothStops = [[0, theme.toothEdge], [0.4, theme.tooth], [0.75, theme.toothTop], [1, theme.toothDeep]]
  const toothUFill = url(rgrad('toothUR', 152.9, 135.6, 7.5, toothStops))
  const toothLGrad = rgrad('toothLR', 152.3, 143.0, 7.5, toothStops)
  const toothLFill = url(toothLGrad)
  const gumUFill = grad('gumUG', 131.2, 124.8, [[0, theme.gum, 0.95], [0.55, theme.gum, 0.55], [1, theme.gum, 0]])
  const gumLFill = grad('gumLG', 144.4, 151.2, [[0, theme.gum, 0.95], [0.55, theme.gum, 0.55], [1, theme.gum, 0]])
  let tongueShadow = null
  if (cavG) {
    // 1. light enters at the lips: rosy near the opening, falling off to the deep tone at the throat end of the oval
    const cavityFill = url(rgrad('cavityR', 151, 137, 64, [[0, theme.cavityTop], [0.32, theme.cavity], [1, theme.cavityDeep]]))
    el('rect', { x: -300, y: -300, width: 800, height: 900, fill: cavityFill }, cavG)
    // 2. ambient occlusion along the walls: a wide, blurred dark ring on the oval's edge (only its inner half shows)
    blurFilter(uid + 'blurRim', 4.5)
    ovalEl(cavG, 0, { fill: 'none', stroke: theme.cavityRim, 'stroke-width': 13, opacity: 0.48, filter: `url(#${uid}blurRim)` })
    // 3. the tongue's soft shadow on the floor and back wall (d follows the tongue each frame)
    blurFilter(uid + 'blurSh', 2.4)
    tongueShadow = el('path', { fill: theme.cavityRim, opacity: 0.5, filter: `url(#${uid}blurSh)`, transform: 'translate(-1.6 3)' }, cavG)
  }

  el('path', portrait ? { d: D9, stroke: 'none' } : { d: D9 }, bodyG)   // the photo supplies the face profile
  el('path', { d: D7 }, bodyG)
  if (portrait) {
    // Portrait only: the diagram's airway continues up behind the soft palate and down the throat. Children only
    // need to see the mouth, so all of that is plain tissue (the dark tone is confined to the oral ellipse).
    el('path', { d: poly(MAXILLA_FILL, true), stroke: 'none' }, bodyG)      // maxilla / nasal cavity
    el('path', { d: 'M -300 -300 H 600 V 700 H -300 Z', stroke: 'none' }, bodyG)  // pharynx, throat
  }
  el('path', { d: poly(P13, true), stroke: 'none' }, bodyG)            // palate, velum, upper lip
  const jaw = el('path', {}, bodyG)
  if (!portrait) el('path', { d: poly(P13.slice(PALATE_STROKE_A, PALATE_STROKE_B + 1), false), fill: 'none', stroke: theme.line, 'stroke-width': lw }, dg)
  if (portrait) {
    // Cheek / cut tissue as a solid with thickness: a volume gradient (lit from the front-top, darker toward the back
    // and bottom) and a shadow that wraps the hole's outer edge, so the oval reads as recessed into the cheek.
    const shade = el('g', { mask: `url(#${uid}tissue)` }, dg)
    const vol = el('linearGradient', { id: uid + 'skinVol', gradientUnits: 'userSpaceOnUse', x1: 158, y1: 112, x2: 96, y2: 186 }, defs)
    el('stop', { offset: 0, 'stop-color': '#ffffff', 'stop-opacity': 0.16 }, vol)
    el('stop', { offset: 0.45, 'stop-color': '#ffffff', 'stop-opacity': 0 }, vol)
    el('stop', { offset: 1, 'stop-color': theme.skinShade, 'stop-opacity': 0.32 }, vol)
    el('rect', { x: -300, y: -300, width: 800, height: 900, fill: `url(#${uid}skinVol)` }, shade)
    blurFilter(uid + 'blurEdge', 3.2)
    el('g', { filter: `url(#${uid}blurEdge)`, opacity: 0.5, fill: 'none', stroke: theme.skinShade, 'stroke-width': 9 }, shade)
    const edge = shade.lastChild
    ovalEl(edge, 0, {})
    frontEl(edge, {})
  }
  const tongueWrap = el('g', portrait ? { mask: `url(#${uid}tongueM)` } : {}, dg)
  const tongue = el('path', { id: uid + 'tongue', fill: tongueFill, stroke: 'none' }, tongueWrap)
  // shading clipped to the tongue: underside darkening, an inner shadow along the whole outline (rounds the body),
  // then a broad soft gloss and a crisp wet line along the dorsum
  el('use', { href: '#' + uid + 'tongue' }, el('clipPath', { id: uid + 'tongueClip' }, defs))
  const tongueShading = el('g', { 'clip-path': `url(#${uid}tongueClip)` }, tongueWrap)
  el('rect', { x: -300, y: -300, width: 800, height: 900, fill: `url(#${uid}tongueShade)` }, tongueShading)
  blurFilter(uid + 'blurIn', 1.7)
  const tongueIn = el('path', { fill: 'none', stroke: theme.tongueLine, 'stroke-width': 4.6, opacity: 0.5, filter: `url(#${uid}blurIn)` }, tongueShading)
  blurFilter(uid + 'blurGloss', 1.2)
  const tongueGloss = el('path', { fill: 'none', stroke: '#ffffff', 'stroke-opacity': 0.32, 'stroke-width': 3.2, 'stroke-linecap': 'round', filter: `url(#${uid}blurGloss)` }, tongueShading)
  const tongueEdge = el('path', { id: uid + 'tongueEdge', fill: 'none', stroke: theme.tongueLine, 'stroke-width': lw * 1.2 }, tongueWrap)
  const tongueHi = el('path', { fill: 'none', stroke: '#ffffff', 'stroke-opacity': 0.5, 'stroke-width': 1.0, 'stroke-linecap': 'round' }, tongueWrap) // moist highlight
  const toothU = el('path', { id: uid + 'toothU', fill: toothUFill, stroke: theme.toothLine, 'stroke-width': lw * 0.9 }, dg)
  const toothL = el('path', { id: uid + 'toothL', fill: toothLFill, stroke: theme.toothLine, 'stroke-width': lw * 0.9 }, dg)
  // specular line just inside each labial face (enamel gloss); the lower one rides with the jaw
  const TOOTH_HI_U = [[153.15, 131.0], [153.15, 135.4]], TOOTH_HI_L = [[152.55, 143.2], [152.55, 147.0]]
  const toothHiAttrs = { fill: 'none', stroke: '#ffffff', 'stroke-opacity': 0.8, 'stroke-width': 0.55, 'stroke-linecap': 'round' }
  el('path', Object.assign({ d: poly(TOOTH_HI_U, false) }, toothHiAttrs), dg)
  const toothHiL = el('path', toothHiAttrs, dg)
  el('path', { d: poly(UPPER_GUM, true), fill: gumUFill, stroke: 'none' }, dg)   // upper gingiva (static)
  const gumL = el('path', { fill: gumLFill, stroke: 'none' }, dg)
  const glottis = el('path', { fill: 'none', stroke: theme.line, 'stroke-width': lw * 1.2 }, dg)
  toothU.setAttribute('d', poly(UPPER_TOOTH, true))
  // ---------- moving lower lip + chin (portrait with `jaw` preset) ----------
  let jawImg = null, pivotPx = null, jawGain = 1, wedge = null, wedgeClip = null, seamTop = null, seamBase = null
  if (jawCfg) {
    const front = jawCfg.seam[0], corner = jawCfg.seam[jawCfg.seam.length - 1], W = portrait.width, H = portrait.height + 200
    jawGain = jawCfg.gain || 1
    pivotPx = toImg(PIVOT[0], PIVOT[1])

    // Dark mouth opening: the exact wedge between the photo's upper lip (the static seam) and the lower lip (the same
    // seam rotated with the jaw) — redrawn every frame, so its edges are the lip lines themselves. The top edge sits
    // 0.6 px up inside the upper lip (reads as its shadow, never a pink sliver) and the whole shape gets a sub-pixel
    // blur so the edge is smooth rather than stair-stepped.
    seamTop = jawCfg.seam.map((q, k) => [q[0] - (k === 0 ? 0.5 : 0), q[1] - 0.6])
    seamBase = jawCfg.seam.map((q, k) => [q[0] - (k === 0 ? 0.5 : 0), q[1]])
    blurFilter(uid + 'soft', 0.6)
    wedge = el('path', { fill: jawCfg.mouth || theme.cavity, filter: `url(#${uid}soft)` }, gap)
    wedgeClip = el('path', {}, el('clipPath', { id: uid + 'wedge' }, defs))
    const inner = el('g', { 'clip-path': `url(#${uid}wedge)` }, gap)
    const gg = el('g', { transform: diagramTransform, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, inner)
    // teeth after the tongue: the tongue passes between them and must never cover them
    ;['tongue', 'tongueEdge', 'toothU', 'toothL'].forEach((id) => el('use', { href: '#' + uid + id }, gg))
    // thin shadow under the upper lip (kept short so the protruding tongue tip is not darkened)
    const lipGrad = el('linearGradient', { id: uid + 'lipShade', gradientUnits: 'userSpaceOnUse', x1: 0, y1: front[1], x2: 0, y2: front[1] + 4.5 }, defs)
    el('stop', { offset: 0, 'stop-color': '#2a0c12', 'stop-opacity': 0.55 }, lipGrad)
    el('stop', { offset: 1, 'stop-color': '#2a0c12', 'stop-opacity': 0 }, lipGrad)
    el('rect', { x: corner[0] - 10, y: front[1] - 1, width: W, height: 6, fill: `url(#${uid}lipShade)` }, inner)

    // The photo's lower lip + chin: a crisp edge along the whole lip seam, feathered only along the cheek cut.
    blurFilter(uid + 'feather', jawCfg.feather || 8)
    const pieceM = newMask(uid + 'piece')
    const lastCut = jawCfg.cut[jawCfg.cut.length - 1]
    el('path', { d: poly([[W, front[1]]].concat(jawCfg.seam, jawCfg.cut, [[lastCut[0], H], [W, H]]), true), fill: '#fff', filter: `url(#${uid}feather)` }, pieceM)
    el('path', { d: poly([[W, front[1]]].concat(jawCfg.seam, [[corner[0], corner[1] + 110], [W, front[1] + 110]]), true), fill: '#fff' }, pieceM)   // sharp lip part
    el('path', { d: poly([[W, -50], [W, front[1]]].concat(jawCfg.seam, [[corner[0], -50]]), true), fill: '#000' }, pieceM)                      // no feather spill above the seam
    jawImg = el('image', { href: portrait.src, x: 0, y: 0, width: W, height: portrait.height, preserveAspectRatio: 'none', mask: `url(#${uid}piece)` }, lipLayer)
  }
  const rotPx = (q, deg) => {
    const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), dx = q[0] - pivotPx[0], dy = q[1] - pivotPx[1]
    return [pivotPx[0] + dx * c - dy * s, pivotPx[1] + dx * s + dy * c]
  }

  // overlays (not masked): buzz marks on the throat and air puffs at the lips
  const over = el('g', {}, svg)
  const buzz = el('g', { fill: 'none', stroke: theme.accent, 'stroke-linecap': 'round', opacity: 0 }, over)
  const air = el('g', { fill: theme.accent, opacity: 0 }, over)
  const AIR_R = [1.1, 0.9, 0.7]
  const airDots = AIR_R.map(() => el('circle', {}, air))
  const buzzAt = portrait && portrait.buzzAt ? portrait.buzzAt : toImg(131, 207)
  ;[7, 11, 15].forEach((r, k) => {
    const x0 = buzzAt[0] + (5 + 4 * k) * unit, y0 = buzzAt[1]
    el('path', { d: `M ${f(x0)} ${f(y0 - r * unit * 0.85)} A ${f(r * unit)} ${f(r * unit)} 0 0 1 ${f(x0)} ${f(y0 + r * unit * 0.85)}`, 'stroke-width': f(0.9 * unit) }, buzz)
  })
  const lipsAt = toImg(portrait ? 164 : 164, 139)
  airDots.forEach((c) => c.setAttribute('r', f(c.getAttribute('r') * unit)))

  // ---------- rendering ----------
  let curT = 0
  function renderShapes(p) {
    const open = cfg().jawOpen
    const low = []
    for (let i = 0; i < P.length; i++) low.push(pt(i, p, open))
    // jaw outline: lower lip (0–85) → meets the tooth → tooth's labial gum → floor of mouth (116–149) → pharynx
    // (230–); the original tapered incisor, its root and the lip pocket (86–115) and the drawing's tongue
    // (150–229) are dropped — the tongue is the spline below
    const jawRot = (q) => rot(q, jawAngle(p, open))
    const lowerTooth = LOWER_TOOTH.map(jawRot)
    jaw.setAttribute('d', poly(low.slice(0, 86).concat([jawRot(LOWER_LIP_MEETS_TOOTH), lowerTooth[lowerTooth.length - 1]], low.slice(116, TONGUE_A), low.slice(TONGUE_B + 1)), true))
    // smooth designed silhouette (see TONGUE_REST / HOLD_*)
    const pts = tonguePts(p, cfg().hold), d = spline(pts, true), hi = spline(tongueHiPts(pts), false)
    ;[tongue, tongueEdge, tongueIn, tongueShadow].forEach((e) => { if (e) e.setAttribute('d', d) })
    tongueHi.setAttribute('d', hi)
    tongueGloss.setAttribute('d', hi)
    toothL.setAttribute('d', poly(lowerTooth, true))
    toothHiL.setAttribute('d', poly(TOOTH_HI_L.map(jawRot), false))
    toothLGrad.setAttribute('gradientTransform', `rotate(${f(jawAngle(p, open))} ${PIVOT[0]} ${PIVOT[1]})`)
    gumL.setAttribute('d', poly(LOWER_GUM.map(jawRot), true))
  }
  function render(t) {
    curT = t
    const T = cfg().timing
    const p = progressAt(t, sound)
    renderShapes(p)
    if (jawImg) {
      // photo lips: the gain was tuned for a 2° diagram opening; wider openings add 1:1 so the lips don't over-open
      const open = cfg().jawOpen
      const deg = ((JAW_CLOSE + Math.min(open, 2)) * jawGain + Math.max(open - 2, 0)) * p
      jawImg.setAttribute('transform', `rotate(${f(deg)} ${f(pivotPx[0])} ${f(pivotPx[1])})`)
      const d = poly(seamTop.concat(seamBase.slice().reverse().map((q) => rotPx(q, deg))), true)
      wedge.setAttribute('d', d)
      wedgeClip.setAttribute('d', d)
    }
    const sounding = t >= T.soundOn && t <= T.soundOff
    const voiced = cfg().voiced
    glottis.setAttribute('d', voiced ? D11_DH : D11_TH)
    glottis.setAttribute('transform', voiced && sounding && Math.floor(t * 24) % 2 ? 'matrix(1 0 0 -1 0 409.4)' : '')
    buzz.setAttribute('opacity', voiced && sounding ? String(0.55 + 0.45 * Math.abs(Math.sin(t * 22))) : '0')
    // air stream: fricatives blow throughout; stops puff only after the release
    const airOn = sounding && (cfg().kind !== 'stop' || t >= T.release)
    if (airOn) {
      const u = (t - T.soundOn) / (T.soundOff - T.soundOn)
      air.setAttribute('opacity', '1')
      airDots.forEach((c, k) => {
        const v = (u * 2.2 + k * 0.33) % 1
        c.setAttribute('cx', f(lipsAt[0] + v * 16 * unit))
        c.setAttribute('cy', f(lipsAt[1] + (Math.sin(v * 6.28 + k) * 1.2 + v * 2) * unit))
        c.setAttribute('opacity', String(1 - v))
      })
    } else air.setAttribute('opacity', '0')
    if (options.onTime) options.onTime(t)
  }

  // ---------- audio + clock ----------
  const ownAudio = !options.audioElement
  const audio = options.audioElement || new Audio()
  audio.preload = 'auto'
  function loadAudio() {
    const src = audioMap[sound]
    if (src) { audio.src = src; audio.load() } else audio.removeAttribute('src')
  }
  let raf = 0, t0 = 0, playing = false
  function stop() {
    playing = false
    cancelAnimationFrame(raf)
    audio.pause()
  }
  function tick() {
    if (!playing) return
    const t = audio.paused ? (performance.now() - t0) / 1000 : audio.currentTime
    const end = cfg().timing.end
    render(Math.min(t, end))
    if (t >= end) { stop(); render(0); if (options.onEnd) options.onEnd(); return }
    raf = requestAnimationFrame(tick)
  }
  function play() {
    stop()
    playing = true
    let started = false
    const start = () => { if (started || !playing) return; started = true; t0 = performance.now(); raf = requestAnimationFrame(tick) }
    if (audio.getAttribute('src')) {
      audio.currentTime = 0
      audio.addEventListener('playing', start, { once: true })
      audio.play().then(start).catch(() => { audio.removeEventListener('playing', start); start() })
    } else start()
  }

  container.appendChild(svg)
  loadAudio()
  render(0)

  return {
    el: svg,
    get sound() { return sound },
    get time() { return curT },
    get playing() { return playing },
    get duration() { return cfg().timing.end },
    setSound(s) { if (SOUNDS[s]) { stop(); sound = s; applySound(); loadAudio(); render(Math.min(curT, cfg().timing.end)) } },
    play,
    stop,
    seek(t) { stop(); render(Math.max(0, Math.min(cfg().timing.end, t))) },
    destroy() { stop(); if (ownAudio) audio.removeAttribute('src'); svg.remove() },
  }
}
