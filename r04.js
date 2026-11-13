// ステージ8：Quest 4（第4回 12/7 → 第5回 12/14）序の口をやってみた記録（11/10 先生）
// 第4回で立てた長めの計画のうち、序の口（12/14まで・小さく）をやってきて、やったことを足す場所。
// 第5回で途中経過を班で報告し、対象を広げる計画に直す（安全・倫理の点検もそこで）
// 記録は「分かったこと｜やってみて気になったこと」の2列（Quest 3 と同じ形。第6回の RQ の材料になる）
// data：did（やった／まだ）・yatta・wakatta・kini・zure・hirogeru・yarunara
import { quest } from "./common.js";
const MISSION = quest(4);

const ZURE_CHIPS = [
  { label: "予想どおりだった", text: "予想どおりだった。" },
  { label: "予想と違った", text: "予想と違って、|" },
  { label: "意外だったのは", text: "意外だったのは、|" }
];
const KINI_CHIPS = [
  { label: "なぜ〜なんだろう？", text: "なぜ|なんだろう？" },
  { label: "〜の場合はどうなる？", text: "|の場合はどうなる？" },
  { label: "人数を増やしても同じ？", text: "人数を増やしても同じ？" }
];

const done = c => c.v("did") === "やった";
const notYet = c => c.v("did") === "まだ";

// 第4回の計画（選んだ問い・予想・調べ方・序の口）
function recapL04(c) {
  const L4 = c.prev("L04"), esc = c.esc;
  return `
    <div class="recap">
      <div class="tc-row"><span>選んだ問い（第4回）</span><b>${esc(L4.toi || "—")}</b></div>
      <div class="tc-row"><span>予想</span><b>${esc(L4.yosou || "—")}</b></div>
      <div class="tc-row"><span>調べ方</span><b>${esc(L4.houhou || "—")}${L4.houhou2 ? `（あわせて${esc(L4.houhou2)}）` : ""}</b></div>
      <div class="tc-row big"><span>序の口（12/14まで）</span><b>${esc(L4.yotei || "—")}</b></div>
    </div>`;
}

export const R04 = {
  id: "R04",
  quest: 4,
  title: "序の口をやってみる",
  sub: "第5回（12/14）までに。やったら、その日のうちに書こう",
  mapAt: 4, // 計画（提出すると「着手」へ）
  after: "L04",
  uses: ["L04"],
  steps: [{ title: "序の口の記録", mins: 0 }],
  geminiKey: "",

  render(i, c) {
    const { field } = c;
    let body = "";
    if (done(c)) body = `
      ${field("yatta", "やったこと（いつ・だれと／何で・どれくらい）", { rows: 2, placeholder: "例：12/9に家で、無音と雑音で15分ずつ計算問題を2回解いた" })}
      <div class="memo2">
        ${field("wakatta", "分かったこと（見たこと・数字も）", { rows: 5, placeholder: "例：無音は12問・14問、雑音ありは15問・15問。雑音ありの方が時計を見る回数が少なかった" })}
        ${field("kini", "やってみて気になったこと（1行に1つ）", { rows: 5, placeholder: "えっ？と思ったこと・疑問・計画でうまくいかなかったところ", chips: KINI_CHIPS })}
      </div>
      ${field("zure", "予想とのズレ", { rows: 2, hint: "書き出しを押すと入ります", chips: ZURE_CHIPS })}
      ${field("hirogeru", "次は、どう広げたい？（なくてもOK）", { rows: 2, placeholder: "例：自分だけでなく、クラスの友だち10人にもやってもらいたい" })}
      <p class="note">第5回では、班で途中経過を報告して、<b>対象を広げる</b>計画に直します。</p>`;
    if (notYet(c)) body = `
      ${field("yarunara", "いつ・何からやる？（1行）", { type: "line", placeholder: "例：12/12の放課後に、まず自分で15分ずつ試す" })}
      <p class="note">大丈夫。第5回の班では「計画と、いつ・何からやるか」を話そう。</p>`;
    return `
      ${recapL04(c)}
      <p><b>序の口はやってみた？</b></p>
      <div class="choice">
        <button type="button" class="choice-btn ${done(c) ? "on" : ""}" data-did="やった">やった</button>
        <button type="button" class="choice-btn ${notYet(c) ? "on" : ""}" data-did="まだ">まだ（できなかった）</button>
      </div>
      ${body}
      ${c.submitted ? `<p class="okmsg">提出済み ✓　あとから直しても自動で保存されます。</p>` : ""}`;
  },

  canNext(i, c) {
    return done(c) ? !!(c.v("yatta") && c.v("wakatta")) : notYet(c) ? !!c.v("yarunara") : false;
  },
  need(i, c) {
    if (done(c)) return ["「やったこと」と「分かったこと」"];
    if (notYet(c)) return ["「いつ・何からやる？」"];
    return ["「やった」か「まだ」"];
  },

  onClick(t, c) {
    const b = t.closest("[data-did]");
    if (b) { c.set("did", b.dataset.did); c.rerender(); return true; }
    return false;
  }
};

export { MISSION };
