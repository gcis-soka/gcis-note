// ステージ7／第4回（12/7）問いを立てて、確かめる計画を作る（A案）
// 流れ：問いを出す（タイムアタック・学年順位・もう一度チャレンジ）→ AIで広げる（なくてもOK）
//       → 問いの7種類で分ける（選択式）→ 種類の順に並べ直して1つ選ぶ（合言葉で直す）
//       → 調べ方を選んで計画を書く → Geminiが指摘 → 提出
// 計画の点検（安全・倫理）と着手は第5回（12/14）
// data：qs（[{t:問い, k:種類, a:1＝AIで足した}]）・qftPhase（""/run/done）・qftEnd・rounds・rank・rankTotal・rankN
//       ・toi・toiWhy・yosou（予想）・sudeni・kakame・aite（問いへの3つの答え）・houhou・houhou2（あわせて使う）
//       ・nani・yotei・hitsuyou・kuraberu・anzen・geminiLink
import { quest, memoText } from "./common.js"; // memoText：Quest 3 のメモは論文ごと（11/9）

const QFT_MIN = 3;   // 1回のチャレンジの時間（分）。1人なので班の5分より短く。もう一度チャレンジで足せる
const TOP = 20;      // 学年で何位までは順位を見せるか
const MIN_Q = 3;     // 次へ進むのに要る問いの数
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

// 結果のことば：学年20位まで→順位、それ以外は上から何割か
function verdict(rank, total) {
  if (!rank || !total) return { big: "おつかれさま！", sub: "" };
  if (rank <= TOP) return { big: `学年 ${rank}位！`, sub: "すごい。問いを出す力がある" };
  const p = rank / total;
  if (p <= 0.4) return { big: "たくさん出せたね！", sub: "" };
  if (p <= 0.7) return { big: "けっこう出せたね！", sub: "" };
  if (p <= 0.9) return { big: "まぁまぁ出せたね", sub: "" };
  return { big: "もう少し出せるはず！", sub: "もう一度チャレンジしてみよう" };
}

// ---------- プロンプト（試作・未試行） ----------
const listText = qs => qs.map(q => `・${q.t}`).join("\n") || "・（まだありません）";
function promptAdd(c) {
  const L1 = c.prev("L01"), R3 = c.prev("R03");
  return `私は高校1年生です。「${tail(L1.setsu) || "（説）"}」という説から探究を始め、論文を読みました。` +
    `分かったこと：${tail(memoText(R3, "wakatta", "／")) || "（なし）"}。まだ分かっていないこと：${tail(memoText(R3, "mada", "／")) || "（なし）"}。\n` +
    `私は次の問いを出しました。\n${listText(qsOf(c))}\n` +
    "これとは違う角度から、問いを10個出してください。私の問いの言い換えは入れないでください。答えやヒントは書かないでください。" +
    "「問い｜どんな角度か（10文字以内）」の表にしてください。表のあとには何も書かないでください。";
}
function promptPlan(c) {
  const v = c.v;
  return "私は高校1年生です。次の問いを確かめる計画を立てました。\n" +
    `問い：${v("toi") || "（未記入）"}\n予想：${v("yosou") || "（未記入）"}\n調べ方：${v("houhou") || "（未記入）"}${v("houhou2") ? `（あわせて${v("houhou2")}）` : ""}\nこの調べ方で確かめること：${v("nani") || "（未記入）"}\n` +
    `予定（いつ・どこで・どうやって）：${v("yotei") || "（未記入）"}\n必要なもの・人：${v("hitsuyou") || "（未記入）"}\n` +
    `比べるもの：${v("kuraberu") || "（未記入）"}\n気をつけること：${v("anzen") || "（未記入）"}\n` +
    "この計画を書き直さずに、良くするための指摘を3つまでください。" +
    "見てほしいのは、①12月から冬休みのあいだにできる量か、②この調べ方と比べ方で、予想が合っているかを確かめられるか、③必要なものや協力してくれる人がそろうか、④人を傷つけたり、個人情報を集めたりしないか、です。" +
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
  refreshNav(c, L04.canNext(4, c));
}

// ---------- 問いのリスト ----------
const qsOf = c => Array.isArray(c.d.qs) ? c.d.qs : [];
function listHtml(qs, esc, { del = true } = {}) {
  if (!qs.length) return `<p class="hint">まだありません</p>`;
  return `<ol class="qlist">${qs.map((q, i) =>
    `<li><span>${esc(q.t)}</span>${q.a ? `<em class="tagai">AI</em>` : ""}${del ? `<button type="button" class="qdel" data-qdel="${i}" aria-label="消す">×</button>` : ""}</li>`).join("")}</ol>`;
}
const addBox = (label = "追加") => `
  <div class="qadd"><input type="text" data-qadd-input placeholder="思いついた問いを入れて Enter" autocomplete="off"><button type="button" class="btn primary" data-qadd>${label}</button></div>`;

// 画面の一部だけ書き換える（全体を描き直すと入力欄のカーソルとスクロールが戻るため）
function refreshList(c) {
  const box = c.app.querySelector("[data-qlist]");
  if (box) box.innerHTML = listHtml(qsOf(c), c.esc);
  const n = c.app.querySelector("[data-qcount]");
  if (n) n.textContent = String(qsOf(c).length);
}
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
  refreshNav(c, L04.canNext(2, c));
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
  const qs = [...qsOf(c), ai ? { t, k: "", a: 1 } : { t, k: "" }];
  c.set("qs", qs);
  input.value = ""; input.focus();
  refreshList(c);
}

function startRound(c) {
  c.set("qftPhase", "run");
  c.set("qftEnd", Date.now() + QFT_MIN * 60 * 1000);
  c.rerender();
  setTimeout(() => c.app.querySelector("[data-qadd-input]")?.focus(), 50);
}

async function finishRound(c) {
  if (busy) return;
  busy = true;
  const n = qsOf(c).length;
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

// タイマー：画面に [data-timer] があるあいだ動く
function ensureTick() {
  if (tickId) return;
  tickId = setInterval(() => {
    const el = document.querySelector("[data-timer]");
    if (!el || !ctxRef) { clearInterval(tickId); tickId = null; return; }
    const left = Math.max(0, Number(ctxRef.d.qftEnd || 0) - Date.now());
    const s = Math.ceil(left / 1000);
    el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    el.classList.toggle("hurry", s <= 30);
    if (left <= 0) { clearInterval(tickId); tickId = null; finishRound(ctxRef); }
  }, 250);
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

function focusBox(c) {
  const L1 = c.prev("L01"), R3 = c.prev("R03"), esc = c.esc;
  return `
    <div class="recap">
      <div class="tc-row"><span>説（第1回）</span><b>${esc(L1.setsu || "—")}</b></div>
      <div class="tc-row"><span>論文で分かったこと</span><b>${esc(memoText(R3, "wakatta") || "—").replace(/\n/g, "<br>")}</b></div>
      <div class="tc-row big"><span>まだ分かっていないこと</span><b>${esc(memoText(R3, "mada") || "—").replace(/\n/g, "<br>")}</b></div>
    </div>`;
}

export const L04 = {
  id: "L04",
  no: 4,
  title: "問いを立てて、確かめる計画を作る",
  mapAt: 3, // 問い（提出すると「計画」へ）
  after: "R03", // Quest 3 を出すと開く（先に進みたい生徒は空白期間にもできる）
  uses: ["L01", "L03", "R03"],
  steps: [
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
        return `
          <div class="qft-head"><div class="timer" data-timer>${QFT_MIN}:00</div><div class="qcount"><b data-qcount>${qs.length}</b><span>個</span></div></div>
          ${focusBox(c)}
          ${addBox()}
          <div data-qlist>${listHtml(qs, esc)}</div>`;
      }
      if (phase === "done") {
        const r = Number(d.rank) || 0, v = verdict(r > 0 ? r : 0, Number(d.rankTotal) || 0);
        return `
          <div class="qresult" data-qresult>
            <p class="eyebrow">${d.rounds > 1 ? `${d.rounds}回目の` : ""}結果</p>
            <div class="qr-n"><b>${Number(d.rankN) || qs.length}</b>個</div>
            <div class="qr-big">${r === 0 ? "集計中…" : r < 0 ? "おつかれさま！" : v.big}</div>
            ${r > 0 && v.sub ? `<p>${v.sub}</p>` : ""}
            ${r < 0 ? `<p class="hint">順位を出せませんでした（通信）。問いはちゃんと残っています。</p>` : ""}
            <button type="button" class="btn" data-qft-retry>もう一度チャレンジ（${QFT_MIN}分）</button>
            <p class="hint">もう一度チャレンジすると、今の問いに足していきます。</p>
          </div>
          <div data-qlist>${listHtml(qs, esc)}</div>`;
      }
      return `
        <p>${quest(3)}の「まだ分かっていないこと」を見ながら、<b>${QFT_MIN}分間で問いをできるだけたくさん</b>出そう。学年で何位か出ます。</p>
        ${focusBox(c)}
        ${rules}
        <div class="qstart"><button type="button" class="btn primary big" data-qft-start>スタート（${QFT_MIN}分）</button></div>
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
        ${field("toi", "選んだ問い（合言葉で直してOK）", { type: "text", qmark: true })}
        ${field("toiWhy", "この問いを選んだわけ（なくてもOK）", { rows: 2 })}`;
    }

    if (i === 4) {
      const k = typeOfToi(c);
      return `
        <div class="recap"><div class="tc-row big"><span>選んだ問い${k && k !== UNKNOWN ? ` <em class="ktag" style="${kc(k)}">${esc(numOf(k) + k)}</em>` : ""}</span><b>${esc(d.toi || "—")}</b></div></div>
        ${field("yosou", "① 予想：【誰が・何が】は【どうなる】と思う？", { rows: 2, hint: "答えを予想してから調べ方を決めよう（1学期 第4回）", chips: YOSOU_CHIPS, placeholder: "例：高校生も、カフェくらいの音があると、無音のときより計算問題を速く解けると思う。" })}
        <div data-plan>${planHtml(c)}</div>
        ${field("nani", "④ この調べ方で、何を確かめる？", { rows: 2, placeholder: "例：雑音ありとなしで、同じ問題を解いた数を比べる" })}
        ${field("yotei", "予定（いつ・どこで・どうやって）", { rows: 3, placeholder: "例：12/14の授業で問題を作る。冬休みに家で3日ずつ、15分×2回" })}
        ${field("hitsuyou", "必要なもの・協力してくれる人", { rows: 2, placeholder: "例：計算問題（同じ難しさのもの）、タイマー、雑音の音源" })}
        ${field("kuraberu", "何と比べる？", { type: "text", placeholder: "例：無音のとき" })}
        ${field("anzen", "気をつけること（人に聞く・写真を撮るとき）", { rows: 2, hint: "書き出しを押すと入ります", chips: ANZEN_CHIPS })}
        <p class="hint">書けたら次へ。AIに見てもらいます。</p>`;
    }

    if (i === 5) return `
      <p>計画を<b>AIに見てもらおう</b>。AIは書き直さず、指摘だけをくれます。<b>同じチャットに</b>送ります。</p>
      ${promptBox(promptPlan(c))}
      <p>指摘を見て、計画を直そう。全部に従わなくてOK。第5回（12/14）に先生と点検してから始めます。</p>
      ${field("yosou", "予想", { rows: 2 })}
      ${field("nani", "この調べ方で、何を確かめる？", { rows: 2 })}
      ${field("yotei", "予定（いつ・どこで・どうやって）", { rows: 3 })}
      ${field("hitsuyou", "必要なもの・協力してくれる人", { rows: 2 })}
      ${field("kuraberu", "何と比べる？", { type: "text" })}
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
        <div class="tc-row"><span>予定</span><b>${esc(d.yotei || "—")}</b></div>
        <div class="tc-row"><span>必要なもの・人</span><b>${esc(d.hitsuyou || "—")}</b></div>
        <div class="tc-row"><span>比べるもの</span><b>${esc(d.kuraberu || "—")}</b></div>
        <div class="tc-row"><span>気をつけること</span><b>${esc(d.anzen || "—")}</b></div>
      </div>
      <div class="share"><b>次は 第5回（12/14）</b><p>計画を先生と点検して（安全・倫理）、授業の中で始めます。冬休みの計画も立てます。</p></div>
      ${c.submitted ? `<p class="okmsg">提出済み ✓　あとから直しても自動で保存されます。</p>` : ""}`;
  },

  canNext(i, c) {
    const qs = qsOf(c);
    if (i === 0) return c.d.qftPhase === "done" && qs.length >= MIN_Q;
    if (i === 1) return qs.length >= MIN_Q;
    if (i === 2) return qs.length >= MIN_Q && qs.every(q => q.k);
    if (i === 3) return !!c.v("toi");
    if (i === 4) return !!(c.v("yosou") && BUNSEKI.every(b => c.d[b.key]) && c.v("houhou") && c.v("nani") && c.v("yotei"));
    if (i === 5) return !!(c.v("yosou") && c.v("houhou") && c.v("nani") && c.v("yotei"));
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
