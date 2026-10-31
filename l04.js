// ステージ7／第4回（12/7）問いを立てて、確かめる計画を作る（A案）
// 流れ：問いを出す（タイムアタック・学年順位・もう一度チャレンジ）→ AIで広げる（なくてもOK）
//       → 問いの7種類で分ける（選択式）→ 種類の順に並べ直して1つ選ぶ（合言葉で直す）
//       → 調べ方を選んで計画を書く → Geminiが指摘 → 提出
// 計画の点検（安全・倫理）と着手は第5回（12/14）
// data：qs（[{t:問い, k:種類, a:1＝AIで足した}]）・qftPhase（""/run/done）・qftEnd・rounds・rank・rankTotal・rankN
//       ・toi・toiWhy・houhou・nani・yotei・hitsuyou・kuraberu・anzen・geminiLink
import { quest } from "./common.js";

const QFT_MIN = 5;   // 1回のチャレンジの時間（分）。1学期のQFTと同じ5分
const TOP = 20;      // 学年で何位までは順位を見せるか
const MIN_Q = 3;     // 次へ進むのに要る問いの数
const tail = s => String(s || "").trim().replace(/[。．.、,，！!\s　]+$/u, "");

// 問いの7種類（課題研究メソッド p.44・1学期 第1回のスライド）
export const QTYPES = [
  { k: "定義", ex: "○○の意味は？" },
  { k: "原因", ex: "なぜ○○が生じる？" },
  { k: "信ぴょう性", ex: "本当に○○か？" },
  { k: "比較", ex: "他ではどうか？" },
  { k: "先行研究", ex: "これまでの取り組みは？" },
  { k: "影響", ex: "○○で何が起こる？" },
  { k: "方法・関連性", ex: "○○と△△の関連は？" }
];
const UNKNOWN = "わからない";
const TYPE_ORDER = [...QTYPES.map(x => x.k), UNKNOWN];

// 調べ方（中3付録 A-5 の5種）と、選ぶ目安
export const HOUHOU = [
  { name: "文献・データ", when: "「どのくらい」「いつから」— 国の統計や論文に、もう数字や記録があるとき" },
  { name: "アンケート", when: "たくさんの人が「どう思う・どうしている」かを、数で知りたいとき" },
  { name: "インタビュー", when: "少しの人に「なぜ」「どんな経験」を、深く聞きたいとき" },
  { name: "観察", when: "人や物が実際に「どう動くか・どうなっているか」を見たいとき" },
  { name: "実験・制作", when: "条件を変えると「どう変わるか」を確かめたい／作って試したいとき" }
];
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
    `分かったこと：${tail(R3.wakatta) || "（なし）"}。まだ分かっていないこと：${tail(R3.mada) || "（なし）"}。\n` +
    `私は次の問いを出しました。\n${listText(qsOf(c))}\n` +
    "これとは違う角度から、問いを10個出してください。私の問いの言い換えは入れないでください。答えやヒントは書かないでください。" +
    "「問い｜どんな角度か（10文字以内）」の表にしてください。表のあとには何も書かないでください。";
}
function promptPlan(c) {
  const v = c.v;
  return "私は高校1年生です。次の問いを確かめる計画を立てました。\n" +
    `問い：${v("toi") || "（未記入）"}\n調べ方：${v("houhou") || "（未記入）"}\nこの調べ方で確かめること：${v("nani") || "（未記入）"}\n` +
    `予定（いつ・どこで・どうやって）：${v("yotei") || "（未記入）"}\n必要なもの・人：${v("hitsuyou") || "（未記入）"}\n` +
    `比べるもの：${v("kuraberu") || "（未記入）"}\n気をつけること：${v("anzen") || "（未記入）"}\n` +
    "この計画を書き直さずに、良くするための指摘を3つまでください。" +
    "見てほしいのは、①12月から冬休みのあいだにできる量か、②この比べ方で問いに答えられるか、③必要なものや協力してくれる人がそろうか、④人を傷つけたり、個人情報を集めたりしないか、です。" +
    "指摘は質問の形にして、1つ40文字以内にしてください。最後にまとめは書かないでください。";
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
      <div class="tc-row"><span>論文で分かったこと</span><b>${esc(R3.wakatta || "—")}</b></div>
      <div class="tc-row big"><span>まだ分かっていないこと</span><b>${esc(R3.mada || "—")}</b></div>
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
    { title: "AIで広げる（なくてもOK）", mins: 5 },
    { title: "問いを7種類に分ける", mins: 8 },
    { title: "問いを1つ選ぶ", mins: 6 },
    { title: "確かめる計画を書く", mins: 12 },
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
      const left = qs.filter(q => !q.k).length;
      return `
        <p>出した問いを、<b>問いの7種類</b>（教科書 p.44）に分けよう。迷ったら「${UNKNOWN}」でOK。</p>
        <div class="qtypes-legend">${QTYPES.map((t, j) => `<span><b>${j + 1} ${t.k}</b> ${t.ex}</span>`).join("")}</div>
        <p class="hint">あと <b data-qleft>${left}</b> 個</p>
        <ol class="qsort">${qs.map((q, idx) => `
          <li data-qrow="${idx}"><div class="qs-t">${esc(q.t)}</div><div class="qs-k">${TYPE_ORDER.map((k, j) =>
            `<button type="button" class="kchip ${q.k === k ? "on" : ""}" data-qtype="${idx}" data-k="${k}">${j < QTYPES.length ? `${j + 1} ` : ""}${k}</button>`).join("")}</div></li>`).join("")}
        </ol>`;
    }

    if (i === 3) {
      const groups = TYPE_ORDER.map(k => ({ k, items: qs.map((q, idx) => ({ ...q, idx })).filter(q => (q.k || UNKNOWN) === k) })).filter(g => g.items.length);
      return `
        <p>種類ごとに並べ直しました。<b>いちばん確かめてみたい問いを1つ</b>選ぼう（押すと下に入ります）。</p>
        <div class="qgroups">${groups.map(g => {
          const t = QTYPES.find(x => x.k === g.k);
          return `<div class="qg"><div class="qg-h">${t ? `${QTYPES.indexOf(t) + 1} ${t.k}を問う` : g.k}<span>${g.items.length}</span></div>
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
      const pick = d.houhou || "";
      return `
        <div class="recap"><div class="tc-row big"><span>選んだ問い</span><b>${esc(d.toi || "—")}</b></div></div>
        <p><b>どうやって確かめる？</b> 主に使う調べ方を1つ選ぼう。</p>
        <div class="houhou">${HOUHOU.map(h => `
          <button type="button" class="hh ${pick === h.name ? "on" : ""}" data-houhou="${h.name}"><b>${h.name}</b><span>${h.when}</span></button>`).join("")}</div>
        ${field("nani", "この調べ方で、何を確かめる？", { rows: 2, placeholder: "例：雑音ありとなしで、同じ問題を解いた数を比べる" })}
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
        <div class="tc-row"><span>調べ方</span><b>${esc(d.houhou || "—")}</b></div>
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
    if (i === 4 || i === 5) return !!(c.v("houhou") && c.v("nani") && c.v("yotei"));
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
    if (ty) {
      const idx = Number(ty.dataset.qtype), qs = qsOf(c).map(q => ({ ...q }));
      qs[idx].k = ty.dataset.k;
      c.set("qs", qs);
      ty.parentElement.querySelectorAll(".kchip").forEach(b => b.classList.toggle("on", b === ty));
      const left = qs.filter(q => !q.k).length;
      const el = c.app.querySelector("[data-qleft]"); if (el) el.textContent = String(left);
      refreshNav(c, L04.canNext(2, c));
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
    const b = t.closest("[data-houhou]");
    if (b) { c.set("houhou", b.dataset.houhou); c.rerender(); return true; }
    return false;
  }
};
