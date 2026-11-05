/** UI strings. English for the Blast team, Japanese for the expert review; the EN/JP toggle in the top bar switches. */

export type Lang = 'en' | 'jp'

const STRINGS = {
  title: { en: 'phoneme-prototype', jp: 'フォニーム・プロトタイプ' },
  presenter: { en: 'Who shows the sound', jp: 'だれが見せる？' },
  avatar: { en: 'Avatar', jp: 'アバター' },
  human: { en: 'Human', jp: '人' },
  both: { en: 'Both', jp: '両方' },
  subtitle: { en: '{host} will say it with you.', jp: '{host}といっしょに言ってみよう。' },
  sounds: { en: 'Sounds', jp: 'おと' },
  tapHint: { en: 'Tap a sound to watch and listen.', jp: 'おとをタップすると、見て聞けるよ。' },
  langLabel: { en: 'Language', jp: '言語' },
  soundOn: { en: 'Sound on', jp: 'おと オン' },
  soundOff: { en: 'Sound off', jp: 'おと オフ' },
  practice: { en: 'Practice', jp: 'れんしゅう' },
  practiceHint: { en: 'On: a sound opens in a pop-up. Off: it plays in the side panel.', jp: 'オン: ポップアップで再生。オフ: 右のパネルで再生。' },
  watch: { en: 'Watch', jp: 'みる' },
  idlePanel: { en: 'Tap a sound and watch here.', jp: 'おとをタップすると ここで見られるよ。' },
  wordBuilder: { en: 'Word Builder', jp: 'ことばづくり' },
  wbHint: { en: 'Drag a sound into a block — or tap a block, then a sound.', jp: 'おとをブロックへドラッグ。または、ブロックをタップしてから おとをタップ。' },
  wbEmpty: { en: 'Put a sound in a block first.', jp: 'さきに おとを ブロックに入れてね。' },
  emptyBlock: { en: 'Empty block {n}', jp: 'からのブロック {n}' },
  blockWith: { en: 'Block {n}: {sound}. Tap to remove.', jp: 'ブロック {n}: {sound}。タップで消す。' },
  addBlock: { en: 'Add a block', jp: 'ブロックをふやす' },
  removeBlock: { en: 'Remove a block', jp: 'ブロックをへらす' },
  clearAll: { en: 'Clear', jp: 'ぜんぶ消す' },
  quieter: { en: 'Quieter', jp: 'ちいさく' },
  louder: { en: 'Louder', jp: 'おおきく' },
  play: { en: 'Play', jp: 'さいせい' },
  again: { en: 'Again', jp: 'もういちど' },
  tongueAgain: { en: 'Tongue again', jp: 'したを もういちど' },
  close: { en: 'Close', jp: 'とじる' },
  tapToPlay: { en: 'Tap to play', jp: 'タップして さいせい' },
  mouth: { en: 'Mouth', jp: 'くち' },
  tongue: { en: 'Tongue', jp: 'した' },
  footerNote: { en: 'Icons and host portrait are placeholders.', jp: 'アイコンとホストの絵は仮のものです。' },
  symbols: { en: 'Symbols', jp: '記号' },
  // question between the mouth close-up and the side view
  askSideView: { en: 'Do you want to see the side view in more detail?', jp: '横から見た したの動きを くわしく見てみる？' },
  yes: { en: 'Yes', jp: 'はい' },
  no: { en: 'No', jp: 'いいえ' },
  // recorder (practice pop-up, right side)
  yourTurn: { en: 'Your turn', jp: 'つぎは きみの ばん' },
  recHint: { en: 'Tap the microphone and say the sound.', jp: 'マイクをタップして、おとを言ってみよう。' },
  record: { en: 'Record', jp: 'ろくおん' },
  recording: { en: 'Listening… tap to stop', jp: 'きいてるよ… タップで ストップ' },
  analysing: { en: 'Checking…', jp: 'チェック中…' },
  score: { en: 'Score', jp: 'スコア' },
  compare: { en: 'Compare', jp: 'くらべて聞く' },
  you: { en: 'You', jp: 'きみ' },
  recordAgain: { en: 'Record again', jp: 'もういちど ろくおん' },
  micDenied: { en: 'We need the microphone to hear you. Allow it in the browser and try again.', jp: 'マイクが使えません。ブラウザで マイクを ゆるして、もういちど。' },
  micUnsupported: { en: 'Recording is not supported in this browser.', jp: 'このブラウザでは ろくおんできません。' },
  tooShort: { en: 'That was too short — try again.', jp: 'みじかすぎたよ。もういちど。' },
  // cheer under the stars (0–3)
  cheer0: { en: 'Keep going!', jp: 'もういちど チャレンジ！' },
  cheer1: { en: 'Nice try!', jp: 'いいかんじ！' },
  cheer2: { en: 'Great job!', jp: 'すごい！' },
  cheer3: { en: 'Perfect!', jp: 'かんぺき！' },
  // theme + account (top bar)
  themeLight: { en: 'Switch to light mode', jp: 'ライトモードにする' },
  themeDark: { en: 'Switch to dark mode', jp: 'ダークモードにする' },
  account: { en: 'Account', jp: 'アカウント' },
  accountHint: { en: 'Signed in with this email.', jp: 'このメールで ログイン中。' },
  theme: { en: 'Theme', jp: 'テーマ' },
  light: { en: 'Light', jp: 'ライト' },
  dark: { en: 'Dark', jp: 'ダーク' },
  // session log (account menu)
  activity: { en: 'Modes used', jp: 'つかったモード' },
  activityHint: { en: 'times, on this account', jp: 'かい（このアカウント）' },
  downloadCsv: { en: 'Download session log (CSV)', jp: 'セッションログを ダウンロード (CSV)' },
  // sign in
  signIn: { en: 'Log in', jp: 'ログイン' },
  signUp: { en: 'Sign up', jp: 'とうろく' },
  signOut: { en: 'Log out', jp: 'ログアウト' },
  email: { en: 'Email', jp: 'メールアドレス' },
  emailPlaceholder: { en: 'you@school.com', jp: 'you@school.com' },
  password: { en: 'Password', jp: 'パスワード' },
  passwordHint: { en: 'At least 8 characters.', jp: '8文字いじょう。' },
  showPassword: { en: 'Show password', jp: 'パスワードを表示' },
  hidePassword: { en: 'Hide password', jp: 'パスワードをかくす' },
  haveAccount: { en: 'Already have an account?', jp: 'アカウントを おもちですか？' },
  noAccount: { en: 'New here?', jp: 'はじめてですか？' },
  working: { en: 'Please wait…', jp: 'ちょっと まってね…' },
  welcomeBack: { en: 'Welcome back', jp: 'おかえりなさい' },
  welcomeBackHint: { en: 'Log in and pick up where you left off.', jp: 'ログインして つづきから はじめよう。' },
  createAccount: { en: 'Create your account', jp: 'アカウントを つくろう' },
  createAccountHint: { en: 'Free, and it only takes a moment.', jp: 'むりょうで、すぐに できるよ。' },
  heroEyebrow: { en: 'English sounds for young learners', jp: 'こどものための えいごの おと' },
  heroTitle: { en: 'Say it like {host}.', jp: '{host}みたいに 言ってみよう。' },
  heroSub: { en: 'Watch the mouth up close, peek at the tongue from the side, then record yourself and get a score — one sound at a time.', jp: 'くちを 近くで見て、したを 横から のぞいて、じぶんの声を ろくおんして スコアをもらおう。ひとつずつ、ね。' },
  feature1: { en: 'Mouth close-ups', jp: 'くちの クローズアップ' },
  feature1Hint: { en: 'Avatar or a real teacher', jp: 'アバターか 本物の先生' },
  feature2: { en: 'Side-view tongue', jp: '横から見た した' },
  feature2Hint: { en: 'See where the tongue goes', jp: 'したの いちが わかる' },
  feature3: { en: 'Instant score', jp: 'すぐに スコア' },
  feature3Hint: { en: 'Record, compare, improve', jp: 'ろくおん、くらべて、じょうたつ' },
  authFootnote: { en: 'Made for classrooms and tablets.', jp: 'きょうしつと タブレットのために。' },
  // server error codes → messages
  'err.invalid_email': { en: 'Please enter a valid email address.', jp: '正しい メールアドレスを 入力してね。' },
  'err.weak_password': { en: 'Password must be at least 8 characters.', jp: 'パスワードは 8文字いじょう にしてね。' },
  'err.email_taken': { en: 'That email is already registered — log in instead.', jp: 'その メールアドレスは とうろくずみです。ログインしてね。' },
  'err.bad_credentials': { en: 'Wrong email or password.', jp: 'メールアドレスか パスワードが ちがいます。' },
  'err.config': { en: 'The server is not fully set up yet (a setting is missing). Please tell the administrator.', jp: 'サーバーの せっていが まだ おわっていません。かんりしゃに つたえてね。' },
  'err.server': { en: 'Something went wrong. Please try again.', jp: 'エラーが おきました。もういちど ためしてね。' },
  'err.network': { en: 'Cannot reach the server. Check your connection.', jp: 'サーバーに つながりません。つうしんを かくにんしてね。' },
} as const

export type StringKey = keyof typeof STRINGS

/** t('subtitle', 'en', { host: 'Brooke' }) → "Brooke will say it with you." */
export function t(key: StringKey, lang: Lang, vars?: Record<string, string | number>): string {
  let s: string = STRINGS[key][lang]
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
  return s
}

/** Short "how to make it" line per sound, shown under the player. English comes from the manifest. */
export const ARTICULATION_JP: Record<string, string> = {
  th_voiceless: 'したの先を歯のあいだに。声は出さずに、息だけ。',
  th_voiced: 'おなじ形で、声を出してブーッ。',
  r: 'したをうしろに引いて、先はどこにもつけない。',
  k: 'したの奥を上にもち上げて、ポンとはなす。',
  ae: '口を大きくあけて、したは低く前に。',
  t: 'したの先で、上の歯のうしろをトンとたたく。',
}
