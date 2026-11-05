// ステージ4：Quest 2（第2回→第3回）「？」の手がかりになりそうな本か動画
// 仕様：ナレッジの L03.md「Quest 2」。授業中に始められる子は始める
// data：findq（動画を探す言葉）・findb（本を探す言葉）・douga（動画のリンク）・honTitle（本の題名）・isbn・kokoro（いちばん心に残った所と、ひとこと）・fromL02（第2回の値を写した印）
// mono（見たもの・読んだもの：11/4 までの1欄）は古いデータの表示用に残す
import { quest, LIBRARY_URL, YOUTUBE_SEARCH } from "./common.js";
const Q = quest(2);

const qsOf = d => ["q1", "q2", "q3"].map(k => String(d[k] || "").trim()).filter(Boolean);

// 本か動画を探す道具（第2回の最後と Quest 2 で使う）。動画と本で言葉が違うので、欄とボタンを2組に（11/4）
// findq＝動画を探す言葉（YouTube）／findb＝本を探す言葉（学校図書館の蔵書検索）
export function findTools(c) {
  const { esc, d } = c;
  return `
    <div class="findrow">
      <div class="field"><label><span class="label">動画を探す言葉</span><span class="hint">AIの表の「YouTube」の言葉でも、自分の言葉でもOK</span>
        <input data-key="findq" type="text" value="${esc(d.findq || "")}" placeholder="例：集中力 雑音 実験"></label></div>
      <div class="searchbtns"><button type="button" class="btn" data-find="youtube" data-findkey="findq">YouTubeで探す ↗</button></div>
    </div>
    <div class="findrow">
      <div class="field"><label><span class="label">本を探す言葉</span><span class="hint">AIの表の「学校図書館」の言葉でも、自分の言葉でもOK</span>
        <input data-key="findb" type="text" value="${esc(d.findb || "")}" placeholder="例：睡眠不足"></label></div>
      <div class="searchbtns"><button type="button" class="btn" data-find="library" data-findkey="findb">学校図書館の蔵書検索 ↗</button></div>
      <p class="hint">ボタンを押すと、この言葉がコピーされます。開いた検索欄に貼り付けよう（<kbd>Ctrl</kbd>＋<kbd>V</kbd>）。</p>
      <p class="hint warn-text" data-find-msg hidden></p>
      <p class="hint">ヒットしないときは、もっと広い言葉にしてみよう（例：「睡眠不足」→「睡眠」）。</p>
    </div>
    <p class="hint">本か動画のどちらか一方でOK。</p>`;
}
export function handleFind(t, c) {
  const b = t.closest("[data-find]");
  if (!b) return false;
  const q = c.v(b.dataset.findkey);
  if (b.dataset.find === "youtube") {
    if (!q) { alert("先に探す言葉を入れてね"); return true; }
    window.open(YOUTUBE_SEARCH(q), "_blank", "noopener");
  } else if (LIBRARY_URL.includes("{q}")) {
    window.open(LIBRARY_URL.replace("{q}", encodeURIComponent(q)), "_blank", "noopener");
  } else {
    // 蔵書検索は検索語をURLに載せられない → 言葉をコピーしてから開き、貼ってもらう
    const copied = q ? copyText(q) : false;
    window.open(LIBRARY_URL, "_blank", "noopener");
    const msg = b.closest(".findrow")?.querySelector("[data-find-msg]");
    // コピーできたときは何も出さない（押す前の1行で足りる）。できなかったときだけ知らせる
    if (msg) {
      msg.hidden = copied;
      msg.innerHTML = copied ? "" : `${q ? "コピーできませんでした。" : ""}開いた蔵書検索の<b>検索欄に、探す言葉を入れて</b>検索しよう。`;
    }
  }
  return true;
}
// 押した瞬間に同期でコピー（新しいタブに移る前に済ませる）
function copyText(t) {
  try {
    const ta = document.createElement("textarea");
    ta.value = t; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy"); ta.remove();
    if (ok) return true;
  } catch { /* 下へ */ }
  try { navigator.clipboard?.writeText(t); return true; } catch { return false; }
}

// 見る動画・読む本（第2回の最後で決める／Quest 2 で見たもの・読んだもの）。ISBN は本を手に取る Quest 2 だけ（空でも提出できる）
export function pickFields(c, { done = false } = {}) {
  const { field } = c;
  return `
    <div class="findrow">
      ${field("douga", done ? "見た動画のリンク（いくつかなら全部）" : "見る動画のリンク（いくつかなら全部）", { type: "text", placeholder: "https://youtu.be/…", hint: "YouTubeの「共有」→「コピー」" })}
    </div>
    <div class="findrow">
      ${field("honTitle", done ? "読んだ本の題名" : "読む本の題名", { type: "text", placeholder: "例：『〇〇〇〇』" })}
      ${done ? field("isbn", "ISBN", { type: "text", placeholder: "例：9784780802047", hint: "本の裏表紙のバーコードの上か、奥付にある「978」から始まる13桁。第3回に RefNavi に登録するときに使います" }) : ""}
    </div>`;
}
// Quest 2 を初めて開いたとき、第2回で入れた値（探す言葉・見る動画・読む本）を写す（同じことを2回書かせない）
export const FROM_L02 = ["findq", "findb", "douga", "honTitle"];
function copyFromL02(c) {
  if (c.d.fromL02) return;
  const L2 = c.prev("L02");
  FROM_L02.forEach(k => { if (!c.v(k) && String(L2[k] || "").trim()) c.d[k] = L2[k]; });
  c.set("fromL02", 1);
}

export const PICK_TIPS = `
  <p class="hint"><b>ぴったりの本でなくても大丈夫。</b>図書館に行くと、その本の近くに似た本が並んでいます。</p>`;

export const R02 = {
  id: "R02",
  quest: 2,
  title: "「？」の手がかりになりそうな本か動画",
  sub: "第3回で、班で紹介します",
  mapAt: 1, // 地図は「文献」の手前のまま（提出すると「文献」へ）
  after: "L02",
  uses: ["L02"],
  steps: [{ title: "「？」の手がかりになりそうな本か動画", mins: 0 }],
  geminiKey: "",

  render(i, c) {
    const { field, esc } = c;
    copyFromL02(c);
    const qs = qsOf(c.prev("L02"));
    return `
      <div class="recap">
        <div class="tc-row big"><span>第2回で気になったこと</span><b>${qs.length ? `<ul class="qs">${qs.map(q => `<li>${esc(q)}</li>`).join("")}</ul>` : "—"}</b></div>
      </div>
      <p>この「？」の<b>手がかりになりそうな本か動画</b>を見たり読んだりしよう。<br>いちばん心に残った所を1つ、<b>第3回に班で紹介します</b>。</p>
      <div class="share">
        <b>動画なら</b>
        <ul>
          <li>合わせて5分以上見る（短い動画やショートを何本か見てもOK）</li>
          <li>心に残った所は、<b>時間（例：2分05秒）</b>をひとことに書こう。開始位置つきのリンクならもっと良い（YouTubeの「共有」→「開始位置」にチェック→コピー）</li>
        </ul>
        <b>本なら</b>
        <ul>
          <li>パラパラ見て、気になったページを少し読めばOK（学校の図書館・家の本・町の図書館）</li>
          <li>題名・ISBN・心に残ったページを書く。<b>第3回に本を持ってこよう</b></li>
        </ul>
      </div>
      <h3>探す</h3>
      ${findTools(c)}
      ${PICK_TIPS}
      <h3>見たら・読んだら書く</h3>
      ${pickFields(c, { done: true })}
      ${c.v("mono") ? field("mono", "見たもの・読んだもの（前の欄）", { type: "text" }) : ""}
      ${field("kokoro", "いちばん心に残った所と、ひとこと", { rows: 3, hint: "動画は時間（例：2分05秒）、本はページも書こう", placeholder: "例：2分05秒あたり。雑音の大きさによって、集中しやすさが逆になるという話。自分のは小さい音だったのかも" })}
      <p class="hint">手がかりにならなくても大丈夫。第3回で研究を探します。</p>
      ${c.submitted ? `<p class="okmsg">提出済み ✓　あとから直しても自動で保存されます。</p>` : ""}`;
  },

  canNext(i, c) {
    return !!((c.v("douga") || c.v("honTitle") || c.v("mono")) && c.v("kokoro"));
  },

  onClick(t, c) {
    return handleFind(t, c);
  }
};
