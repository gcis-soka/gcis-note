// ステージ7／第4回（12/7）問いを立てて、確かめる計画を作る（A案）
// 流れ：問いを出す（タイムアタック・学年順位・もう一度チャレンジ）→ AIで広げる（なくてもOK）
//       → 問いの7種類で分ける（選択式）→ 種類の順に並べ直して1つ選ぶ（合言葉で直す）
//       → 調べ方を選んで計画を書く → Geminiが指摘 → 提出
// 11/10 先生：はじめに班で Quest 3 の論文を紹介（共有のあとスライドで「師匠になる論文」の話）。
//       計画は 12/7〜1/18 の長めの計画：序の口（12/14まで・小さく）→ Quest 4 に記録 → 第5回で途中経過を見て対象を広げる（安全・倫理の点検）→ 冬休み
// data：qs（[{t:問い, k:種類, a:1＝AIで足した}]）・qftPhase（""/run/done）・qftEnd・rounds・rank・rankTotal・rankN
//       ・toi・toiWhy・yosou（予想）・sudeni・kakame・aite（問いへの3つの答え）・houhou・houhou2（あわせて使う）
//       ・nani・yotei（序の口：12/14まで）・yotei2（冬休み）・hitsuyou・kuraberu・anzen・geminiLink・hanMemo（班で出たこと）・seeded（Quest 3 の「確かめてみたいこと」を入れたか）
//       ・tutQs（練習の問い [{t}]）・tutPhase（""/run/done）・tutEnd・odai（本番のお題：説と論文のメモから1つ選んで短く。11/13）
// 11/10 先生：焦点は「説＋論文で分かったこと」。Quest 3 で選んだ「確かめてみたいこと」（q1〜q3）は、はじめから問いのリストに入れる（s:1。順位の数には入れない）
import { quest, memoText } from "./common.js"; // memoText：Quest 3 のメモは論文ごと（11/9）

const QFT_MIN = 3;   // 1回のチャレンジの時間（分）。1人なので班の5分より短く。もう一度チャレンジで足せる
const TOP = 20;      // 学年で何位までは順位を見せるか
const MIN_Q = 3;     // 次へ進むのに要る問いの数
// 練習（11/13 先生）：本番の前に、お題について20秒で問いを出す → 「こんな問いでも全然いい」を見せる。
// 練習の問いは tutQs に入れ、本番のリスト・順位には入れない。20秒たつと自動で次の画面へ
const TUT_SEC = 20;
const TUT_ODAI = "カレーは2日目のほうがおいしい";
// まじめな問いの例（種類の名前は出さない：11/13 先生）
const TUT_EX2 = ["「おいしい」ってどういうこと？", "なぜ2日目のほうがおいしいの？", "本当に2日目のほうがおいしい？", "シチューでも同じ？", "これを調べた人はいる？", "一晩置くと何が起こる？", "温度と味は関係ある？"];
const TUT_EX = ["カレーって何？", "1日目に全部食べたらどうなる？", "3日目は？", "みんなは何日目派？", "カレーパンも一緒？", "冷凍したらどうなる？"];
// 結果のことば（学年20位まで・上から4割まで以外は、個数で決める：11/13 先生）
const GOOD_N = 8, OK_N = 5;
// QFTの4つのルール（スタート前と同じ文言）。本番中・練習中も、入力欄の上に目立つように出し、時間・入力欄と一緒に上にとめる（11/13 先生：1行の略した形では約束が伝わらない）
const RULES = ["できるだけたくさんの問いをつくる（量が大事。質はあとから）", "問いを評価したり、答えたりしない", "思いついたとおりに書く", "意見や主張は「？」で終わる形に直す（「？」がないと自動でつきます）"];
const RULES_BOX = `<div class="qft-rules"><b>QFTの4つのルール</b><ol>${RULES.map(r => `<li>${r}</li>`).join("")}</ol></div>`;
const tail = s => String(s || "").trim().replace(/[。．.、,，！!\s　]+$/u, "");

// 問いの7種類（課題研究メソッド p.44・1学期 第1回のスライド）
export const QTYPES = [
  { k: "定義", ex: "○○の意味は？", c: "#3366b8" },
  { k: "原因", ex: "なぜ○○が生じる？", c: "#d0532a" },
  { k: "信ぴょう性", ex: "本当に○○か？", c: "#8a46b5" },
  { k: "比較", ex: "他ではどうか？", c: "#14868f" },
  { k: "先行研究", ex: "これまでの取り組みは？", c: "#6f7f12" },
  { k: "影響", ex: "○○で何が起こる？", c: "#c2366e" },
  { k: "方法・関連性", ex: "○○と△△の関連は？", c: "#a8700a" }
];
const UNKNOWN = "わからない";
// 種類の色（わからない・まだ は灰色）
const kc = k => `--kc:${QTYPES.find(x => x.k === k)?.c || "#8a8f98"}`;
const TYPE_ORDER = [...QTYPES.map(x => x.k), UNKNOWN];

// 調べ方（中3付録 A-5 の5種）と、選ぶ目安
export const HOUHOU = [
  { name: "文献・データ", when: "「どのくらい」「いつから」— 国の統計や論文に、もう数字や記録があるとき" },
  { name: "アンケート", when: "たくさんの人が「どう思う・どうしている」かを、数で知りたいとき" },
  { name: "インタビュー", when: "少しの人に「なぜ」「どんな経験」を、深く聞きたいとき" },
  { name: "観察", when: "人や物が実際に「どう動くか・どうなっているか」を見たいとき" },
  { name: "実験・制作", when: "条件を変えると「どう変わるか」を確かめたい／作って試したいとき" }
];
// 計画の前に、自分の問いに3つ答える → 合う調べ方が光る（1学期 第2回「問いが調べ方を決める」）
const BUNSEKI = [
  { key: "sudeni", q: "答えは、もう誰かが調べていそう？", opts: ["はい", "わからない", "いいえ"] },
  { key: "kakame", q: "確かめたいのは、どれに近い？", opts: ["数・割合", "理由・経験", "様子・動き", "条件で変わるか"] },
  { key: "aite", q: "調べる相手は？", opts: ["人", "モノ・できごと"] }
];
// 答え（と選んだ問いの種類）から、合いそうな調べ方
function osusume(d, type) {
  const s = new Set(), hito = d.aite === "人";
  if (d.kakame === "数・割合") s.add(hito ? "アンケート" : "観察");
  if (d.kakame === "理由・経験") s.add(hito ? "インタビュー" : "文献・データ");
  if (d.kakame === "様子・動き") s.add("観察");
  if (d.kakame === "条件で変わるか") s.add("実験・制作");
  if (d.sudeni === "はい" || type === "定義" || type === "先行研究") s.add("文献・データ");
  return [...s];
}
const YOSOU_CHIPS = [{ label: "型：＿＿は、＿＿と思う。", text: "＿＿は、＿＿と思う。" }];
const AIKOTOBA = [
  ["①「？」にする", "テーマ→問いの形に"],
  ["② 既知の先を問う", "なぜ・差・例外へ"],
  ["③ いつ・どこ・誰で絞る", "あいまいな言葉を測れる言葉に"],
  ["④ 自分の手が届く形に", "調べる手段まで見える"]
];
const ANZEN_CHIPS = [
  { label: "名前や連絡先は集めない", text: "名前や連絡先は集めない。" },
  { label: "顔が写らないようにする", text: "写真は顔が写らないようにする。" },
  { label: "何に使うかを先に伝える", text: "聞く前に、何に使うかを伝える。" },
  { label: "家の人・先生に相談してから", text: "家の人・先生に相談してから始める。" }
];

// 結果のことば：学年20位まで→順位、上から4割まで→「たくさん」、それ以外は個数で（絶対評価：11/13 先生）
// 順位が出せないとき（通信）も個数で決める
function verdict(rank, total, n) {
  const ranked = rank > 0 && n >= MIN_Q;
  if (ranked && rank <= TOP) return { big: `学年 ${rank}位！`, sub: "すごい。問いを出す力がある" };
  if (ranked && total && rank / total <= 0.4) return { big: "たくさん出せたね！", sub: "" };
  if (n >= GOOD_N) return { big: "けっこう出せたね！", sub: "" };
  if (n >= OK_N) return { big: "頑張って出せたね！", sub: "" };
  return { big: "もう少し出せるはず！", sub: "もう一度チャレンジしてみよう" };
}

// ---------- プロンプト（試作・未試行） ----------
const listText = qs => qs.map(q => `・${q.t}`).join("\n") || "・（まだありません）";
function promptAdd(c) {
  const L1 = c.prev("L01"), R3 = c.prev("R03");
  return `私は高校1年生です。「${tail(L1.setsu) || "（説）"}」という説から探究を始め、論文を読みました。` +
    `分かったこと：${tail(memoText(R3, "wakatta", "／")) || "（なし）"}。読みながら気になったこと：${tail(memoText(R3, "mada", "／")) || "（なし）"}。\n` +
    `私は次の問いを出しました。\n${listText(qsOf(c))}\n` +
    "これとは違う角度から、問いを10個出してください。私の問いの言い換えは入れないでください。答えやヒントは書かないでください。" +
    "「問い｜どんな角度か（10文字以内）」の表にしてください。表のあとには何も書かないでください。";
}
function promptPlan(c) {
  const v = c.v;
  return "私は高校1年生です。次の問いを確かめる計画を立てました。\n" +
    `問い：${v("toi") || "（未記入）"}\n予想：${v("yosou") || "（未記入）"}\n調べ方：${v("houhou") || "（未記入）"}${v("houhou2") ? `（あわせて${v("houhou2")}）` : ""}\nこの調べ方で確かめること：${v("nani") || "（未記入）"}\n` +
    `序の口（12/14までに小さくやること）：${v("yotei") || "（未記入）"}\n冬休みにやること：${v("yotei2") || "（未記入）"}\n必要なもの・人：${v("hitsuyou") || "（未記入）"}\n` +
    `比べるもの：${v("kuraberu") || "（未記入）"}\n気をつけること：${v("anzen") || "（未記入）"}\n` +
    "この計画を書き直さずに、良くするための指摘を3つまでください。" +
    "見てほしいのは、①序の口は1週間で小さく試せる量か、冬休みに対象を広げてしっかり確かめる計画になっているか、②この調べ方と比べ方で、予想が合っているかを確かめられるか、③必要なものや協力してくれる人がそろうか、④人を傷つけたり、個人情報を集めたりしないか、です。" +
    "指摘は質問の形にして、1つ40文字以内にしてください。最後にまとめは書かないでください。";
}

// ---------- 計画：問いに3つ答える → 調べ方を選ぶ ----------
function typeOfToi(c) { return qsOf(c).find(q => tail(q.t) === tail(c.d.toi))?.k || ""; }
function planHtml(c) {
  const d = c.d, rec = osusume(d, typeOfToi(c)), done = BUNSEKI.every(b => d[b.key]);
  const ask = BUNSEKI.map((b, j) => `
    <div class="bq"><span>${j + 1}. ${b.q}</span><div class="bq-o">${b.opts.map(o =>
      `<button type="button" class="bopt ${d[b.key] === o ? "on" : ""}" data-bun="${b.key}" data-v="${o}">${o}</button>`).join("")}</div></div>`).join("");
  const card = h => {
    const on = d.houhou === h.name, sub = d.houhou2 === h.name, r = done && rec.includes(h.name);
    return `<button type="button" class="hh ${on ? "on" : ""} ${r ? "rec" : ""}" data-houhou="${h.name}">${r ? `<em class="rec-tag">合いそう</em>` : ""}<b>${h.name}</b><span>${h.when}</span>${sub ? `<em class="sub-tag">あわせて使う</em>` : ""}</button>`;
  };
  return `
    <div class="bunseki"><b>② 自分の問いに答えよう</b>${ask}</div>
    <p><b>③ どうやって確かめる？</b> ${done ? (rec.length ? `答えから見て<b>「合いそう」</b>が光りました。主に使う調べ方を1つ選ぼう（光っていないものでもOK）。` : "主に使う調べ方を1つ選ぼう。") : `<span class="hint">②に答えると、合いそうな調べ方が光ります。</span>`}</p>
    ${d.sudeni === "はい" && done ? `<p class="hint">もう調べた人がいそうなら、まず<b>文献・データ</b>で確かめて、足りないところを自分で調べよう。</p>` : ""}
    <div class="houhou">${HOUHOU.map(card).join("")}</div>
    ${d.houhou ? `<p class="h2-row"><span>あわせて使う調べ方（なくてもOK）</span>${HOUHOU.filter(h => h.name !== d.houhou).map(h =>
      `<button type="button" class="bopt small ${d.houhou2 === h.name ? "on" : ""}" data-houhou2="${h.name}">${h.name}</button>`).join("")}</p>` : ""}`;
}
function refreshPlan(c) {
  const box = c.app.querySelector("[data-plan]");
  if (box) box.innerHTML = planHtml(c);
  refreshNav(c, canNextMain(4, c));
}

// ---------- 問いのリスト ----------
const qsOf = c => Array.isArray(c.d.qs) ? c.d.qs : [];
const ownN = qs => qs.filter(q => !q.s).length; // 順位に入る数（Quest 3 から入れた問いは数えない）
// Quest 3 で選んだ「確かめてみたいこと」を、はじめて開いたときに1回だけ問いのリストへ（消したら入れ直さない）
function seedFromR03(c) {
  if (c.d.seeded) return;
  const R3 = c.prev("R03"), have = new Set(qsOf(c).map(q => tail(q.t)));
  const add = ["q1", "q2", "q3"].map(k => String(R3[k] || "").trim()).filter(t => t && !have.has(tail(t)))
    .map(t => ({ t: /[？?]$/.test(t) ? t : t + "？", k: "", s: 1 }));
  c.set("seeded", 1);
  if (add.length) c.set("qs", [...add, ...qsOf(c)]);
}
function listHtml(qs, esc, { del = true, rev = false } = {}) {
  if (!qs.length) return `<p class="hint">まだありません</p>`;
  const xs = qs.map((q, i) => [q, i]);
  if (rev) xs.reverse(); // タイムアタック中は新しい順（消すときの番号はもとの順のまま）
  return `<ol class="qlist">${xs.map(([q, i]) =>
    `<li><span>${esc(q.t)}</span>${q.s ? `<em class="tagq3">${quest(3)}</em>` : ""}${q.a ? `<em class="tagai">AI</em>` : ""}${del ? `<button type="button" class="qdel" data-qdel="${i}" aria-label="消す">×</button>` : ""}</li>`).join("")}</ol>`;
}
const addBox = (label = "追加") => `
  <div class="qadd"><input type="text" data-qadd-input placeholder="思いついた問いを入れて Enter" autocomplete="off"><button type="button" class="btn primary" data-qadd>${label}</button></div>`;

// タイムアタック中の上の帯：ルール → 残り時間 → 入力欄・個数（11/13 先生）。追加ボタンはなく Enter で入れる
// form にして、スマホのキーボードの「完了」でも入るようにする（変換中の Enter では送られない）
function runSticky(c, { tut, n, ph }) {
  const sec = tut ? TUT_SEC : QFT_MIN * 60;
  return `
    <div class="qft-sticky">
      ${RULES_BOX}
      <div class="qft-time"><span>残り時間</span><b class="timer" data-timer="${tut ? "tut" : "qft"}">${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}</b></div>
      <div class="qft-bar">
        <form class="qadd" data-qadd-form><input type="text" data-qadd-input placeholder="${ph}" autocomplete="off" enterkeyhint="done"></form>
        <div class="qcount"><b data-qcount>${n}</b><span>個</span></div>
      </div>
    </div>`;
}
if (typeof document !== "undefined") {
  document.addEventListener("submit", e => {
    if (!e.target.matches?.("[data-qadd-form]")) return;
    e.preventDefault();
    const input = e.target.querySelector("[data-qadd-input]");
    if (input && ctxRef) addQuestion(ctxRef, input);
  });
}

// 画面の一部だけ書き換える（全体を描き直すと入力欄のカーソルとスクロールが戻るため）
function refreshList(c) {
  const box = c.app.querySelector("[data-qlist]");
  const tut = !!box?.closest("[data-tut]"), list = tut ? tutOf(c) : qsOf(c);
  if (box) box.innerHTML = listHtml(list, c.esc, { rev: !!box.closest(".qft-run"), del: !tut });
  const n = c.app.querySelector("[data-qcount]");
  if (n) n.textContent = String(tut ? list.length : ownN(list));
}
const tutOf = c => Array.isArray(c.d.tutQs) ? c.d.tutQs : [];
function refreshNav(c, ok) {
  const b = c.app.querySelector(".nav .primary");
  if (b) b.disabled = !ok;
}

let ctxRef = null, tickId = null, busy = false;

// ---------- 7種類に分ける：まん中のカードを、まわりの8つの箱へ送る ----------
// はじく（フリック）・ドラッグ・箱を押す、のどれでも送れる。方向は 8 つ＝7種類＋わからない
let sortAt = -1, sortTimer = null, sorting = false;
// 3×3 の並び（まん中はカード）。方向は時計の12時から右回りに 1〜7、9時が「わからない」
const COMPASS = ["定義", "原因", "信ぴょう性", UNKNOWN, null, "比較", "方法・関連性", "影響", "先行研究"];
// はじいた向き（右から反時計回りに45度ずつ）→ 種類
const DIR8 = ["比較", "信ぴょう性", "原因", "定義", UNKNOWN, "方法・関連性", "影響", "先行研究"];
const numOf = k => { const j = QTYPES.findIndex(x => x.k === k); return j >= 0 ? `${j + 1} ` : ""; };
function sortHtml(c) {
  const qs = qsOf(c), esc = c.esc;
  if (!qs.length) return `<p class="hint">問いがありません。前の画面で問いを出そう。</p>`;
  const q = qs[sortAt] || qs[0], left = qs.filter(x => !x.k).length;
  const cnt = k => qs.filter(x => x.k === k).length;
  return `
    <div class="sort-pos"><span>${sortAt + 1} / ${qs.length}</span><span>${left ? `あと ${left} 個` : "全部分けられた！ 次へ進もう"}</span></div>
    <div class="compass">${COMPASS.map(k => {
      if (!k) return `<div class="sort-card" data-sortcard><div class="sort-q">${esc(q.t)}</div>${q.k ? `<em class="ktag" style="${kc(q.k)}">${esc(numOf(q.k) + q.k)}</em>` : ""}</div>`;
      const t = QTYPES.find(x => x.k === k);
      return `<button type="button" class="kbox ${q.k === k ? "on" : ""} ${t ? "" : "unk"}" style="${kc(k)}" data-qtype="${sortAt}" data-k="${k}">
        <b>${numOf(k)}${k}</b>${t ? `<span>${t.ex}</span>` : ""}<i>${cnt(k) || ""}</i></button>`;
    }).join("")}</div>
    <p class="hint sort-how">カードを箱の方へ<b>はじく</b>か、箱を<b>押す</b>と送れます。</p>
    <div class="sort-move">
      <button type="button" class="link" data-sortgo="prev" ${sortAt <= 0 ? "disabled" : ""}>← 前の問い</button>
      <button type="button" class="link" data-sortgo="next" ${sortAt >= qs.length - 1 ? "disabled" : ""}>次の問い →</button>
    </div>
    <ol class="sort-list">${qs.map((x, j) => `
      <li><button type="button" class="${j === sortAt ? "now" : ""}" data-sortgo="${j}"><em class="ktag ${x.k ? "" : "none"}" style="${kc(x.k)}">${x.k ? esc(numOf(x.k) + x.k) : "まだ"}</em><span>${esc(x.t)}</span></button></li>`).join("")}
    </ol>`;
}
// 種類を決めて、カードを箱へ飛ばし、次のまだの問いへ
function sendTo(c, k) {
  if (sorting) return;
  const qs = qsOf(c).map(q => ({ ...q })), idx = sortAt;
  if (!qs[idx]) return;
  sorting = true;
  qs[idx].k = k;
  c.set("qs", qs);
  refreshNav(c, canNextMain(2, c));
  const card = c.app.querySelector("[data-sortcard]"), box = c.app.querySelector(`.kbox[data-k="${k}"]`);
  if (card && box) {
    const a = card.getBoundingClientRect(), b = box.getBoundingClientRect();
    card.style.transition = "transform .22s ease-in, opacity .22s ease-in";
    card.style.transform = `translate(${b.left + b.width / 2 - (a.left + a.width / 2)}px, ${b.top + b.height / 2 - (a.top + a.height / 2)}px) scale(.25)`;
    card.style.opacity = "0";
    box.classList.add("got");
  }
  const next = [...qs.keys()].slice(idx + 1).concat([...qs.keys()].slice(0, idx)).find(j => !qs[j].k);
  clearTimeout(sortTimer);
  sortTimer = setTimeout(() => { sorting = false; if (next !== undefined) sortAt = next; refreshSort(c); }, 240);
}
// はじく・ドラッグ（指でもマウスでも）
let drag = null;
if (typeof document !== "undefined") {
  document.addEventListener("pointerdown", e => {
    const card = e.target.closest?.("[data-sortcard]");
    if (!card || !ctxRef || sorting) return;
    drag = { card, x: e.clientX, y: e.clientY, t: Date.now(), id: e.pointerId };
    card.setPointerCapture?.(e.pointerId);
    card.style.transition = "none";
  });
  document.addEventListener("pointermove", e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.card.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx / 30}deg)`;
    const k = Math.hypot(dx, dy) > 30 ? DIR8[(Math.round(Math.atan2(-dy, dx) / (Math.PI / 4)) + 8) % 8] : "";
    ctxRef.app.querySelectorAll(".kbox").forEach(b => b.classList.toggle("aim", b.dataset.k === k));
  });
  const end = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const { card, x, y } = drag; drag = null;
    const dx = e.clientX - x, dy = e.clientY - y;
    ctxRef?.app.querySelectorAll(".kbox.aim").forEach(b => b.classList.remove("aim"));
    if (Math.hypot(dx, dy) > 40 && ctxRef) { sendTo(ctxRef, DIR8[(Math.round(Math.atan2(-dy, dx) / (Math.PI / 4)) + 8) % 8]); return; }
    card.style.transition = "transform .15s"; card.style.transform = "";
  };
  document.addEventListener("pointerup", end);
  document.addEventListener("pointercancel", end);
}
function refreshSort(c) {
  const box = c.app.querySelector("[data-sort]");
  if (box) box.innerHTML = sortHtml(c);
}

function addQuestion(c, input, ai = false) {
  let t = String(input.value || "").trim();
  if (!t) return;
  if (!/[？?]$/.test(t)) t += "？"; // ルール4：「？」で終わる形に
  if (input.closest("[data-tut]")) { // 練習の問い（本番のリスト・順位には入れない）
    if (c.d.tutPhase !== "run") return;
    c.set("tutQs", [...tutOf(c), { t }]);
  } else {
    c.set("qs", [...qsOf(c), ai ? { t, k: "", a: 1 } : { t, k: "" }]);
  }
  input.value = ""; input.focus();
  refreshList(c);
}

function startRound(c) {
  c.set("qftPhase", "run");
  c.set("qftEnd", Date.now() + QFT_MIN * 60 * 1000);
  c.rerender(); window.scrollTo(0, 0); // スタートのボタンの位置のままだと、お題が上に隠れる
  setTimeout(() => c.app.querySelector("[data-qadd-input]")?.focus(), 50);
}

async function finishRound(c) {
  if (busy) return;
  busy = true;
  const n = ownN(qsOf(c));
  c.set("qftPhase", "done");
  c.set("rounds", (Number(c.d.rounds) || 0) + 1);
  c.set("rankN", n);
  c.set("rank", 0);
  c.rerender();
  try {
    const r = await c.scoreRank(n);
    c.set("rank", r.rank); c.set("rankTotal", r.total);
  } catch (e) {
    console.error(e);
    c.set("rank", -1);
  }
  busy = false;
  if (c.app.querySelector("[data-qresult]")) c.rerender();
}

// 上の帯（.top）の高さ。時間・入力の帯をその下にとめる
function fitTopH() {
  const h = document.querySelector(".top")?.offsetHeight;
  if (h) document.documentElement.style.setProperty("--top-h", `${h}px`);
}

// タイマー：画面に [data-timer] があるあいだ動く（data-timer="tut" は練習、"qft" は本番）
function ensureTick() {
  if (tickId) return;
  tickId = setInterval(() => {
    const el = document.querySelector("[data-timer]");
    if (!el || !ctxRef) { clearInterval(tickId); tickId = null; return; }
    const tut = el.dataset.timer === "tut";
    const left = Math.max(0, Number(ctxRef.d[tut ? "tutEnd" : "qftEnd"] || 0) - Date.now());
    const s = Math.ceil(left / 1000);
    el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    el.classList.toggle("hurry", s <= (tut ? 5 : 30));
    if (left <= 0) { clearInterval(tickId); tickId = null; tut ? finishTut(ctxRef) : finishRound(ctxRef); }
  }, 250);
}

// ---------- 練習（20秒）→ こんな問いでも全然いい（11/13 先生） ----------
function startTut(c) {
  c.set("tutPhase", "run");
  c.set("tutEnd", Date.now() + TUT_SEC * 1000);
  c.rerender(); window.scrollTo(0, 0); // スタートのボタンの位置のままだと、お題が上に隠れる
  setTimeout(() => c.app.querySelector("[data-qadd-input]")?.focus(), 50);
}
// 先生のテスト用：練習とタイムアタックをはじめからやり直す（生徒には出ない：11/13 先生。一度やると、生徒が見る最初の画面を確かめられないため）
const TEST_RESET_KEYS = ["odai", "tutQs", "tutPhase", "tutEnd", "qftPhase", "qftEnd", "rounds", "rank", "rankTotal", "rankN", "seeded"];
const testReset = c => c.asTeacher
  ? `<p class="test-reset"><button type="button" class="link small" data-test-reset>先生用：練習とタイムアタックを、はじめからやり直す</button>（生徒には出ません）</p>` : "";
function doTestReset(c) {
  TEST_RESET_KEYS.forEach(k => c.set(k, ""));
  c.set("qs", qsOf(c).filter(q => q.a)); // 自分で出した問い・Quest 3 から入れた問いを消す（Quest 3 の分は開き直すと入る）
  sortAt = -1;
  seedFromR03(c);
  c.go(1);
}
// 20秒たったら、本番と同じく自動で次の画面（こんな問いでも全然いい）へ
function finishTut(c) {
  if (c.d.tutPhase === "done") return;
  c.set("tutPhase", "done");
  c.go(2);
}
function tutStep(c) {
  const esc = c.esc, phase = c.d.tutPhase || "", qs = tutOf(c);
  const odai = `<div class="odai"><span>お題</span><b>${esc(TUT_ODAI)}</b></div>`;
  if (phase === "run") {
    if (Date.now() >= Number(c.d.tutEnd || 0)) { setTimeout(() => finishTut(c), 0); } // 途中で閉じた
    else ensureTick();
    setTimeout(fitTopH, 0);
    return `
      <div class="qft-run" data-tut>
        ${runSticky(c, { tut: true, n: qs.length, ph: "お題について、思いついた問いを入れて Enter" })}
        ${odai}
        <p class="qft-cap">出した問い（新しい順）</p><div data-qlist>${listHtml(qs, esc, { rev: true, del: false })}</div>
      </div>`;
  }
  if (phase === "done") return `
    <div data-tut>
      <p>練習はおわりました。次へ進もう。</p>
      ${odai}
      <p class="qft-cap">練習で出した問い</p><div data-qlist>${listHtml(qs, esc, { del: false })}</div>
    </div>`;
  // 11/13 先生：いきなり練習だと何のためか分からない → 先に「このあとの本番」を見せる
  return `
    ${testReset(c)}
    <div data-tut>
      <div class="share honban">
        <b>このあと本番：問いのタイムアタック（${QFT_MIN}分）</b>
        <p>あなたの<b>説</b>や<b>論文で分かったこと</b>から<b>お題を1つ</b>選んで、${QFT_MIN}分間で<b>問いをできるだけたくさん</b>出します。学年で何位か出ます。</p>
      </div>
      <p class="tut-lead">その前に、<b>練習</b>。<b>${TUT_SEC}秒</b>で、このお題について問いを出してみよう。<b>1つでもOK</b>。</p>
      ${odai}
      ${RULES_BOX}
      <p class="hint">練習の問いは、本番の数や順位には入りません。${TUT_SEC}秒たつと、自動で次の画面に進みます。</p>
      <div class="qstart"><button type="button" class="btn primary big" data-tut-start>練習スタート（${TUT_SEC}秒）</button></div>
    </div>`;
}
function tutExamples(c) {
  const esc = c.esc, mine = tutOf(c);
  return `
    <p class="okay-big">こんな問いでも、全然いい。</p>
    <div class="odai"><span>お題</span><b>${esc(TUT_ODAI)}</b></div>
    <div class="qft-cols">
      <div><p class="qft-cap">たとえば</p><ul class="qlist ex">${TUT_EX.map(t => `<li><span>${esc(t)}</span></li>`).join("")}</ul></div>
      <div class="tut-mine"><p class="qft-cap">あなたが練習で出した問い</p>${mine.length ? listHtml(mine, esc, { del: false }) : `<p class="hint">出せなくてもだいじょうぶ。本番は${QFT_MIN}分あります。</p>`}</div>
    </div>
    <p>短くても、ふざけているように見えても、答えが分かりそうでも、<b>問いは問い</b>。</p>
    <p class="qft-cap">もちろん、こんな問いもOK</p><ul class="qlist ex cols2">${TUT_EX2.map(t => `<li><span>${esc(t)}</span></li>`).join("")}</ul>
    <div class="share honban"><b>次は本番（${QFT_MIN}分）</b><p>次は、あなたの<b>説</b>や<b>論文で分かったこと</b>から、<b>お題を1つ</b>選びます。この調子で、どんどん出そう。</p></div>`;
}

// Enter で追加（日本語の変換中の Enter は無視）
if (typeof document !== "undefined") {
  document.addEventListener("keydown", e => {
    const input = e.target.closest?.("[data-qadd-input]");
    if (!input || e.key !== "Enter" || e.isComposing || e.keyCode === 229 || !ctxRef) return;
    e.preventDefault();
    addQuestion(ctxRef, input, !!input.closest("[data-ai-add]"));
  });
}

function focusBox(c, compact = false) {
  const L1 = c.prev("L01"), R3 = c.prev("R03"), esc = c.esc;
  return `
    <div class="recap ${compact ? "compact" : ""}">
      <div class="tc-row"><span>説（第1回）</span><b>${esc(L1.setsu || "—")}</b></div>
      <div class="tc-row big"><span>論文で分かったこと</span><b>${esc(memoText(R3, "wakatta") || "—").replace(/\n/g, "<br>")}</b></div>
    </div>`;
}

// ---------- 本番のお題（11/13 先生）：説と論文のメモは長いので、そこから1つ選んで短い1文にする ----------
const ODAI_MAX = 40; // 目安の字数
// 札：説（第1回）と、Quest 3 の「分かったこと」の各行（論文ごと）
function odaiCards(c) {
  const L1 = c.prev("L01"), R3 = c.prev("R03"), out = [];
  const setsu = String(L1.setsu || "").trim();
  if (setsu) out.push({ from: "説（第1回）", t: setsu });
  const ps = [["wakatta", "①"], ["wakatta2", "②"], ["wakatta3", "③"]].filter(([k]) => String(R3[k] || "").trim());
  ps.forEach(([k, no]) => String(R3[k]).split(/\n+/).map(x => x.trim()).filter(Boolean)
    .forEach(t => out.push({ from: ps.length > 1 ? `論文${no}で分かったこと` : "論文で分かったこと", t })));
  return out;
}
function odaiPick(c) {
  const esc = c.esc, cards = odaiCards(c), cur = String(c.d.odai || "").trim();
  return `
    <div class="odai-pick">
      <p><b>① お題を1つ選ぼう</b>　あなたの説と、論文で分かったことから。押すと下に入ります。</p>
      <div class="ocards">${cards.length ? cards.map((x, j) =>
        `<button type="button" class="ocard ${cur && cur === x.t ? "on" : ""}" data-ocard="${j}"><small>${esc(x.from)}</small><span>${esc(x.t)}</span></button>`).join("")
        : `<p class="hint">説やメモが見つかりません。下に、問いを出したいことを1文で書こう。</p>`}</div>
      <div class="odai odai-edit"><span>お題</span>
        <textarea class="line" data-key="odai" rows="1" placeholder="例：カレーは2日目のほうがおいしい">${esc(c.d.odai || "")}</textarea></div>
      <p class="hint" data-odai-len>練習の「カレーは2日目のほうがおいしい」のように、<b>短い1文</b>がおすすめ。長いときは${ODAI_MAX}字くらいまでに短く直そう。</p>
    </div>`;
}
// お題の字数と、スタートを押せるか
function refreshOdai(c) {
  const v = String(c.d.odai || "").trim(), n = [...v].length;
  const st = c.app.querySelector("[data-qft-start]"); if (st) st.disabled = !v;
  const msg = c.app.querySelector("[data-odai-need]"); if (msg) msg.hidden = !!v;
  const len = c.app.querySelector("[data-odai-len]");
  if (len) len.classList.toggle("warn-text", n > ODAI_MAX);
  c.app.querySelectorAll("[data-ocard]").forEach(b => b.classList.toggle("on", b.querySelector("span").textContent === v));
}

// 画面0：班で論文を紹介（Quest 3 の共有。11/10 先生）
function shareStep(c) {
  const R3 = c.prev("R03"), esc = c.esc;
  const ps = [1, 2, 3].map(n => ({ no: "①②③"[n - 1], url: String(R3[`p${n}Url`] || "").trim() })).filter(p => p.url);
  const host = u => { try { return new URL(u).hostname; } catch { return u; } };
  const qs3 = ["q1", "q2", "q3"].map(k => String(R3[k] || "").trim()).filter(Boolean);
  return `
    <p>${quest(3)}で読んだ論文を、班で紹介し合おう。</p>
    <div class="recap">
      <div class="tc-row"><span>読んだ論文</span><b>${ps.length ? ps.map(p => `論文${p.no}　${esc(host(p.url))}`).join("<br>") : "—"}</b></div>
      <div class="tc-row"><span>分かったこと</span><b>${esc(memoText(R3, "wakatta") || "—").replace(/\n/g, "<br>")}</b></div>
      <div class="tc-row"><span>確かめてみたいこと</span><b>${qs3.length ? qs3.map(esc).join("<br>") : "—"}</b></div>
    </div>
    <div class="share">
      <b>話す人（1分くらい）</b>
      <ol class="todo">
        <li>どんな論文？（誰に・何を・どうやって調べた研究か）</li>
        <li>何が分かった？</li>
        <li>読みながら「えっ？」と思ったこと・確かめてみたいこと</li>
      </ol>
      <p class="hint">全部読めていなくてもOK。読めたところまでを話そう。話し終わったら、話した人が「ありがとう！じゃあ次、〇〇さん」と次の人を指名します。</p>
    </div>
    ${c.field("hanMemo", "班で出たこと・友だちの論文で気になったこと（なくてもOK）", { rows: 2 })}`;
}

export const L04 = {
  id: "L04",
  no: 4,
  title: "問いを立てて、確かめる計画を作る",
  mapAt: 3, // 問い（提出すると「計画」へ）
  after: "R03", // Quest 3 を出すと開く（先に進みたい生徒は空白期間にもできる）
  uses: ["L01", "L03", "R03"],
  steps: [
    { title: "班で論文を紹介", mins: 6 },
    { title: "本番の前に、20秒で練習", mins: 1 },
    { title: "こんな問いでも、全然いい", mins: 1 },
    { title: "問いを出す（タイムアタック）", mins: 10 },
    { title: "AIで広げる（なくてもOK）", mins: 3 },
    { title: "問いを7種類に分ける", mins: 8 },
    { title: "問いを1つ選ぶ", mins: 6 },
    { title: "確かめる計画を書く", mins: 15 },
    { title: "AIに見てもらって直す", mins: 5 },
    { title: "提出", mins: 2 }
  ],
  geminiKey: "gcis_gemini_L04",

  render(i, c) {
    ctxRef = c;
    seedFromR03(c);
    return i === 0 ? shareStep(c) : i === 1 ? tutStep(c) : i === 2 ? tutExamples(c) : renderMain(i - 3, c);
  },
  // 練習は20秒たつと自動で進む
  canNext(i, c) { return i === 0 || i === 2 ? true : i === 1 ? c.d.tutPhase === "done" : canNextMain(i - 3, c); },
  onClick(t, c) {
    if (t.closest("[data-tut-start]")) { startTut(c); return true; }
    if (t.closest("[data-test-reset]")) { doTestReset(c); return true; }
    const oc = t.closest("[data-ocard]");
    if (oc) {
      const x = odaiCards(c)[Number(oc.dataset.ocard)];
      if (x) {
        c.set("odai", x.t);
        const ta = c.app.querySelector('[data-key="odai"]');
        if (ta) { ta.value = x.t; ta.dispatchEvent(new Event("input", { bubbles: true })); ta.focus(); }
      }
      refreshOdai(c);
      return true;
    }
    return onClickMain(t, c);
  },
  onInput(el, c) { if (el.dataset.key === "odai") refreshOdai(c); }
};

// 第4回の本体（画面4〜10。番号は班の紹介・練習を足す前のまま 0〜6）
const L04Main = {
  render(i, c) {
    const { field, promptBox, chips, esc, d } = c;
    const qs = qsOf(c);

    if (i === 0) {
      const phase = d.qftPhase || "";
      if (phase === "run" && Date.now() >= Number(d.qftEnd || 0)) setTimeout(() => finishRound(c), 0); // 途中で閉じた
      const rules = `
        <div class="share">
          <b>QFTの4つのルール</b>
          <ol class="todo">
            <li>できるだけたくさんの問いをつくる（量が大事。質はあとから）</li>
            <li>問いを評価したり、答えたりしない</li>
            <li>思いついたとおりに書く</li>
            <li>意見や主張は「？」で終わる形に直す（「？」がないと自動でつきます）</li>
          </ol>
        </div>`;
      if (phase === "run") {
        ensureTick();
        // 11/11 先生：説・論文のメモが長いと、時間と入力欄が画面の外に出て問いが打てなかった。
        // 時間・入力・個数を上にとめ、説と論文は高さを決めた箱の中でスクロール。出した問いは新しい順
        setTimeout(fitTopH, 0);
        return `
          <div class="qft-run">
            ${runSticky(c, { tut: false, n: ownN(qs), ph: "お題について、思いついた問いを入れて Enter" })}
            <div class="odai"><span>お題</span><b>${esc(d.odai || "—")}</b></div>
            <p class="qft-cap">出した問い（新しい順）</p><div data-qlist>${listHtml(qs, esc, { rev: true })}</div>
            <details class="memo-fold"><summary>説と、論文のメモを見る</summary>${focusBox(c, true)}</details>
          </div>`;
      }
      if (phase === "done") {
        const r = Number(d.rank) || 0, n = Number(d.rankN) || ownN(qs), v = verdict(r, Number(d.rankTotal) || 0, n);
        return `
          ${testReset(c)}
          <div class="qresult" data-qresult>
            <p class="eyebrow">${d.rounds > 1 ? `${d.rounds}回目の` : ""}結果</p>
            <div class="qr-n"><b>${n}</b>個</div>
            <div class="qr-big">${r === 0 ? "集計中…" : v.big}</div>
            ${r !== 0 && v.sub ? `<p>${v.sub}</p>` : ""}
            ${r < 0 ? `<p class="hint">順位を出せませんでした（通信）。問いはちゃんと残っています。</p>` : ""}
            <button type="button" class="btn" data-qft-retry>もう一度チャレンジ（${QFT_MIN}分）</button>
            <p class="hint">もう一度チャレンジすると、今の問いに足していきます。</p>
          </div>
          <div data-qlist>${listHtml(qs, esc)}</div>`;
      }
      return `
        ${testReset(c)}
        <p class="okay-big">いよいよ本番</p>
        <p>練習と同じように、<b>${QFT_MIN}分間で問いをできるだけたくさん</b>出そう。学年で何位か出ます。</p>
        ${odaiPick(c)}
        <p class="step-lead"><b>② ルールを確かめて、スタート</b></p>
        ${rules}
        ${qs.some(q => q.s) ? `<p class="hint">${quest(3)}で選んだ「確かめてみたいこと」は、はじめから下に入っています（<em class="tagq3">${quest(3)}</em>。数には入りません）。</p>` : ""}
        <div class="qstart"><button type="button" class="btn primary big" data-qft-start ${String(d.odai || "").trim() ? "" : "disabled"}>スタート（${QFT_MIN}分）</button>
          <p class="hint" data-odai-need ${String(d.odai || "").trim() ? "hidden" : ""}>お題を選ぶと、スタートできます。</p></div>
        ${qs.length ? `<div data-qlist>${listHtml(qs, esc)}</div>` : ""}`;
    }

    if (i === 1) return `
      <p>自分の問いを出したら、<b>AIに別の角度の問いを足してもらおう</b>。足さなくてもOK。</p>
      ${promptBox(promptAdd(c), { first: true })}
      <p>気に入った問いがあったら、<b>自分の言葉に直して</b>足そう（順位には入りません）。</p>
      <div data-ai-add>${addBox("足す")}</div>
      <div data-qlist>${listHtml(qs, esc)}</div>`;

    if (i === 2) {
      if (sortAt < 0 || sortAt >= qs.length) { const f = qs.findIndex(q => !q.k); sortAt = f >= 0 ? f : 0; }
      return `
        <p>出した問いを1つずつ、<b>問いの7種類</b>（教科書 p.44）の箱に送ろう。迷ったら「${UNKNOWN}」でOK。</p>
        <div data-sort>${sortHtml(c)}</div>`;
    }

    if (i === 3) {
      const groups = TYPE_ORDER.map(k => ({ k, items: qs.map((q, idx) => ({ ...q, idx })).filter(q => (q.k || UNKNOWN) === k) })).filter(g => g.items.length);
      return `
        <p>種類ごとに並べ直しました。<b>いちばん確かめてみたい問いを1つ</b>選ぼう（押すと下に入ります）。</p>
        <div class="qgroups">${groups.map(g => {
          const t = QTYPES.find(x => x.k === g.k);
          return `<div class="qg" style="${kc(g.k)}"><div class="qg-h">${t ? `${QTYPES.indexOf(t) + 1} ${t.k}を問う` : g.k}<span>${g.items.length}</span></div>
            ${g.items.map(q => `<button type="button" class="qpick ${d.toi && tail(d.toi) === tail(q.t) ? "on" : ""}" data-qpick="${q.idx}">${esc(q.t)}</button>`).join("")}</div>`;
        }).join("")}</div>
        <div class="share">
          <b>直し方の合言葉（1学期 第7回）</b>
          <ul>${AIKOTOBA.map(([a, b]) => `<li><b>${a}</b>：${b}</li>`).join("")}</ul>
        </div>
        ${field("toi", "選んだ問い（合言葉で直してOK）", { type: "line", qmark: true })}
        ${field("toiWhy", "この問いを選んだわけ（なくてもOK）", { rows: 2 })}`;
    }

    if (i === 4) {
      const k = typeOfToi(c);
      return `
        <div class="recap"><div class="tc-row big"><span>選んだ問い${k && k !== UNKNOWN ? ` <em class="ktag" style="${kc(k)}">${esc(numOf(k) + k)}</em>` : ""}</span><b>${esc(d.toi || "—")}</b></div></div>
        ${field("yosou", "① 予想：【誰が・何が】は【どうなる】と思う？", { rows: 2, hint: "答えを予想してから調べ方を決めよう（1学期 第4回）", chips: YOSOU_CHIPS, placeholder: "例：高校生も、カフェくらいの音があると、無音のときより計算問題を速く解けると思う。" })}
        <div data-plan>${planHtml(c)}</div>
        ${field("nani", "④ この調べ方で、何を確かめる？", { rows: 2, placeholder: "例：雑音ありとなしで、同じ問題を解いた数を比べる" })}
        <div class="share"><b>⑤ 1月までの計画</b><p>まず<b>序の口</b>を小さくやってみて（12/14まで）、第5回で途中経過を見て、<b>対象を広げて冬休みに</b>しっかりやります。</p></div>
        ${field("yotei", "序の口：12/14までにやること（小さく・具体的に。いつ・どこで・だれと・どうやって）", { rows: 3, placeholder: "例：12/9に家で、無音と雑音で15分ずつ計算問題を2回。まず自分で試して、問題の量と時間を確かめる" })}
        ${field("yotei2", "冬休みにやること（対象を広げて。大まかでOK）", { rows: 3, placeholder: "例：クラスの友だち10人に同じことをやってもらい、無音と雑音で比べる" })}
        ${field("hitsuyou", "必要なもの・協力してくれる人", { rows: 2, placeholder: "例：計算問題（同じ難しさのもの）、タイマー、雑音の音源" })}
        ${field("kuraberu", "何と比べる？", { type: "line", placeholder: "例：無音のとき" })}
        ${field("anzen", "気をつけること（人に聞く・写真を撮るとき）", { rows: 2, hint: "書き出しを押すと入ります", chips: ANZEN_CHIPS })}
        <p class="hint">書けたら次へ。AIに見てもらいます。</p>`;
    }

    if (i === 5) return `
      <p>計画を<b>AIに見てもらおう</b>。AIは書き直さず、指摘だけをくれます。<b>同じチャットに</b>送ります。</p>
      ${promptBox(promptPlan(c))}
      <p>指摘を見て、計画を直そう。全部に従わなくてOK。まず序の口を12/14までにやってみよう。第5回で途中経過を見て、計画を直します。</p>
      ${field("yosou", "予想", { rows: 2 })}
      ${field("nani", "この調べ方で、何を確かめる？", { rows: 2 })}
      ${field("yotei", "序の口：12/14までにやること", { rows: 3 })}
      ${field("yotei2", "冬休みにやること", { rows: 3 })}
      ${field("hitsuyou", "必要なもの・協力してくれる人", { rows: 2 })}
      ${field("kuraberu", "何と比べる？", { type: "line" })}
      ${field("anzen", "気をつけること", { rows: 2 })}
      ${field("geminiLink", "Geminiのチャットのリンク（なくてもOK）", { type: "url", placeholder: "https://…" })}`;

    // i === 6：提出
    const picked = qs.find(q => tail(q.t) === tail(d.toi));
    return `
      <div class="themecard">
        <div class="tc-row"><span>出した問い</span><b>${qs.length}個</b></div>
        <div class="tc-row big"><span>選んだ問い${picked?.k && picked.k !== UNKNOWN ? `（${esc(picked.k)}）` : ""}</span><b>${esc(d.toi || "—")}</b></div>
        <div class="tc-row"><span>予想</span><b>${esc(d.yosou || "—")}</b></div>
        <div class="tc-row"><span>調べ方</span><b>${esc(d.houhou || "—")}${d.houhou2 ? `（あわせて${esc(d.houhou2)}）` : ""}</b></div>
        <div class="tc-row"><span>確かめること</span><b>${esc(d.nani || "—")}</b></div>
        <div class="tc-row"><span>序の口（12/14まで）</span><b>${esc(d.yotei || "—")}</b></div>
        <div class="tc-row"><span>冬休み</span><b>${esc(d.yotei2 || "—")}</b></div>
        <div class="tc-row"><span>必要なもの・人</span><b>${esc(d.hitsuyou || "—")}</b></div>
        <div class="tc-row"><span>比べるもの</span><b>${esc(d.kuraberu || "—")}</b></div>
        <div class="tc-row"><span>気をつけること</span><b>${esc(d.anzen || "—")}</b></div>
      </div>
      <div class="share"><b>次は ${quest(4)}：序の口をやってみる（12/14まで）</b><p>提出すると、ホームに「${quest(4)}」が出ます。序の口をやったら、<b>その日のうちに</b>${quest(4)}に書こう。第5回で途中経過を班で報告して、対象を広げる計画に直します。</p></div>
      ${c.submitted ? `<p class="okmsg">提出済み ✓　あとから直しても自動で保存されます。</p>` : ""}`;
  },

  canNext(i, c) {
    const qs = qsOf(c);
    if (i === 0) return c.d.qftPhase === "done" && qs.length >= MIN_Q;
    if (i === 1) return qs.length >= MIN_Q;
    if (i === 2) return qs.length >= MIN_Q && qs.every(q => q.k);
    if (i === 3) return !!c.v("toi");
    if (i === 4) return !!(c.v("yosou") && BUNSEKI.every(b => c.d[b.key]) && c.v("houhou") && c.v("nani") && c.v("yotei") && c.v("yotei2"));
    if (i === 5) return !!(c.v("yosou") && c.v("houhou") && c.v("nani") && c.v("yotei") && c.v("yotei2"));
    return true;
  },

  onClick(t, c) {
    if (t.closest("[data-qft-start]") || t.closest("[data-qft-retry]")) { startRound(c); return true; }
    const add = t.closest("[data-qadd]");
    if (add) {
      const input = add.parentElement.querySelector("[data-qadd-input]");
      addQuestion(c, input, !!add.closest("[data-ai-add]"));
      return true;
    }
    const del = t.closest("[data-qdel]");
    if (del) {
      const qs = qsOf(c).filter((_, j) => j !== Number(del.dataset.qdel));
      c.set("qs", qs);
      refreshList(c);
      return true;
    }
    const ty = t.closest("[data-qtype]");
    if (ty) { sendTo(c, ty.dataset.k); return true; }
    const go = t.closest("[data-sortgo]");
    if (go) {
      const n = qsOf(c).length, v = go.dataset.sortgo;
      sortAt = v === "prev" ? Math.max(0, sortAt - 1) : v === "next" ? Math.min(n - 1, sortAt + 1) : Number(v);
      clearTimeout(sortTimer);
      refreshSort(c);
      return true;
    }
    const pk = t.closest("[data-qpick]");
    if (pk) {
      const q = qsOf(c)[Number(pk.dataset.qpick)];
      if (!q) return true;
      c.set("toi", q.t);
      const inp = c.app.querySelector('[data-key="toi"]'); if (inp) inp.value = q.t;
      c.app.querySelectorAll(".qpick").forEach(b => b.classList.toggle("on", b === pk));
      refreshNav(c, true);
      return true;
    }
    const bn = t.closest("[data-bun]");
    if (bn) { c.set(bn.dataset.bun, bn.dataset.v); refreshPlan(c); return true; }
    const b = t.closest("[data-houhou]");
    if (b) { c.set("houhou", b.dataset.houhou); if (c.d.houhou2 === b.dataset.houhou) c.set("houhou2", ""); refreshPlan(c); return true; }
    const b2 = t.closest("[data-houhou2]");
    if (b2) { c.set("houhou2", c.d.houhou2 === b2.dataset.houhou2 ? "" : b2.dataset.houhou2); refreshPlan(c); return true; }
    return false;
  }
};
const renderMain = (i, c) => L04Main.render(i, c);
const canNextMain = (i, c) => L04Main.canNext(i, c);
const onClickMain = (t, c) => L04Main.onClick(t, c);
