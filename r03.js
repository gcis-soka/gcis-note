// ステージ6：Quest 3（第3回→第4回 12/7・期末をはさむ）論文を読み切った結果。第3回の授業の残りの時間で始める（11/7）
// 仕様：ナレッジの L03.md「Quest 3」（先生 10/31：分かったこと／まだ分かっていないこと＋気になったこと）
// 11/9 作り直し：2画面（1 論文を読む／2 読み終えたら＝気になったこと・RefNavi・提出）。メモは論文ごと。アプリの中に論文は出さない（reader.js）
// data：yomi1・yomi2（全部読んだ／途中まで／まだ）・wakatta・mada（論文①）・wakatta2・mada2（論文②・11/9）・q1〜q3・
//       p1Url・p2Url・p1Doi・p2Doi・kensaku・tried・sanko（第3回から写し、ここで変えられる）・fromL03
import { quest, memoText } from "./common.js";
export { memoText };
import { setupReader, handleReader, canFloat, isFloating, safeUrl, hostOf } from "./reader.js";
import { searchTools, paperFields, handleSearch, handlePaperInput, REF_FORMAT } from "./l03.js";
import { copyText } from "./r02.js";

// 初めて開いたとき、第3回の論文のURLと検索語を写す（論文を変えるのは Quest 3 の中で：11/7）
const FROM_L03 = ["p1Url", "p2Url", "p1Doi", "p2Doi", "kensaku", "tried", "sanko"];
function copyFromL03(c) {
  if (c.d.fromL03) return;
  const L3 = c.prev("L03");
  FROM_L03.forEach(k => { if (!c.v(k) && String(L3[k] || "").trim()) c.d[k] = L3[k]; });
  c.set("fromL03", 1);
}
const Q = quest(3);
const YOMI = ["全部読んだ", "途中まで", "まだ"];

// 論文ごとの欄の名前（①は前からの名前のまま）
const KEYS = [{ w: "wakatta", m: "mada", y: "yomi1", u: "p1Url" }, { w: "wakatta2", m: "mada2", y: "yomi2", u: "p2Url" }];
const papersOf = c => KEYS.map((k, j) => ({ j, no: j ? "②" : "①", raw: c.v(k.u), url: safeUrl(c.v(k.u)) })).filter(p => p.raw);
const doneOf = (c, j) => !!(c.v(KEYS[j].w) && c.v(KEYS[j].m));

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

const fieldsOf = j => [
  { key: KEYS[j].w, label: "分かったこと", placeholder: "何を・誰に・どうやって調べて、何が分かった？", rows: 6, chips: WAKATTA_CHIPS },
  { key: KEYS[j].m, label: "まだ分かっていないこと", placeholder: "論文の最後の「今後の課題」や、自分の場面との違いを見てみよう", rows: 4, chips: MADA_CHIPS }
];

// 画面1：論文を読む
function readStep(c) {
  const { field, esc, d } = c;
  const ps = papersOf(c);
  const pick = setupReader(c, { papers: ps, fields: j => fieldsOf(ps[j]?.j ?? 0), yomi: j => KEYS[ps[j]?.j ?? 0].y, YOMI });
  const findFold = open => `
      <details class="fold" ${open ? "open" : ""}>
        <summary>${ps.length ? "論文を変えたいとき・もう1本足したいとき" : "論文を探す"}</summary>
        ${searchTools(c)}
        ${paperFields(c)}
      </details>`;
  if (!ps.length) return `<p class="note">まだ論文がありません。下で探して、URLを入れよう。</p>${findFold(true)}`;
  const p = ps[pick], k = KEYS[p.j], fl = canFloat() && p.url, floating = isFloating();
  const tabs = ps.length > 1 ? `
      <div class="ptabs" role="tablist">${ps.map((x, j) => `
        <button type="button" role="tab" class="ptab ${j === pick ? "on" : ""}" data-reader-pick="${j}" aria-selected="${j === pick}">
          <b>論文${x.no}</b><span>${esc(d[KEYS[x.j].y] || (doneOf(c, x.j) ? "メモあり" : "これから"))}</span>
        </button>`).join("")}
      </div>` : "";
  return `
    <div data-reader-root>
      <p class="lead">論文を読みながら、<b>分かったこと</b>と<b>まだ分かっていないこと</b>をメモしよう。今日は途中まででOK。続きは授業の外で読み切ります。</p>
      <details class="fold tips">
        <summary>読み方のコツ</summary>
        <ul>
          <li>知らない言葉は、すぐ調べなくてOK。印をつけて先へ</li>
          <li>「何を・誰に・どうやって調べたか」と「何が分かったか」を探しながら読む</li>
          <li>最後の「まとめ・今後の課題」に、<b>まだ分かっていないこと</b>が書いてあることが多い</li>
        </ul>
      </details>
      ${tabs}
      <div class="pcard ${ps.length > 1 ? "tabbed" : ""}">
        <div class="pcard-head">
          <b>論文${p.no}</b>
          <span class="hint">${esc(p.url ? hostOf(p.url) : p.raw)}</span>
          ${p.url ? `<button type="button" class="btn small ghost" data-reader-split="${esc(p.url)}">右半分に開く ↗</button>` : ""}
        </div>
        ${fl ? (floating
          ? `<p class="pfloat-on">📝 いま小さな窓でメモしています。書いた分は、この下の欄に入ります。</p>`
          : `<button type="button" class="btn primary big pfloat" data-reader-float>📝 メモを浮かせて、論文${p.no}を読む</button>
             <p class="hint">メモだけの小さな窓が出ます。その窓の「論文を開く」で論文が開き、メモは論文の上に浮かんだままになります。</p>`) : ""}
        ${field(k.w, "分かったこと", { rows: 5, placeholder: "何を・誰に・どうやって調べて、何が分かった？", hint: "書き出しを押すと入ります", chips: WAKATTA_CHIPS })}
        ${field(k.m, "まだ分かっていないこと", { rows: 4, placeholder: "論文の最後の「今後の課題」や、自分の場面との違いを見てみよう", chips: MADA_CHIPS })}
        <div class="field"><span class="label">どこまで読んだ？</span>
          <div class="choice small">${YOMI.map(y => `<button type="button" class="choice-btn ${d[k.y] === y ? "on" : ""}" data-yomi="${k.y}" data-val="${y}">${y}</button>`).join("")}</div>
        </div>
        ${ps.length > 1 && pick === 0 ? `<p class="hint">読めたら、上の<b>「論文②」</b>へ。</p>` : ""}
      </div>
      ${findFold(false)}
    </div>`;
}

// 画面2：読み終えたら（気になったこと・RefNavi・提出）
function afterStep(c) {
  const { field, chips } = c;
  return `
      <p class="lead">論文を読んで、<b>気になったこと</b>はある？ 第4回で問いを立てるときのタネになります。</p>
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
      ${doiList(c)}
      <div class="searchbtns"><button type="button" class="btn ghost" data-refnavi-open>RefNavi を右半分に開く ↗</button></div>
      ${field("sanko", "参考文献リスト（RefNavi から貼る）", { rows: 6, hint: "第3回に貼ったものが入っています。論文を足したら貼り直そう" })}
      <p class="hint">がんばって、読めるところまで読んでみよう！ 別の論文にしたくなったら、「もどる」で1つ前の画面の「論文を変えたいとき」から。</p>
      ${c.submitted ? `<p class="okmsg">提出済み ✓　あとから直しても自動で保存されます。</p>` : ""}`;
}
// RefNavi に貼る DOI（コピーボタンつき）
function doiList(c) {
  const xs = [["①", "p1Doi", "p1Url"], ["②", "p2Doi", "p2Url"]].map(([no, dk, uk]) => ({ no, doi: c.v(dk), url: c.v(uk) })).filter(x => x.doi || x.url);
  if (!xs.length) return "";
  return `<div class="recap">${xs.map(x => `<div class="tc-row"><span>論文${x.no}</span><b>${x.doi
    ? `DOI ${c.esc(x.doi)} <button type="button" class="btn small ghost" data-copytext="${c.esc(x.doi)}">コピー</button>`
    : `<span class="hint">DOI なし → URL で登録</span> <button type="button" class="btn small ghost" data-copytext="${c.esc(x.url)}">URLをコピー</button>`}</b></div>`).join("")}</div>`;
}

export const R03 = {
  id: "R03",
  quest: 3,
  title: "論文を読んだ結果",
  sub: "第4回（12/7）までに",
  mapAt: 2, // 文献（提出すると「問い」へ）
  after: "L03",
  uses: ["L03"],
  steps: [{ title: "論文を読む", mins: 0 }, { title: "読み終えたら", mins: 0 }],
  geminiKey: "",

  render(i, c) {
    copyFromL03(c);
    return i === 0 ? readStep(c) : afterStep(c);
  },

  onInput(el, c) { handlePaperInput(el, c); },

  // 画面1：どちらかの論文で「分かったこと」と「まだ分かっていないこと」が書けたら次へ
  canNext(i, c) {
    if (i === 0) return doneOf(c, 0) || doneOf(c, 1);
    return true;
  },
  need(i, c) {
    if (i === 0) return ["どちらかの論文の「分かったこと」と「まだ分かっていないこと」"];
    return [];
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
    const cp = t.closest("[data-copytext]");
    if (cp) {
      copyText(cp.dataset.copytext);
      const was = cp.textContent; cp.textContent = "コピーしました ✓";
      setTimeout(() => { cp.textContent = was; }, 1500);
      return true;
    }
    const b = t.closest("[data-yomi]");
    if (b) { // 描き直さずに印だけ変える（画面が上に戻らないように）
      c.set(b.dataset.yomi, b.dataset.val);
      b.parentElement.querySelectorAll(".choice-btn").forEach(x => x.classList.toggle("on", x === b));
      const tab = c.app.querySelector(".ptab.on span"); if (tab) tab.textContent = b.dataset.val;
      return true;
    }
    return false;
  }
};

export { YOMI };
