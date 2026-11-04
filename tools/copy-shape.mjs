// 本番 → 開発版へ「形だけ写す」（GitHub Actions の copy-shape から手動で実行）
//   本番（gcis-note）は読むだけ。開発版（gcis-note-dev）の前回のダミーを消してから入れ直す
//   ・ID とアドレスは架空のものに（実行のたびに変わる。元には戻せない）
//   ・文章は、同じ長さ・同じ改行・同じ記号（？・【】など）のダミー文に
//   ・そのまま写すのは下の KEEP にある項目だけ（選択肢・日付・段階・数など）。数・真偽・時刻はそのまま
//   ・ログには件数しか出さない（中身・ID・アドレスは出さない）
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldPath, Timestamp } from "firebase-admin/firestore";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// テーマの例（themes.js の一覧）。モジュールとして読み込まず、文字列だけ取り出す
const THEMES = [...readFileSync(new URL("../themes.js", import.meta.url), "utf8").matchAll(/^\s*"((?:[^"\\]|\\.)*)",?\s*$/gm)].map(m => JSON.parse(`"${m[1]}"`));

const PROD = process.env.PROJECT_PROD || "gcis-note";
const DEV = process.env.PROJECT_DEV || "gcis-note-dev";
if (PROD === DEV) throw new Error("本番と開発版が同じです");

let prod, dev; // main() でつなぐ（変換だけを試すときはつながない）

const PREFIX = "dummy_";
const SALT = randomBytes(16).toString("hex"); // 実行ごとに変わる（架空IDから元のIDをたどれない）
const fakeUid = uid => PREFIX + createHash("sha256").update(SALT + uid).digest("hex").slice(0, 20);

// そのまま写す項目（選択肢・日付・段階）。これ以外の文字はすべてダミーにする
const METHODS = ["やってみる", "測る", "見に行く", "聞く"];
const KEEP = {
  route: v => ["A", "B", "C"].includes(v),
  did: v => ["やった", "まだ"].includes(v),
  yomi1: v => ["全部読んだ", "途中まで", "まだ"].includes(v),
  yomi2: v => ["全部読んだ", "途中まで", "まだ"].includes(v),
  houhou: v => ["文献・データ", "アンケート", "インタビュー", "観察", "実験・制作"].includes(v),
  houhou2: v => ["文献・データ", "アンケート", "インタビュー", "観察", "実験・制作"].includes(v),
  sudeni: v => ["はい", "わからない", "いいえ"].includes(v),
  kakame: v => ["数・割合", "理由・経験", "様子・動き", "条件で変わるか"].includes(v),
  aite: v => ["人", "モノ・できごと"].includes(v),
  qftPhase: v => ["", "run", "done"].includes(v),
  ippoDate: v => /^\d{4}-\d{2}-\d{2}$/.test(v),
  theme: v => THEMES.includes(v),
  k: v => String(v).length <= 12 // 問いの種類（7種類の名前）
};

// ダミー文：長さ・改行・記号はそのまま、文字だけ置きかえる。同じ文は同じダミーになる（選んだ問い＝出した問いの1つ、が保たれる）
const KANA = "あいうえおかきくけこさしすせそたちつてとなにぬねの";
const PUNCT = /[\s？?！!、。，．,.・「」『』（）()【】\[\]：:／/〜~ー\-]/;
function dummyText(s) {
  let out = "", i = 0;
  // 先頭の【方法】見出し（第1回の一歩）は残す
  const m = s.match(/^\s*[【\[［]\s*([^】\]］]{1,10}?)\s*[】\]］]/);
  if (m && METHODS.includes(m[1].trim())) { out = m[0]; s = s.slice(m[0].length); }
  for (const ch of s) {
    out += PUNCT.test(ch) ? ch : /[0-9０-９]/.test(ch) ? "0" : /[A-Za-z]/.test(ch) ? "x" : KANA[i % KANA.length];
    i++;
  }
  return out;
}
// URL：https://ホスト/ までは残し（動画か本かの見分けに使う）、後ろは同じ長さの x に
function dummyUrl(s) {
  const m = s.match(/^(https?:\/\/[^/\s]+\/?)([\s\S]*)$/);
  return m ? m[1] + m[2].replace(/[^/?=&.\s]/g, "x") : dummyText(s);
}
export function mask(v, key) {
  if (typeof v === "string") {
    if (KEEP[key]?.(v)) return v;
    return /^\s*https?:\/\//.test(v) ? dummyUrl(v.trim()) : dummyText(v);
  }
  if (Array.isArray(v)) return v.map(x => mask(x, key));
  if (v instanceof Timestamp) return v;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, mask(x, k)]));
  return v; // 数・真偽・null
}

// 開発版の前回のダミーを消す（ID が dummy_ で始まるものだけ。先生のテストは残す）
async function prefixDocs(col) {
  const snap = await col.where(FieldPath.documentId(), ">=", PREFIX).where(FieldPath.documentId(), "<", PREFIX + "").get();
  return snap.docs.map(d => d.ref);
}
async function clearDev() {
  const refs = [...await prefixDocs(dev.collection("students")), ...await prefixDocs(dev.collection("notes"))];
  for (const kiDoc of await dev.collection("counts").listDocuments())
    for (const sub of await kiDoc.listCollections()) refs.push(...await prefixDocs(sub));
  const w = dev.bulkWriter();
  refs.forEach(r => w.delete(r));
  await w.close();
  return refs.length;
}

async function main() {
  prod = getFirestore(initializeApp({ projectId: PROD }, "prod"));
  dev = getFirestore(initializeApp({ projectId: DEV }, "dev"));
  // 1. 本番を読む（学年の生徒だけ。教員のテスト＝クラス0は写さない）
  const st = (await prod.collection("students").get()).docs.filter(d => d.data().class !== 0);
  const ids = new Set(st.map(d => d.id));
  const nt = (await prod.collection("notes").get()).docs.filter(d => ids.has(d.data().uid));
  const ct = [];
  for (const kiDoc of await prod.collection("counts").listDocuments()) {
    if (kiDoc.id === "t") continue; // 教員のテスト
    for (const sub of await kiDoc.listCollections())
      (await sub.get()).docs.filter(d => ids.has(d.id)).forEach(d => ct.push({ ki: kiDoc.id, lesson: sub.id, d }));
  }

  // 2. 開発版の前回のダミーを消す
  const removed = await clearDev();

  // 3. 架空にして入れる
  const w = dev.bulkWriter();
  for (const d of st) {
    const x = d.data(), u = fakeUid(d.id);
    w.set(dev.collection("students").doc(u), {
      ...x, email: `${x.ki || ""}${u.slice(PREFIX.length, PREFIX.length + 8)}@example.invalid`
    });
  }
  for (const d of nt) {
    const x = d.data(), u = fakeUid(x.uid);
    w.set(dev.collection("notes").doc(`${u}_${x.lesson}`), { ...x, uid: u, data: mask(x.data || {}, "") });
  }
  for (const { ki, lesson, d } of ct) w.set(dev.collection("counts").doc(ki).collection(lesson).doc(fakeUid(d.id)), d.data());
  await w.close();

  const byLesson = {};
  nt.forEach(d => { const l = d.data().lesson; byLesson[l] = (byLesson[l] || 0) + 1; });
  const line = `本番から読んだ件数：生徒 ${st.length}／ノート ${nt.length}（${Object.entries(byLesson).sort().map(([k, v]) => `${k} ${v}`).join("・")}）／順位用 ${ct.length}\n開発版：前回のダミー ${removed} 件を消して、${st.length + nt.length + ct.length} 件を入れました`;
  console.log(line);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const { appendFileSync } = await import("node:fs");
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### 開発版に形だけ写しました\n${line.replace("\n", "  \n")}\n`);
  }
}
if (import.meta.url === pathToFileURL(process.argv[1] || "").href) main().catch(e => { console.error("失敗しました：" + (e.code || "") + " " + String(e.message || e).slice(0, 300)); process.exit(1); });
