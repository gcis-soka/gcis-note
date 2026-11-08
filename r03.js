// ステージ6：Quest 3（第3回→第4回 12/7・期末をはさむ）論文を読み切った結果。第3回の授業の残りの時間で始める（11/7）
// 仕様：ナレッジの L03.md「Quest 3」（先生 10/31：分かったこと／まだ分かっていないこと＋気になったこと）
// data：yomi1・yomi2（全部読んだ／途中まで／まだ）・wakatta・mada・q1〜q3・p1Url・p2Url・p1Doi・p2Doi・kensaku・tried・sanko（第3回から写し、ここで変えられる）・fromL03
import { quest } from "./common.js";
import { readerHtml, handleReader } from "./reader.js";
import { searchTools, paperFields, handleSearch, handlePaperInput, REF_FORMAT } from "./l03.js";

// 初めて開いたとき、第3回の論文のURLと検索語を写す（論文を変えるのは Quest 3 の中で：11/7）
const FROM_L03 = ["p1Url", "p2Url", "p1Doi", "p2Doi", "kensaku", "tried", "sanko"];
function copyFromL03(c) {
  if (c.d.fromL03) return;
  const L3 = c.prev("L03");
  FROM_L03.forEach(k => { if (!c.v(k) && String(L3[k] || "").trim()) c.d[k] = L3[k]; });
  c.set("fromL03", 1);
}
const Q = quest(3);

const safeUrl = u => /^https?:\/\//i.test(String(u || "").trim()) ? String(u).trim() : "";
const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
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
    copyFromL03(c);
    // 論文は URL だけ（題名は RefNavi：11/7）。第3回から写した値を、ここで変えられる
    const ps = [["p1Url", "yomi1"], ["p2Url", "yomi2"]]
      .map(([u, k], j) => ({ no: j ? "②" : "①", raw: c.v(u), url: safeUrl(c.v(u)), key: k }))
      .filter(p => p.raw);
    const rows = ps.map(p => `
      <div class="tc-row"><span>論文${p.no}</span><b>${p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">開く ↗</a> <span class="hint">${esc(hostOf(p.url))}</span>` : esc(p.raw)}</b></div>
      <div class="choice small">${YOMI.map(y => `<button type="button" class="choice-btn ${d[p.key] === y ? "on" : ""}" data-yomi="${p.key}" data-val="${y}">${y}</button>`).join("")}</div>`).join("");
    return `
      <div class="recap">${rows || `<div class="tc-row"><span>論文</span><b>論文がありません。下の「論文を探す」で見つけよう</b></div>`}</div>
      <details class="fold">
        <summary>論文を探す（変えたくなったとき・見つけ直すとき）</summary>
        ${searchTools(c)}
        ${paperFields(c)}
      </details>
      <p><b>論文①から読みはじめよう。</b>第3回の授業の残りの時間で始めて、続きは授業の外で読み切ります。読みながら、<b>分かったこと</b>と<b>まだ分かっていないこと</b>を書こう。2本まとめてでOK。</p>
      <div class="share">
        <b>読み方のコツ</b>
        <ul>
          <li>知らない言葉は、すぐ調べなくてOK。印をつけて先へ</li>
          <li>「何を・誰に・どうやって調べたか」と「何が分かったか」を探しながら読む</li>
          <li>最後の「まとめ・今後の課題」に、<b>まだ分かっていないこと</b>が書いてあることが多い</li>
        </ul>
      </div>
      ${readerHtml(c, ps.map(p => ({ no: p.no, url: p.url })), `
        ${field("wakatta", "分かったこと（何を・誰に・どうやって調べて、何が分かった？）", { rows: 6, hint: "書き出しを押すと入ります", chips: WAKATTA_CHIPS })}
        ${field("mada", "まだ分かっていないこと", { rows: 5, hint: "論文の最後の「今後の課題」や、自分の場面との違いを見てみよう", chips: MADA_CHIPS })}`,
        [{ key: "wakatta", label: "分かったこと（何を・誰に・どうやって調べて、何が分かった？）", rows: 9 }, { key: "mada", label: "まだ分かっていないこと", rows: 6 }])}
      <div class="field"><span class="label">気になったこと（「？」で終わる形・なくてもOK）</span><span class="hint">書き出しを押すと、空いている欄に入ります</span>${chips(Q_CHIPS, "q1,q2,q3")}</div>
      ${field("q1", "①", { type: "text", qmark: true })}
      ${field("q2", "②", { type: "text", qmark: true })}
      ${field("q3", "③", { type: "text", qmark: true })}
      <h3>論文も RefNavi に登録して、参考文献リストを新しくしよう</h3>
      <ol class="todo">
        <li>RefNavi のホームの「メディアの選択」で論文を選び、「ISBN コード／DOI コード／URL」の欄に<b>論文のDOI</b>を貼って登録（DOIがない論文はURLで）</li>
        <li>「整理する」の「リスト」で全部にチェック →「出力」→ ${REF_FORMAT ? `「${REF_FORMAT}」` : "先生が指定した書式"} → コピー</li>
        <li>下の欄を消して、貼り直す</li>
      </ol>
      <div class="searchbtns"><button type="button" class="btn ghost" data-refnavi-open>RefNavi を右半分に開く ↗</button></div>
      ${field("sanko", "参考文献リスト（RefNavi から貼る）", { rows: 6, hint: "第3回に貼ったものが入っています。論文を足したら貼り直そう" })}
      <p class="hint">がんばって、読めるところまで読んでみよう！ 途中で別の論文にしたくなったら、もう一度探して変えてもOK（上の「論文を探す」を開いて、URLを入れ直そう）。</p>
      ${c.submitted ? `<p class="okmsg">提出済み ✓　あとから直しても自動で保存されます。</p>` : ""}`;
  },

  onInput(el, c) { handlePaperInput(el, c); },

  canNext(i, c) {
    return !!(c.v("wakatta") && c.v("mada"));
  },

  onClick(t, c) {
    if (handleReader(t, c)) return true;
    if (handleSearch(t, c)) return true;
    if (t.closest("[data-refnavi-open]")) {
      const W = screen.availWidth || 1366, H = screen.availHeight || 768, u = "https://www.refnavi.net/index.php";
      const w = window.open(u, "gcis_refnavi", `popup=yes,left=${Math.round(W / 2)},top=0,width=${Math.round(W / 2)},height=${H}`) || window.open(u, "_blank");
      try { w?.focus(); } catch { /* なし */ }
      return true;
    }
    const b = t.closest("[data-yomi]");
    if (b) { c.set(b.dataset.yomi, b.dataset.val); c.rerender(); return true; }
    return false;
  }
};

export { YOMI };
