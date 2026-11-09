// 共通：Firebase の読み込み・ログイン・保存（デモモードあり）
import { firebaseConfig } from "./firebase-config.js";

export const STUDENT_DOMAIN = "tokyo.soka.ed.jp"; // 生徒
export const TEACHER_DOMAIN = "soka.ed.jp";       // 教員（@tokyo.soka.ed.jp は含まない）
export const CLASSES = [1, 2, 3, 4, 5, 6, 7, 8];
export const MAX_NUMBER = 41;
export const TEST_CLASS = 0; // 動作確認用（教員画面では「テスト」と表示）
// クラスの人数（番号の最大値）。期ごとに書く。数字ならどのクラスも同じ、{ 1: 40, 2: 41, … } ならクラスごと。
// 書いていない期・クラスは MAX_NUMBER。MAX_NUMBER（41）より多くするときは firestore.rules の validNumber も変える
export const CLASS_SIZES = { "59": 41 };
export function classSize(ki, c) {
  const v = CLASS_SIZES[ki];
  const n = typeof v === "number" ? v : v?.[c];
  return Number.isInteger(n) && n >= 1 && n <= MAX_NUMBER ? n : MAX_NUMBER;
}
export const GEMINI_URL = "https://gemini.google.com/app";
// 学校図書館の蔵書検索（先生から届いたら差し替える。{q} があれば検索語が入る。なければそのページを開くだけ）
export const JKS_URL = "https://school.japanknowledge.com/"; // ジャパンナレッジSchool（学校のGoogleでログイン）。新書も読める（11/8）
export const LIBRARY_URL = "https://lib-finder.net/tokyo_soka_lib/"; // 学校図書館の蔵書検索（11/4）。検索語をURLに載せられないので、言葉はコピーして貼ってもらう
// RefNavi のグループコード（第3回で生徒に見せる）。期ごとに { all: "コード" }（学年で1つ）か { 1: "…", 2: "…" }（クラスごと）。
// 空なら「先生が伝えるグループコード」と出す。学校コードは書かない（生徒に教えないもの）
export const REFNAVI_GROUPS = {
  "59": { 1: "9da62", 2: "99ada", 3: "776a4", 4: "90102", 5: "cb119", 6: "6aa3b", 7: "fabb3", 8: "1b818" }, // 1-1H59〜1-8H59（11/9）
};
export const refnaviGroupOf = (ki, cls) => { const g = REFNAVI_GROUPS[ki] || {}; return String(g[cls] ?? g.all ?? "").trim(); };
// DOI の番号だけを取り出す（「https://doi.org/10.…」「DOI: 10.…」などから「10.…」に。見つからなければ空）（11/8）
export function doiOf(s) {
  let t = String(s || "").trim();
  try { t = decodeURIComponent(t); } catch (e) { /* そのまま */ }
  const m = /10\.\d{4,9}\/[^\s"'<>]+/.exec(t);
  if (!m) return "";
  const d = m[0].replace(/[。．.、,，\]」]+$/u, "");
  return d.includes("(") ? d : d.replace(/[)）]+$/u, ""); // 「(」がなければ、閉じかっこは文の一部
}
// Quest 3 のメモ（論文ごと：wakatta・wakatta2 など。11/9）を第4回・教員画面で使う：2本分をまとめた文（1本だけならそのまま。2本なら「論文①：…」「論文②：…」）
export function memoText(d, base, sep = "\n") {
  const xs = [[1, d?.[base]], [2, d?.[base + "2"]], [3, d?.[base + "3"]]].map(([n, t]) => [n, String(t || "").trim()]).filter(([, t]) => t);
  if (xs.length < 2) return xs[0]?.[1] || "";
  return xs.map(([n, t]) => `論文${"①②③"[n - 1]}：${t}`).join(sep);
}
export const YOUTUBE_SEARCH = q => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
// 授業の外でやってくること（L01で決めた一歩）の呼び名。Quest 1, Quest 2 …（quest・question・inquiry は同じ語源）
export const quest = n => `Quest ${n}`;

const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";

export const isDemo = new URLSearchParams(location.search).has("demo");
export const configReady = !Object.values(firebaseConfig).some(v => String(v).includes("ここに"));
// 開発版（projectId が -dev で始まる／終わる）なら画面に印を出す。?devmark で見た目だけ確認できる
export const isDevSite = /-dev(-|$)/.test(String(firebaseConfig.projectId || ""))
  || new URLSearchParams(location.search).has("devmark");

export function hasDomain(email, domain) {
  return String(email || "").toLowerCase().endsWith("@" + domain);
}
export function roleOf(email) {
  if (hasDomain(email, STUDENT_DOMAIN)) return "student";
  if (hasDomain(email, TEACHER_DOMAIN)) return "teacher";
  return null;
}

// 期：アドレスの頭2桁（例：59…@tokyo.soka.ed.jp → "59"）。数字でなければ ""
export function kiOf(email) {
  const m = String(email || "").toLowerCase().match(/^([0-9]{2})/);
  return m ? m[1] : "";
}
// その年度の高校1年の期（2026年度＝59期）
export function firstYearKi(d = new Date()) {
  const fy = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return String(fy - 1967);
}
export function kiLabel(ki) { return ki ? `${ki}期` : "期なし"; }

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function classLabel(c) {
  return c === TEST_CLASS ? "テスト" : `${c}組`;
}

// 一歩の【方法】を読み取る（生徒が見出しごと貼ったとき）
export const METHODS = ["やってみる", "測る", "見に行く", "聞く"];
export function methodOf(ippo) {
  const s = String(ippo || "");
  if (!s.trim()) return "";
  const m = s.match(/[【\[［]\s*([^】\]］]{1,10}?)\s*[】\]］]/);
  const word = m ? m[1].trim() : "";
  if (METHODS.includes(word)) return word;
  const head = METHODS.find(x => s.trim().startsWith(x));
  if (head) return head;
  return word ? "その他" : "不明";
}

// Gemini を画面の右半分の別ウィンドウで開く
// url：覚えておいたこの回のチャット（https://gemini.google.com/app/…）。あれば必ずそのチャットを開く
//      （「前に出す」はブラウザが止めることが多く、生徒が「出てこない」と新しいチャットを開いてしまったため）
// url がないとき：1回目は新しいチャット、2回目以降は前に出すだけ（チャットを消さない）
// 戻り値："opened"（開いた）／"focused"（前に出した）／"lost"（開いたはずだが見つからない）／"blocked"
// key：回ごとの印（回が変わったら新しいチャットにする）
let geminiWin = null, geminiFor = "";
export function openGemini({ force = false, key = "gcis_gemini", url = "" } = {}) {
  const W = screen.availWidth || 1366, H = screen.availHeight || 768;
  const feat = `popup=yes,left=${Math.round(W / 2)},top=0,width=${Math.round(W / 2)},height=${H}`;
  if (url) {
    const w = window.open(url, "gcis_gemini", feat) || window.open(url, "_blank");
    if (!w) return "blocked";
    geminiWin = w; geminiFor = key;
    try { w.focus(); } catch { /* なし */ }
    return "opened";
  }
  if (geminiWin && !geminiWin.closed && geminiFor === key && !force) { geminiWin.focus(); return "focused"; }
  let opened = false;
  try { opened = sessionStorage.getItem(key) === "1"; } catch { /* なし */ }
  if (opened && !force) return "lost"; // 新しく開くとチャットが分かれるので、先に戻ってもらう
  const w = window.open(GEMINI_URL, "gcis_gemini", feat) || window.open(GEMINI_URL, "_blank");
  if (!w) return "blocked";
  geminiWin = w; geminiFor = key;
  try { sessionStorage.setItem(key, "1"); } catch { /* なし */ }
  try { w.focus(); } catch { /* なし */ }
  return "opened";
}

// この回のチャットのURLか（https://gemini.google.com/app/… または /u/1/app/…）。共有リンクは不可
export function chatUrlOf(s) {
  const m = String(s || "").trim().match(/^https:\/\/gemini\.google\.com\/(?:u\/\d+\/)?app\/[0-9a-zA-Z_-]{6,}/);
  return m ? m[0] : "";
}
export function chatUrlProblem(s) {
  const t = String(s || "").trim();
  if (!t) return "";
  if (chatUrlOf(t)) return "";
  if (/gemini\.google\.com\/(?:u\/\d+\/)?app\/?$/.test(t)) return "まだ送信していないかも。プロンプトを送ってから、もう一度コピーしよう（URLの最後に英数字がつきます）";
  if (/share|g\.co/.test(t)) return "それは共有リンクです。Geminiの窓のいちばん上のURLをコピーしよう";
  return "https://gemini.google.com/app/ で始まるURLを貼ろう";
}

// 画面を左右に並べるキー（端末ごと）
export function snapKeys() {
  const ua = navigator.userAgent || "";
  if (/CrOS/.test(ua)) return "Alt ＋ [";
  if (/Windows/.test(ua)) return "Windowsキー ＋ ←";
  if (/Macintosh/.test(ua)) return "fn ＋ control ＋ ←";
  return "";
}

// 右半分に別の窓を開く前に、アプリの窓を左半分に寄せる案内（11/9 先生：開く前に必ず。Windows・Chromebook どちらも出す。使っている端末の方を先に）
export function snapFirst(what = "Gemini") {
  const ua = navigator.userAgent || "";
  const win = `<span><kbd>Windowsキー ＋ ←</kbd>（Windows）</span>`, cros = `<span><kbd>Alt ＋ [</kbd>（Chromebook）</span>`;
  const keys = /CrOS/.test(ua) ? [cros, win] : [win, cros];
  return `<p class="snap snapfirst">🪟 <b>${what}を開く前に</b>、まずこのアプリの窓を<b>左半分</b>に寄せよう：${keys.join("　／　")}</p>`;
}

export function lsGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
export function lsSet(k, v) { try { localStorage.setItem(k, v); } catch { /* 保存できなくても動く */ } }

// ---------- バックエンド（本番：Firebase / デモ：メモリ） ----------
export async function createBackend() {
  if (isDemo) return demoBackend();
  const [{ initializeApp }, authMod, fs] = await Promise.all([
    import(SDK + "firebase-app.js"),
    import(SDK + "firebase-auth.js"),
    import(SDK + "firebase-firestore.js")
  ]);
  const app = initializeApp(firebaseConfig);
  const auth = authMod.getAuth(app);
  const db = fs.getFirestore(app);
  const toDate = x => x?.toDate?.() || null;

  return {
    demo: false,
    onUser(cb) { return authMod.onAuthStateChanged(auth, cb); },
    async signIn() {
      const provider = new authMod.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      return authMod.signInWithPopup(auth, provider);
    },
    signOut() { return authMod.signOut(auth); },
    async getProfile(uid) {
      const s = await fs.getDoc(fs.doc(db, "students", uid));
      return s.exists() ? s.data() : null;
    },
    async saveProfile(uid, p, isNew) {
      const data = { email: p.email, ki: p.ki, class: p.class, number: p.number, updatedAt: fs.serverTimestamp() };
      if (isNew) data.createdAt = fs.serverTimestamp();
      await fs.setDoc(fs.doc(db, "students", uid), data, { merge: true });
    },
    async getNote(uid, lesson) {
      const s = await fs.getDoc(fs.doc(db, "notes", `${uid}_${lesson}`));
      return s.exists() ? s.data() : null;
    },
    async saveNote(uid, lesson, p, note, markSubmitted = false) {
      const data = {
        uid, lesson, ki: p.ki, class: p.class, number: p.number,
        step: note.step, submitted: !!note.submitted,
        data: note.data, updatedAt: fs.serverTimestamp()
      };
      if (markSubmitted) data.submittedAt = fs.serverTimestamp();
      await fs.setDoc(fs.doc(db, "notes", `${uid}_${lesson}`), data, { merge: true });
    },
    // 問いの数の順位（第4回）：counts/{期}/{回}/{uid} に数だけ置き、多い人の数を数える（読み取り2回分）
    async scoreRank({ ki, lesson, uid, n }) {
      const col = fs.collection(db, "counts", ki, lesson);
      await fs.setDoc(fs.doc(col, uid), { n, updatedAt: fs.serverTimestamp() });
      const [above, all] = await Promise.all([
        fs.getCountFromServer(fs.query(col, fs.where("n", ">", n))),
        fs.getCountFromServer(col)
      ]);
      return { rank: above.data().count + 1, total: all.data().count };
    },
    // 教員用：1つの期・クラス（テストは期を問わない）をリアルタイムで受け取る。lesson が null ならすべての回
    watchGroup({ ki, cls }, lesson, onStudents, onNotes, onError) {
      const sw = [fs.where("class", "==", cls)];
      const nw = [fs.where("class", "==", cls)];
      if (lesson) nw.push(fs.where("lesson", "==", lesson));
      if (cls !== TEST_CLASS) { sw.push(fs.where("ki", "==", ki)); nw.push(fs.where("ki", "==", ki)); }
      const u1 = fs.onSnapshot(fs.query(fs.collection(db, "students"), ...sw),
        snap => onStudents(snap.docs.map(d => ({ uid: d.id, ...d.data() }))), onError);
      const u2 = fs.onSnapshot(fs.query(fs.collection(db, "notes"), ...nw),
        snap => onNotes(snap.docs.map(d => ({ id: d.id, ...d.data(), updatedAt: toDate(d.data().updatedAt) }))), onError);
      return () => { u1(); u2(); };
    },
    // 教員用：学年まとめ。1つの期の全クラスを1回だけ読む（リアルタイムにしない＝読み取り回数を抑える）
    // lessons：読む回（いまの回と、その1つ前）。期＋回の「＝」だけの絞り込みなので複合インデックスは要らない
    async getGrade({ ki }, lessons) {
      const [s, ...ns] = await Promise.all([
        fs.getDocs(fs.query(fs.collection(db, "students"), fs.where("ki", "==", ki))),
        ...lessons.map(l => fs.getDocs(fs.query(fs.collection(db, "notes"), fs.where("ki", "==", ki), fs.where("lesson", "==", l))))
      ]);
      return {
        students: s.docs.map(d => ({ uid: d.id, ...d.data() })),
        notes: ns.flatMap(q => q.docs.map(d => ({ id: d.id, ...d.data(), updatedAt: toDate(d.data().updatedAt) })))
      };
    }
  };
}

// デモ：メモリだけ。生徒役と教員役を切り替えて試せる（入力は保存されない）
function demoBackend() {
  let user = null;
  const profiles = {}, notes = {};
  let listener = () => {};
  return {
    demo: true,
    onUser(cb) { listener = cb; cb(user); return () => {}; },
    async signIn(as = "student") {
      user = as === "teacher"
        ? { uid: "demo-t", email: "demo.teacher@" + TEACHER_DOMAIN }
        : { uid: "demo-s", email: firstYearKi() + "demo@" + STUDENT_DOMAIN };
      listener(user);
    },
    async signOut() { user = null; listener(null); },
    async getProfile(uid) { return profiles[uid] || null; },
    async saveProfile(uid, p) { profiles[uid] = { ...p }; },
    async getNote(uid, lesson) { return notes[uid + lesson] ? JSON.parse(JSON.stringify(notes[uid + lesson])) : null; },
    async saveNote(uid, lesson, p, note) { notes[uid + lesson] = JSON.parse(JSON.stringify(note)); },
    // デモ：架空の学年（160人）の中での順位
    async scoreRank({ n }) {
      const others = Array.from({ length: 160 }, (_, i) => Math.max(0, Math.round(12 + 6 * Math.sin(i * 1.7) + (i % 7) - 3)));
      return { rank: others.filter(x => x > n).length + 1, total: others.length + 1 };
    },
    watchGroup() { return () => {}; }
  };
}

// 本か動画（第2回の③・Quest 2）：動画のリンク・本の題名・ISBN を5件まで（douga, douga2…douga5 のように持つ。1件目は前からの名前のまま）11/5
export const PICK_N = ["", "2", "3", "4", "5"];
export const listOf = (d, base) => PICK_N.map(n => String(d?.[base + n] ?? "").trim()).filter(Boolean);
// 本の題名と ISBN の組（題名のある分だけ）
export const booksOf = d => PICK_N.map(n => ({ title: String(d?.["honTitle" + n] ?? "").trim(), isbn: String(d?.["isbn" + n] ?? "").trim() })).filter(b => b.title);
