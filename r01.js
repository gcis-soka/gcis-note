// ステージ2：Quest 1 の結果（L01のあと、やったらその日のうちに。授業でも書ける）
// data：did（やった／まだ）・yatta・mita・kanji・iikire・yarunara
import { quest } from "./common.js";
const MISSION = quest(1);

const IIKIRE_CHIPS = [
  { label: "1回だけ", text: "1回だけなので、" },
  { label: "自分だけ", text: "自分だけなので、" },
  { label: "〜の場合は？", text: "|の場合は？" } // | の位置にカーソル
];

const done = c => c.v("did") === "やった";
const notYet = c => c.v("did") === "まだ";

// 第1回の内容（説・一歩・予想）
export function recapL01(c) {
  const L1 = c.prev("L01"), esc = c.esc;
  return `
    <div class="recap">
      <div class="tc-row"><span>第1回で「えっ、本当？」と思った説</span><b>${esc(L1.setsu || "—")}</b></div>
      <div class="tc-row"><span>${MISSION}（第1回で決めた一歩）</span><b>${esc(L1.ippo || "—")}</b></div>
      <div class="tc-row"><span>予想</span><b>${esc(L1.yosou || "—")}</b></div>
    </div>`;
}

export const R01 = {
  id: "R01",
  quest: 1,
  title: "やってみたことの結果",
  sub: "やったら、その日のうちに書こう",
  mapAt: 0, // 地図は「一歩」のまま（第2回を出すと「文献」へ）
  after: "L01",
  uses: ["L01"],
  steps: [{ title: "やってみたことの結果", mins: 0 }],
  geminiKey: "",

  render(i, c) {
    const { field } = c;
    let body = "";
    if (done(c)) body = `
      ${field("yatta", "やったこと", { rows: 2, placeholder: "例：無音のときと、カフェの雑音を流したときで、15分ずつ計算問題を解いた" })}
      ${field("mita", "見たこと・数字（なくてもOK）", { rows: 2, placeholder: "例：無音は12問、雑音ありは15問。雑音ありの方が時計を見る回数が少なかった" })}
      ${field("kanji", "感じたこと（予想と違った・意外だった）", { rows: 2, placeholder: "例：予想どおりだったけど、歌詞のある曲だと逆に気が散った" })}
      ${field("iikire", "これだけでは言い切れないこと（1行）", {
        type: "text", placeholder: "例：1回だけなので、毎日そうなるかは分からない",
        hint: "書き出しを押すと入ります", chips: IIKIRE_CHIPS })}`;
    if (notYet(c)) body = `
      ${field("yarunara", "やるとしたら、何をする？（1行）", { type: "text", placeholder: "例：週末に、無音と雑音で15分ずつ問題を解いて比べる" })}
      <p class="note">大丈夫。授業の班では「説・予想・やるとしたら」を話そう。</p>`;
    return `
      ${recapL01(c)}
      <p><b>${MISSION}はやってみた？</b></p>
      <div class="choice">
        <button type="button" class="choice-btn ${done(c) ? "on" : ""}" data-did="やった">やった</button>
        <button type="button" class="choice-btn ${notYet(c) ? "on" : ""}" data-did="まだ">まだ（できなかった）</button>
      </div>
      ${body}
      ${c.submitted ? `<p class="okmsg">提出済み ✓　あとから直しても自動で保存されます。</p>` : ""}`;
  },

  canNext(i, c) {
    return done(c) ? !!(c.v("yatta") && c.v("kanji")) : notYet(c) ? !!c.v("yarunara") : false;
  },

  onClick(t, c) {
    const b = t.closest("[data-did]");
    if (b) { c.set("did", b.dataset.did); c.rerender(); return true; }
    return false;
  }
};
