// ステージ6：Quest 3（第3回→第4回 12/7・期末をはさむ）論文を読み切った結果。第3回の授業の残りの時間で始める（11/7）
// 仕様：ナレッジの L03.md「Quest 3」（先生 10/31：分かったこと／まだ分かっていないこと＋気になったこと）
// 11/9 作り直し：2画面（1 論文を読む／2 読み終えたら＝気になったこと・RefNavi・提出）。メモは論文ごと。アプリの中に論文は出さない（reader.js）
// 11/10 先生：メモの右の欄を「まだ分かっていないこと」→「読みながら気になったこと」（教科書 p.60 d 疑問点・不足事項）。
//       右の欄の1行＝1枚の札。画面2で札から「確かめてみたい？」を q1〜q3 に選ぶ。欄の名前（mada…）は前のまま
// data：yomi1〜3（全部読んだ／途中まで／まだ）・wakatta・mada（論文①。mada＝読みながら気になったこと）・wakatta2・mada2（論文②・11/9）・wakatta3・mada3（論文③・11/9）・q1〜q3・
//       p1Url〜p3Url・p1Doi〜p3Doi（①②は第3回から写し、ここで変えられる。③は Quest 3 だけ）・kensaku・tried・sanko・fromL03
import { quest, memoText, doiOf } from "./common.js";
export { memoText };
import { setupReader, handleReader, canFloat, isFloating, safeUrl, hostOf, paperOpenUrl } from "./reader.js";
import { searchTools, paperFields, handleSearch, handlePaperInput, doiLink, REF_FORMAT, REF_TAG, REF_PAPER_HOWTO } from "./l03.js";
import { copyText } from "./r02.js";

// 第3回の論文のURL・DOI・検索語を写す（論文を変えるのは Quest 3 の中で：11/7）。
// 11/9：開くたびに、Quest 3 でまだ一度も触っていない欄（値がない＝undefined）にだけ写す。
// 先に Quest 3 を開いてから第3回に DOI を入れても写るように。Quest 3 で消した欄（""）は写し直さない
const FROM_L03 = ["p1Url", "p2Url", "p1Doi", "p2Doi", "kensaku", "tried", "sanko"];
function copyFromL03(c) {
  const L3 = c.prev("L03");
  let n = 0;
  FROM_L03.forEach(k => {
    const v = String(L3[k] || "").trim();
    if (c.d[k] === undefined && v) { c.d[k] = /Doi$/.test(k) ? (doiLink(v) || v) : v; n++; }
  });
  if (n || !c.d.fromL03) c.set("fromL03", 1);
}
const Q = quest(3);
const YOMI = ["全部読んだ", "途中まで", "まだ"];

// 論文ごとの欄の名前（①は前からの名前のまま）
// 論文③は「もっと読みたくなった」生徒のため（11/9 先生）。欄は Quest 3 の「論文を変えたいとき・もう1本足したいとき」の中
const KEYS = [{ w: "wakatta", m: "mada", y: "yomi1", u: "p1Url" }, { w: "wakatta2", m: "mada2", y: "yomi2", u: "p2Url" }, { w: "wakatta3", m: "mada3", y: "yomi3", u: "p3Url" }];
const NO = ["①", "②", "③"];
const papersOf = c => KEYS.map((k, j) => ({ j, no: NO[j], raw: c.v(k.u), url: safeUrl(c.v(k.u)), doi: c.v(`p${j + 1}Doi`) })).filter(p => p.raw);
const sigOf = ps => ps.map(p => p.j).join(",");
let shownSig = ""; // いまタブに出ている論文の組（③を入れたときにタブを足すため）
let keepFold = false; // 描き直しても「論文を変えたいとき」を開いたままにする
const readerConf = ps => ({ papers: ps, fields: j => fieldsOf(ps[j]?.j ?? 0), yomi: j => KEYS[ps[j]?.j ?? 0].y, YOMI });
// 論文のタブ（2本以上のとき）
function tabsHtml(c, ps, pick) {
  if (ps.length < 2) return "";
  return `<div class="ptabs" role="tablist">${ps.map((x, j) => `
        <button type="button" role="tab" class="ptab ${j === pick ? "on" : ""}" data-reader-pick="${j}" aria-selected="${j === pick}">
          <b>論文${x.no}</b><span>${c.esc(c.d[KEYS[x.j].y] || (doneOf(c, x.j) ? "メモあり" : "これから"))}</span>
        </button>`).join("")}
      </div>`;
}
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
// 右の欄：読みながら気になったこと（1行に1つ。あとで札になる）
const MADA_CHIPS = [
  { label: "えっ、〜って本当？", text: "えっ、|って本当？" },
  { label: "なぜ〜なんだろう？", text: "なぜ|なんだろう？" },
  { label: "〜の場合はどうなる？", text: "|の場合はどうなる？" },
  { label: "今後の課題に〜とあった", text: "今後の課題に「|」とあった" }
];
const MADA_LABEL = "読みながら気になったこと";
const MADA_PH = "えっ？と思ったこと・疑問・足りないと思ったところ。1行に1つ書こう";

const fieldsOf = j => [
  { key: KEYS[j].w, label: "分かったこと", placeholder: "何を・誰に・どうやって調べて、何が分かった？", rows: 5, chips: WAKATTA_CHIPS },
  { key: KEYS[j].m, label: MADA_LABEL, placeholder: MADA_PH, rows: 5, chips: MADA_CHIPS }
];

// 浮かせて読むようすの図（11/9 先生の画面写真：論文の PDF が画面いっぱい、その下にメモの小さな窓）。題名・本文は線だけの見本
const FLOAT_HOWTO = `
  <figure class="urlhowto floathowto" aria-label="論文のPDFを画面いっぱいに開き、その上にメモの小さな窓を浮かせて書く">
    <svg viewBox="0 0 540 262" role="img" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="538" height="260" rx="10" fill="#525659" stroke="#c9ced8"/>
      <path d="M1 11a10 10 0 0 1 10-10h518a10 10 0 0 1 10 10v19H1z" fill="#e3e8f2"/>
      <text x="14" y="21" font-size="11" fill="#5f6673">jstage.jst.go.jp/article/…/_pdf</text>
      <rect x="1" y="30" width="538" height="20" fill="#3c3f43"/>
      <text x="270" y="44" font-size="10" fill="#ddd" text-anchor="middle">1 / 4　　－ 100% ＋</text>
      <rect x="150" y="58" width="240" height="200" fill="#fff"/>
      <rect x="196" y="72" width="148" height="9" rx="2" fill="#444"/>
      <rect x="226" y="88" width="88" height="5" rx="2" fill="#999"/>
      <path d="M172 106 H368 M172 116 H368 M172 126 H368 M172 136 H330" stroke="#bbb" stroke-width="4"/>
      <text x="400" y="80" font-size="11" fill="#fff">論文が画面いっぱいに</text>
      <rect x="44" y="148" width="452" height="108" rx="8" fill="#fff" stroke="#1f6f5c" stroke-width="2"/>
      <rect x="45" y="149" width="450" height="16" rx="7" fill="#f1f3f4"/>
      <text x="54" y="161" font-size="9" fill="#5f6673">メモ（探究ノート）</text>
      <rect x="54" y="172" width="96" height="20" rx="7" fill="#f6f3ec"/>
      <rect x="56" y="174" width="46" height="16" rx="6" fill="#fff"/><text x="79" y="186" font-size="10" font-weight="700" fill="#1f6f5c" text-anchor="middle">論文①</text>
      <text x="126" y="186" font-size="10" fill="#646a75" text-anchor="middle">論文②</text>
      <rect x="160" y="172" width="150" height="20" rx="10" fill="#1f6f5c"/><text x="235" y="186" font-size="10" font-weight="700" fill="#fff" text-anchor="middle">論文①を開く ↗</text>
      <rect x="156" y="168" width="158" height="28" rx="13" fill="none" stroke="#d93025" stroke-width="3"/>
      <circle cx="330" cy="182" r="11" fill="#d93025"/><text x="325" y="187" font-size="13" font-weight="700" fill="#fff">2</text>
      <text x="56" y="210" font-size="10" font-weight="700" fill="#23272f">分かったこと</text>
      <rect x="54" y="214" width="214" height="34" rx="5" fill="#fffdf8" stroke="#e4ded2"/>
      <path d="M62 226 H220 M62 238 H180" stroke="#7a8696" stroke-width="2"/>
      <text x="276" y="210" font-size="10" font-weight="700" fill="#23272f">読みながら気になったこと</text>
      <rect x="274" y="214" width="212" height="34" rx="5" fill="#fffdf8" stroke="#e4ded2"/>
      <path d="M282 226 H430" stroke="#7a8696" stroke-width="2"/>
      <rect x="50" y="200" width="440" height="52" rx="7" fill="none" stroke="#d93025" stroke-width="3"/>
      <circle cx="500" cy="226" r="11" fill="#d93025"/><text x="495" y="231" font-size="13" font-weight="700" fill="#fff">3</text>
    </svg>
    <figcaption>① 下の「<b>メモを浮かせて読む</b>」を押す → ② 出てきた小さな窓の「<b>論文を開く</b>」→ ③ 論文を読みながら、小さな窓に書く（書いた分は、このアプリに自動で入ります）</figcaption>
  </figure>`;

// 画面1：論文を読む
function readStep(c) {
  const { field, esc, d } = c;
  const ps = papersOf(c);
  const pick = setupReader(c, readerConf(ps));
  shownSig = sigOf(ps);
  const findFold = open => `
      <details class="fold pfind" ${open || keepFold ? "open" : ""}>
        <summary>${!ps.length ? "論文を探す" : ps.length < 3 ? "論文を変えたいとき・もう1本足したいとき" : "論文を変えたいとき"}</summary>
        ${searchTools(c)}
        ${paperFields(c, 3)}
      </details>`;
  if (!ps.length) return `<p class="note">まだ論文がありません。下で探して、URLを入れよう。</p>${findFold(true)}`;
  const p = ps[pick], k = KEYS[p.j], open = paperOpenUrl(p), fl = canFloat() && !!open, floating = isFloating();
  const tabs = `<div data-ptabs>${tabsHtml(c, ps, pick)}</div>`;
  // メモ欄：小さな窓が使えるときは折りたたむ（小さな窓で書いた分がここに入る。こちらに打ちこまないように：11/9 先生）
  const memo = `
        <div class="memo2">
          ${field(k.w, "分かったこと", { rows: 5, placeholder: "何を・誰に・どうやって調べて、何が分かった？", chips: WAKATTA_CHIPS })}
          ${field(k.m, MADA_LABEL, { rows: 5, placeholder: MADA_PH, chips: MADA_CHIPS })}
        </div>`;
  const memoN = [k.w, k.m].filter(x => c.v(x)).length;
  return `
    <div data-reader-root>
      <p class="lead">いよいよ<b>論文</b>を読みます。研究者が何を調べて、何が分かったのか。読みながら、<b>分かったこと</b>と、<b>読みながら気になったこと</b>（えっ？・なぜ？・足りないと思ったところ）をメモしていこう。</p>
      ${fl && !floating ? FLOAT_HOWTO : ""}
      <details class="fold tips">
        <summary>読み方のコツ</summary>
        <ul>
          <li>知らない言葉は、すぐ調べなくてOK。印をつけて先へ</li>
          <li>「何を・誰に・どうやって調べたか」と「何が分かったか」を探しながら読む</li>
          <li>最後の「まとめ・今後の課題」には、研究者自身が<b>まだ分かっていないこと</b>を書いていることが多い。気になったら右の欄へ</li>
          <li>気になったことは<b>1行に1つ</b>。あとで、この中から確かめてみたいものを選びます</li>
        </ul>
      </details>
      ${tabs}
      <div class="pcard ${ps.length > 1 ? "tabbed" : ""}">
        <div class="pcard-head">
          <b>論文${p.no}</b>
          <span class="hint">${esc(p.url ? hostOf(p.url) : p.raw)}</span>
          ${open ? `<button type="button" class="btn small ghost" data-reader-split="${pick}">右半分に開く ↗</button>` : ""}
        </div>
        ${fl ? (floating
          ? `<p class="pfloat-on">📝 いま小さな窓でメモしています。書いた分は、下の「書いたメモ」に入ります。</p>`
          : `<button type="button" class="btn primary big pfloat" data-reader-float>📝 メモを浮かせて、論文${p.no}を読む</button>`) : ""}
        ${fl ? `
        <details class="fold memo-fold">
          <summary>書いたメモを見る・直す <span class="hint">${memoN ? `（${memoN}/2 書けています）` : "（小さな窓で書いた分が、ここに入ります）"}</span></summary>
          ${memo}
        </details>` : memo}
        <div class="field"><span class="label">どこまで読んだ？</span>
          <div class="choice small">${YOMI.map(y => `<button type="button" class="choice-btn ${d[k.y] === y ? "on" : ""}" data-yomi="${k.y}" data-val="${y}">${y}</button>`).join("")}</div>
        </div>
        ${pick < ps.length - 1 ? `<p class="hint">読めたら、上の<b>「論文${ps[pick + 1].no}」</b>へ。</p>` : ""}
      </div>
      ${findFold(false)}
    </div>`;
}

// 画面2：読み終えたら（気になったこと・RefNavi・提出）
// 右の欄（読みながら気になったこと）の1行＝1枚の札（11/10）
const QK = ["q1", "q2", "q3"];
const norm = s => String(s || "").trim().replace(/[？?]+$/u, "");
const withQ = s => /[？?]$/.test(s) ? s : s + "？";
function fudaOf(c) {
  const seen = new Set(), out = [];
  KEYS.forEach((k, j) => String(c.v(k.m) || "").split(/\r?\n/).forEach(line => {
    const t = line.trim().replace(/^[・\-－*＊●○◯•]+\s*|^[0-9０-９]+[.．、)）]\s*/u, "").trim();
    if (t.length < 2 || seen.has(norm(t))) return;
    seen.add(norm(t)); out.push({ t, no: NO[j] });
  }));
  return out;
}
function fudaHtml(c) {
  const fs = fudaOf(c), esc = c.esc;
  if (!fs.length) return `<p class="hint">「読みながら気になったこと」に書いた行が、ここに札で出ます。</p>`;
  const picked = QK.map(k => norm(c.v(k)));
  const full = QK.every(k => c.v(k));
  return `<div class="fuda-list">${fs.map(f => {
    const on = picked.includes(norm(f.t));
    return `<button type="button" class="fuda ${on ? "on" : ""}" data-fuda="${esc(f.t)}" ${!on && full ? "disabled" : ""}><em>論文${f.no}</em><span>${esc(f.t)}</span>${on ? `<i>✓</i>` : ""}</button>`;
  }).join("")}</div>${full ? `<p class="hint">3つまで選べます。外したいときは、選んだ札をもう一度押そう。</p>` : ""}`;
}
function afterStep(c) {
  const { field, chips } = c;
  return `
      <p class="lead">読みながら気になったことの中から、<b>いちばん確かめてみたいもの</b>を1〜3つ選ぼう。第4回で問いを立てるとき、はじめから入っています。</p>
      <div data-fuda-box>${fudaHtml(c)}</div>
      <div class="field"><span class="label">確かめてみたいこと（「？」で終わる形・なくてもOK）</span><span class="hint">札を押すと、空いている欄に入ります。自分で書いても、直してもOK</span>${chips(Q_CHIPS, "q1,q2,q3")}</div>
      ${field("q1", "①", { type: "text", qmark: true })}
      ${field("q2", "②", { type: "text", qmark: true })}
      ${field("q3", "③", { type: "text", qmark: true })}
      <h3>論文も RefNavi に登録して、参考文献リストを新しくしよう</h3>
      <ol class="todo">
        <li>RefNavi の上の種類のボタンで「<b>論文</b>」→「<b>DOI</b>」の欄に、下の<b>DOI の番号</b>を貼って「<b>照合</b>」→ 個人タグ「<b>${REF_TAG}</b>」を選んで登録</li>
        <li>「整理する」の「リスト」で全部にチェック →「出力」→ ${REF_FORMAT ? `「${REF_FORMAT}」` : "先生が指定した書式"} → コピー</li>
        <li>下の欄を消して、貼り直す</li>
      </ol>
      ${REF_PAPER_HOWTO}
      ${doiList(c)}
      <div class="searchbtns"><button type="button" class="btn ghost" data-refnavi-open>RefNavi を右半分に開く ↗</button></div>
      ${field("sanko", "参考文献リスト（RefNavi から貼る）", { rows: 6, hint: "第3回に貼ったものが入っています。論文を足したら貼り直そう" })}
      <p class="hint">がんばって、読めるところまで読んでみよう！ 別の論文にしたくなったら、「もどる」で1つ前の画面の「論文を変えたいとき」から。</p>
      ${c.submitted ? `<p class="okmsg">提出済み ✓　あとから直しても自動で保存されます。</p>` : ""}`;
}
// RefNavi に貼る DOI（コピーボタンつき）
function doiList(c) {
  const xs = NO.map((no, j) => ({ no, doi: doiOf(c.v(`p${j + 1}Doi`)), url: c.v(`p${j + 1}Url`) })).filter(x => x.doi || x.url); // RefNavi には番号だけ
  if (!xs.length) return "";
  return `<div class="recap">${xs.map(x => `<div class="tc-row"><span>論文${x.no}</span><b>${x.doi
    ? `DOI の番号 ${c.esc(x.doi)} <button type="button" class="btn small ghost" data-copytext="${c.esc(x.doi)}">コピー</button>`
    : `<span class="hint">DOI なし → 「<b>論文</b>」で、論文のページを見ながら入れよう：執筆者名・論文タイトル・誌名・巻号・掲載頁・発行年（見つかるものは全部）</span> ${safeUrl(x.url) ? `<a class="btn small ghost" href="${c.esc(safeUrl(x.url))}" target="_blank" rel="noopener">論文のページを開く ↗</a>` : ""}`}</b></div>`).join("")}</div>`;
}

export const R03 = {
  id: "R03",
  quest: 3,
  title: "論文を読もう",
  sub: "第4回（12/7）までに",
  mapAt: 2, // 文献（提出すると「問い」へ）
  after: "L03",
  uses: ["L03"],
  steps: [{ title: "論文を読もう", mins: 0 }, { title: "読み終えたら", mins: 0 }],
  geminiKey: "",

  render(i, c) {
    copyFromL03(c);
    return i === 0 ? readStep(c) : afterStep(c);
  },

  onInput(el, c) {
    handlePaperInput(el, c);
    if (/^q[123]$/.test(el.dataset.key || "")) { const box = c.app.querySelector("[data-fuda-box]"); if (box) box.innerHTML = fudaHtml(c); }
    // 論文のURLを入れた・消したとき：タブだけ描き直す（入力中の欄は描き直さない）
    if (/^p[123]Url$/.test(el.dataset.key || "")) {
      const ps = papersOf(c), box = c.app.querySelector("[data-ptabs]");
      if (sigOf(ps) === shownSig) return;
      if (!box) { // 論文がなかった画面に1本目が入った：「論文を探す」の外へ出たら描き直してカードを出す（中の欄どうしの移動では描き直さない）
        const fold = el.closest(".pfind");
        if (!fold || fold.dataset.waitFirst) return;
        fold.dataset.waitFirst = "1";
        const h = e => {
          if (e.relatedTarget && fold.contains(e.relatedTarget)) return;
          fold.removeEventListener("focusout", h);
          // ホームなどへ移るときも focusout が起きる。画面が入れ替わったあとに確かめてから描き直す
          setTimeout(() => {
            if (!c.app.contains(fold)) return;
            keepFold = true; const y = window.scrollY; c.rerender(); window.scrollTo(0, y); keepFold = false;
          }, 0);
        };
        fold.addEventListener("focusout", h);
        return;
      }
      shownSig = sigOf(ps);
      const pick = setupReader(c, readerConf(ps));
      box.innerHTML = tabsHtml(c, ps, pick);
      c.app.querySelector(".pcard")?.classList.toggle("tabbed", ps.length > 1);
    }
  },

  // 画面1：どちらかの論文で「分かったこと」と「読みながら気になったこと」が書けたら次へ
  canNext(i, c) {
    if (i === 0) return KEYS.some((k, j) => doneOf(c, j));
    return true;
  },
  need(i, c) {
    if (i === 0) return ["どれか1本の論文の「分かったこと」と「読みながら気になったこと」"];
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
    const fu = t.closest("[data-fuda]");
    if (fu) { // 札を押す：選んでいなければ空いている欄へ（「？」をつける）、選んでいれば外す
      const t0 = fu.dataset.fuda, at = QK.find(k => norm(c.v(k)) === norm(t0));
      if (at) c.set(at, "");
      else { const e = QK.find(k => !c.v(k)); if (!e) return true; c.set(e, withQ(t0)); }
      QK.forEach(k => { const inp = c.app.querySelector(`[data-key="${k}"]`); if (inp) inp.value = c.d[k] || ""; });
      const box = c.app.querySelector("[data-fuda-box]"); if (box) box.innerHTML = fudaHtml(c);
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
