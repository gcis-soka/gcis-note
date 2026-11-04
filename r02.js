// ステージ4：Quest 2（第2回→第3回）「？」の手がかりになりそうな本か動画
// 仕様：ナレッジの L03.md「Quest 2」。授業中に始められる子は始める
// data：findq（探す言葉）・mono（見たもの・読んだもの：動画はリンク、本は題名）・kokoro（いちばん心に残った所と、ひとこと）
import { quest, LIBRARY_URL, YOUTUBE_SEARCH } from "./common.js";
const Q = quest(2);

const qsOf = d => ["q1", "q2", "q3"].map(k => String(d[k] || "").trim()).filter(Boolean);

// 本か動画を探す道具（第2回の最後と Quest 2 で使う）。key：検索語を入れる欄
export function findTools(c, key = "findq") {
  const { esc, d } = c;
  return `
    <div class="field"><label><span class="label">探す言葉</span><span class="hint">AIの言葉でも、自分の言葉でもOK</span>
      <input data-key="${key}" type="text" value="${esc(d[key] || "")}" placeholder="例：集中力 雑音 実験"></label></div>
    <div class="searchbtns">
      <button type="button" class="btn" data-find="youtube" data-findkey="${key}">YouTubeで探す ↗</button>
      <button type="button" class="btn ghost" data-find="library" data-findkey="${key}">学校図書館の蔵書検索 ↗</button>
    </div>`;
}
export function handleFind(t, c) {
  const b = t.closest("[data-find]");
  if (!b) return false;
  const q = c.v(b.dataset.findkey);
  if (b.dataset.find === "youtube") {
    if (!q) { alert("先に探す言葉を入れてね"); return true; }
    window.open(YOUTUBE_SEARCH(q), "_blank", "noopener");
  } else {
    window.open(LIBRARY_URL.includes("{q}") ? LIBRARY_URL.replace("{q}", encodeURIComponent(q)) : LIBRARY_URL, "_blank", "noopener");
  }
  return true;
}
export const PICK_TIPS = `
  <p class="hint">図書館に行くと、探していた本の近くにある本も見られます。気になったら手に取ってみよう。</p>`;

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
    const qs = qsOf(c.prev("L02"));
    return `
      <div class="recap">
        <div class="tc-row big"><span>第2回で気になったこと</span><b>${qs.length ? `<ul class="qs">${qs.map(q => `<li>${esc(q)}</li>`).join("")}</ul>` : "—"}</b></div>
      </div>
      <p>この「？」の<b>手がかりになりそうな本か動画</b>を選んで、見たり読んだりしよう。<br>いちばん心に残った所を1つ、第3回に持ってきます。</p>
      <div class="share">
        <b>動画なら</b>
        <ul>
          <li>合わせて5分以上見る（短い動画やショートを何本か見てもOK）</li>
          <li>心に残った所は<b>開始位置つきのリンク</b>で：YouTubeの「共有」→「開始位置」にチェック→コピー</li>
        </ul>
        <b>本なら</b>
        <ul>
          <li>少し読めばOK（学校の図書館・家の本・町の図書館）</li>
          <li>題名と、心に残ったページを書く。<b>第3回に本を持ってこよう</b></li>
        </ul>
      </div>
      <h3>探す</h3>
      ${findTools(c)}
      ${PICK_TIPS}
      <h3>見たら・読んだら書く</h3>
      ${field("mono", "見たもの・読んだもの（動画はリンク、本は題名とページ。いくつかなら全部）", { type: "text", placeholder: "例：https://youtu.be/…?t=125　／　『〇〇〇〇』p.48" })}
      ${field("kokoro", "いちばん心に残った所と、ひとこと", { rows: 3, placeholder: "例：雑音の大きさによって、集中しやすさが逆になるという話。自分のは小さい音だったのかも" })}
      <p class="hint">手がかりにならなくても大丈夫。第3回で研究を探します。</p>
      ${c.submitted ? `<p class="okmsg">提出済み ✓　あとから直しても自動で保存されます。</p>` : ""}`;
  },

  canNext(i, c) {
    return !!(c.v("mono") && c.v("kokoro"));
  },

  onClick(t, c) {
    return handleFind(t, c);
  }
};
