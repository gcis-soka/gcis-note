// ステージ4：Quest 2（第2回→第3回）「？」の手がかりになりそうな本か動画
// 仕様：ナレッジの L03.md「Quest 2」。授業中に始められる子は始める
// data：mono（見たもの・読んだもの：動画はリンク、本は題名）・kokoro（いちばん心に残った所と、ひとこと）
import { quest } from "./common.js";
const Q = quest(2);

const qsOf = d => ["q1", "q2", "q3"].map(k => String(d[k] || "").trim()).filter(Boolean);

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
      <p>この「？」の<b>手がかりになりそうな本か動画</b>を1つ選んで、見たり読んだりしよう。<br>いちばん心に残った所を1つ、第3回に持ってきます。</p>
      <div class="share">
        <b>動画なら</b>
        <ul>
          <li>5分以上見る（ショートでもOK）</li>
          <li>心に残った所は<b>開始位置つきのリンク</b>で：YouTubeの「共有」→「開始位置」にチェック→コピー</li>
        </ul>
        <b>本なら</b>
        <ul>
          <li>少し読めばOK（学校の図書館・家の本・町の図書館）</li>
          <li>題名と、心に残ったページを書く。<b>第3回に本を持ってこよう</b></li>
        </ul>
      </div>
      ${field("mono", "見たもの・読んだもの（動画はリンク、本は題名とページ）", { type: "text", placeholder: "例：https://youtu.be/…?t=125　／　『〇〇〇〇』p.48" })}
      ${field("kokoro", "いちばん心に残った所と、ひとこと", { rows: 3, placeholder: "例：雑音の大きさによって、集中しやすさが逆になるという話。自分のは小さい音だったのかも" })}
      <p class="hint">手がかりにならなくても大丈夫。第3回で研究を探します。</p>
      ${c.submitted ? `<p class="okmsg">提出済み ✓　あとから直しても自動で保存されます。</p>` : ""}`;
  },

  canNext(i, c) {
    return !!(c.v("mono") && c.v("kokoro"));
  }
};
