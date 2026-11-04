// ステージ6：Quest 3（第3回→第4回 12/7・期末をはさむ）論文を読み切った結果
// 仕様：ナレッジの L03.md「Quest 3」（先生 10/31：分かったこと／まだ分かっていないこと＋気になったこと）
// data：yomi1・yomi2（全部読んだ／途中まで／まだ）・wakatta・mada・q1〜q3
import { quest } from "./common.js";
const Q = quest(3);

const safeUrl = u => /^https?:\/\//i.test(String(u || "").trim()) ? String(u).trim() : "";
const YOMI = ["全部読んだ", "途中まで", "まだ"];

const Q_CHIPS = [
  { label: "なんで〜？", text: "なんで|？" },
  { label: "本当に〜？", text: "本当に|？" },
  { label: "〜な人でも同じ？", text: "|な人でも同じ？" },
  { label: "どのくらい〜？", text: "どのくらい|？" },
  { label: "〜の場合は？", text: "|の場合は？" }
];
const WAKATTA_CHIPS = [
  { label: "〜を調べたら、〜だった", text: "|を調べたら、" },
  { label: "〜と比べたら", text: "|と比べたら、" }
];
const MADA_CHIPS = [
  { label: "〜の場合は調べていない", text: "|の場合は調べていない" },
  { label: "なぜ〜かは分かっていない", text: "なぜ|かは分かっていない" },
  { label: "今後の課題に〜とあった", text: "今後の課題に「|」とあった" }
];

export const R03 = {
  id: "R03",
  quest: 3,
  title: "論文を読んだ結果",
  sub: "第4回（12/7）までに",
  mapAt: 2, // 文献（提出すると「問い」へ）
  after: "L03",
  uses: ["L03"],
  steps: [{ title: "論文を読んだ結果", mins: 0 }],
  geminiKey: "",

  render(i, c) {
    const { field, chips, esc, d } = c;
    const L3 = c.prev("L03");
    const ps = [["p1Title", "p1Url", "yomi1"], ["p2Title", "p2Url", "yomi2"]]
      .map(([t, u, k], j) => ({ no: j ? "②" : "①", title: String(L3[t] || "").trim(), url: safeUrl(L3[u]), key: k }))
      .filter(p => p.title);
    const rows = ps.map(p => `
      <div class="tc-row"><span>論文${p.no}</span><b>${p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.title)} ↗</a>` : esc(p.title)}</b></div>
      <div class="choice small">${YOMI.map(y => `<button type="button" class="choice-btn ${d[p.key] === y ? "on" : ""}" data-yomi="${p.key}" data-val="${y}">${y}</button>`).join("")}</div>`).join("");
    return `
      <div class="recap">${rows || `<div class="tc-row"><span>論文</span><b>第3回で決めた論文がありません。ホームの「第3回」から書き足そう</b></div>`}</div>
      <p>読み切ったら、<b>分かったこと</b>と<b>まだ分かっていないこと</b>を書こう。2本まとめてでOK。</p>
      ${field("wakatta", "分かったこと（何を・誰に・どうやって調べて、何が分かった？）", { rows: 4, hint: "書き出しを押すと入ります", chips: WAKATTA_CHIPS })}
      ${field("mada", "まだ分かっていないこと", { rows: 3, hint: "論文の最後の「今後の課題」や、自分の場面との違いを見てみよう", chips: MADA_CHIPS })}
      <div class="field"><span class="label">気になったこと（「？」で終わる形・なくてもOK）</span><span class="hint">書き出しを押すと、空いている欄に入ります</span>${chips(Q_CHIPS, "q1,q2,q3")}</div>
      ${field("q1", "①", { type: "text", qmark: true })}
      ${field("q2", "②", { type: "text", qmark: true })}
      ${field("q3", "③", { type: "text", qmark: true })}
      <p class="hint">難しくて読み切れなくても大丈夫。読めたところまでで書こう。第4回のはじめにも、読む時間があります。</p>
      ${c.submitted ? `<p class="okmsg">提出済み ✓　あとから直しても自動で保存されます。</p>` : ""}`;
  },

  canNext(i, c) {
    return !!(c.v("wakatta") && c.v("mada"));
  },

  onClick(t, c) {
    const b = t.closest("[data-yomi]");
    if (b) { c.set(b.dataset.yomi, b.dataset.val); c.rerender(); return true; }
    return false;
  }
};

export { YOMI };
