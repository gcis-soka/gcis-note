// ステージ4：Quest 2（第2回→第3回）「？」の手がかりになりそうな本か動画
// 仕様：ナレッジの L03.md「Quest 2」。授業中に始められる子は始める
// data：findq（動画を探す言葉）・findb（本を探す言葉）・douga〜douga5（動画のリンク）・honTitle〜honTitle5（本の題名）・isbn〜isbn5・kokoro（いちばん心に残った所と、ひとこと）・fromL02（第2回の値を写した印）
import { quest, LIBRARY_URL, YOUTUBE_SEARCH, PICK_N, listOf } from "./common.js";
const Q = quest(2);

const qsOf = d => ["q1", "q2", "q3"].map(k => String(d[k] || "").trim()).filter(Boolean);

// 蔵書検索の使い方の図（トップ→詳細検索→書名に貼る→高等学校だけ）。詳細検索のURLは直接開けないのでトップから（11/5）
const LIB_HOWTO = `
  <figure class="urlhowto libhowto" aria-label="蔵書検索の使い方：詳細検索を押し、書名に貼り付け、高等学校だけにチェックして検索">
    <svg viewBox="0 0 540 222" role="img" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="250" height="220" rx="10" fill="#fff" stroke="#c9ced8"/>
      <rect x="1" y="1" width="250" height="34" rx="10" fill="#fff"/>
      <text x="14" y="24" font-size="14" font-weight="700" fill="#2e7d32">創価学園図書館</text>
      <rect x="2" y="38" width="248" height="172" fill="#7fd8f0"/>
      <rect x="16" y="70" width="220" height="110" rx="8" fill="#f0f0f0"/>
      <text x="26" y="104" font-size="12" fill="#333">蔵書検索</text>
      <rect x="80" y="88" width="90" height="24" rx="3" fill="#fff" stroke="#aaa"/>
      <rect x="174" y="88" width="56" height="24" rx="3" fill="#388e3c"/>
      <text x="179" y="105" font-size="11" fill="#fff" textLength="46" lengthAdjust="spacingAndGlyphs">検索する</text>
      <text x="104" y="150" font-size="13" fill="#1a0dab" text-decoration="underline">› 詳細検索</text>
      <rect x="96" y="134" width="80" height="24" rx="6" fill="none" stroke="#d93025" stroke-width="3"/>
      <circle cx="196" cy="146" r="12" fill="#d93025"/><text x="191" y="151" font-size="14" font-weight="700" fill="#fff">1</text>
      <path d="M258 120 L278 120" stroke="#d93025" stroke-width="3"/><path d="M276 112 L288 120 L276 128 Z" fill="#d93025"/>
      <rect x="289" y="1" width="250" height="220" rx="10" fill="#fff" stroke="#c9ced8"/>
      <text x="302" y="26" font-size="14" font-weight="700" fill="#222">🔍 詳細検索</text>
      <path d="M300 36 H528" stroke="#2e7d32" stroke-width="2"/>
      <rect x="302" y="52" width="54" height="24" rx="3" fill="#fff" stroke="#aaa"/><text x="308" y="69" font-size="12" fill="#333">書名 ▾</text>
      <rect x="362" y="52" width="110" height="24" rx="3" fill="#fff" stroke="#aaa"/>
      <text x="370" y="69" font-size="12" fill="#999">ここに貼り付け</text>
      <rect x="359" y="49" width="116" height="30" rx="5" fill="none" stroke="#d93025" stroke-width="3"/>
      <circle cx="494" cy="64" r="12" fill="#d93025"/><text x="489" y="69" font-size="14" font-weight="700" fill="#fff">2</text>
      <text x="302" y="118" font-size="12" fill="#1a0dab" text-decoration="underline">⌃ 所蔵館を指定する</text>
      <text x="302" y="148" font-size="12" fill="#333">☐ 小学校　☐ 中学校</text>
      <text x="428" y="148" font-size="12" font-weight="700" fill="#333">☑ 高等学校</text>
      <rect x="422" y="131" width="78" height="24" rx="5" fill="none" stroke="#d93025" stroke-width="3"/>
      <circle cx="518" cy="143" r="11" fill="#d93025"/><text x="513" y="148" font-size="14" font-weight="700" fill="#fff">3</text>
      <rect x="370" y="176" width="88" height="30" rx="4" fill="#388e3c"/>
      <text x="386" y="196" font-size="14" font-weight="700" fill="#fff">検索する</text>
    </svg>
    <figcaption>① 開いたページの「<b>詳細検索</b>」を押す → ② 「<b>書名</b>」の欄に貼り付け（<kbd>Ctrl</kbd>＋<kbd>V</kbd>）→ ③ 「所蔵館を指定する」で「<b>高等学校</b>」だけにチェックして「検索する」</figcaption>
  </figure>`;

// 本か動画を探す道具（第2回の最後と Quest 2 で使う）。動画と本で言葉が違うので、欄とボタンを2組に（11/4）
// findq＝動画を探す言葉（YouTube）／findb＝本を探す言葉（学校図書館の蔵書検索）
export function findTools(c) {
  const { esc, d } = c;
  return `
    <div class="findrow">
      <div class="field"><label><span class="label">動画を探す言葉</span><span class="hint">AIの表の「YouTube」の言葉でも、自分の言葉でもOK</span>
        <input data-key="findq" type="text" value="${esc(d.findq || "")}" placeholder="例：集中力 雑音 実験"></label></div>
      <div class="searchbtns"><button type="button" class="btn" data-find="youtube" data-findkey="findq">YouTubeで探す ↗</button></div>
    </div>
    <div class="findrow">
      <div class="field"><label><span class="label">本を探す言葉</span><span class="hint">蛍雪図書館（学校の図書館）で探します。AIの表の「学校図書館」の言葉でも、自分の言葉でもOK</span>
        <input data-key="findb" type="text" value="${esc(d.findb || "")}" placeholder="例：睡眠不足"></label></div>
      <div class="searchbtns"><button type="button" class="btn" data-find="library" data-findkey="findb">蛍雪図書館の蔵書検索 ↗</button></div>
      <p class="hint">ボタンを押すと、この言葉がコピーされます。開いたページで、下の図のとおりに探そう。</p>
      <p class="hint warn-text" data-find-msg hidden></p>
      ${LIB_HOWTO}
      <p class="hint">ヒットしないときは、もっと広い言葉にしてみよう（例：「睡眠不足」→「睡眠」）。</p>
    </div>
    <p class="hint">本か動画のどちらか一方でOK。</p>`;
}
export function handleFind(t, c) {
  const b = t.closest("[data-find]");
  if (!b) return false;
  const q = c.v(b.dataset.findkey);
  if (b.dataset.find === "youtube") {
    if (!q) { alert("先に探す言葉を入れてね"); return true; }
    window.open(YOUTUBE_SEARCH(q), "_blank", "noopener");
  } else if (LIBRARY_URL.includes("{q}")) {
    window.open(LIBRARY_URL.replace("{q}", encodeURIComponent(q)), "_blank", "noopener");
  } else {
    // 蔵書検索は検索語をURLに載せられない → 言葉をコピーしてから開き、貼ってもらう
    const copied = q ? copyText(q) : false;
    window.open(LIBRARY_URL, "_blank", "noopener");
    const msg = b.closest(".findrow")?.querySelector("[data-find-msg]");
    // コピーできたときは何も出さない（押す前の1行で足りる）。できなかったときだけ知らせる
    if (msg) {
      msg.hidden = copied;
      msg.innerHTML = copied ? "" : `${q ? "コピーできませんでした。" : ""}下の図の②で、<b>「書名」の欄に探す言葉を入れて</b>検索しよう。`;
    }
  }
  return true;
}
// 押した瞬間に同期でコピー（新しいタブに移る前に済ませる）
function copyText(t) {
  try {
    const ta = document.createElement("textarea");
    ta.value = t; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy"); ta.remove();
    if (ok) return true;
  } catch { /* 下へ */ }
  try { navigator.clipboard?.writeText(t); return true; } catch { return false; }
}

// 見る動画・読む本（第2回の最後で決める／Quest 2 で見たもの・読んだもの）。動画も本も5件まで、入力すると次の欄が出る
// ISBN は本を手に取る Quest 2 だけ（空でも提出できる）
export function pickFields(c, { done = false } = {}) {
  const { field } = c;
  const nth = (i, unit) => i ? `（${i + 1}${unit}目）` : "";
  const reveal = (i, prevKey) => i ? ` data-reveal-after="${prevKey}" hidden` : "";
  const videos = PICK_N.map((n, i) => `
      <div class="pickone"${reveal(i, "douga" + PICK_N[i - 1])}>
        <div class="urlrow">
          ${field("douga" + n, `${done ? "見た" : "見る"}動画のリンク${nth(i, "本")}`, { type: "text", placeholder: "https://youtu.be/…", hint: i ? "" : "YouTubeの「共有」→「コピー」。入力すると次の欄が出ます" })}
          <a class="btn small ghost openurl" data-open-url="douga${n}" target="_blank" rel="noopener" hidden>この動画を開く ↗</a>
        </div>
      </div>`).join("");
  const books = PICK_N.map((n, i) => `
      <div class="pickone"${reveal(i, "honTitle" + PICK_N[i - 1])}>
        ${field("honTitle" + n, `${done ? "読んだ" : "読む"}本の題名${nth(i, "冊")}`, { type: "text", placeholder: "例：『〇〇〇〇』", hint: i ? "" : "入力すると次の欄が出ます" })}
        ${done ? field("isbn" + n, "ISBN", { type: "text", placeholder: "例：9784780802047", hint: i ? "" : "本の裏表紙のバーコードの上か、奥付にある「978」から始まる13桁。蛍雪図書館の本なら、蔵書検索の本の画面（書誌詳細）にもあります。第3回に RefNavi に登録するときに使います" }) : ""}
      </div>`).join("");
  return `<div class="findrow">${videos}</div><div class="findrow">${books}</div>`;
}
// Quest 2 を初めて開いたとき、第2回で入れた値（探す言葉・見る動画・読む本）を写す（同じことを2回書かせない）
export const FROM_L02 = ["findq", "findb", ...PICK_N.map(n => "douga" + n), ...PICK_N.map(n => "honTitle" + n)];
function copyFromL02(c) {
  if (c.d.fromL02) return;
  const L2 = c.prev("L02");
  FROM_L02.forEach(k => { if (!c.v(k) && String(L2[k] || "").trim()) c.d[k] = L2[k]; });
  c.set("fromL02", 1);
}

export const PICK_TIPS = `
  <p class="hint"><b>ぴったりの本でなくても大丈夫。</b>図書館に行って、同じ棚に他にどんな本が並んでいるかも見てみよう。</p>`;

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
    copyFromL02(c);
    const qs = qsOf(c.prev("L02"));
    return `
      <div class="recap">
        <div class="tc-row big"><span>第2回で気になったこと</span><b>${qs.length ? `<ul class="qs">${qs.map(q => `<li>${esc(q)}</li>`).join("")}</ul>` : "—"}</b></div>
      </div>
      <p>この「？」の<b>手がかりになりそうな本か動画</b>を見たり読んだりしよう。<br>いちばん心に残った所を1つ、<b>第3回に班で紹介します</b>。</p>
      <div class="share">
        <b>動画なら</b>
        <ul>
          <li>合わせて5分以上見る（短い動画やショートを何本か見てもOK）</li>
          <li>心に残った所は、<b>時間（例：2分05秒）</b>をひとことに書こう。開始位置つきのリンクならもっと良い（YouTubeの「共有」→「開始位置」にチェック→コピー）</li>
        </ul>
        <b>本なら</b>
        <ul>
          <li>パラパラ見て、気になったページを少し読めばOK（蛍雪図書館・家の本・町の図書館）</li>
          <li>題名・ISBN・心に残ったページを書く。<b>第3回に本を持ってこよう</b></li>
        </ul>
      </div>
      <h3>探す</h3>
      ${findTools(c)}
      ${PICK_TIPS}
      <h3>見たら・読んだら書く</h3>
      ${pickFields(c, { done: true })}
      ${field("kokoro", "いちばん心に残った所と、ひとこと", { rows: 3, hint: "動画は時間（例：2分05秒）、本はページも書こう", placeholder: "例：2分05秒あたり。雑音の大きさによって、集中しやすさが逆になるという話。自分のは小さい音だったのかも" })}
      <p class="hint">手がかりにならなくても大丈夫。第3回で研究を探します。</p>
      ${c.submitted ? `<p class="okmsg">提出済み ✓　あとから直しても自動で保存されます。</p>` : ""}`;
  },

  canNext(i, c) {
    return !!((listOf(c.d, "douga").length || listOf(c.d, "honTitle").length) && c.v("kokoro"));
  },
  // 次へが押せないときに出す名前（「〜が書けたら、次へ進もう」）
  need(i, c) {
    const m = [];
    if (!(listOf(c.d, "douga").length || listOf(c.d, "honTitle").length)) m.push("「見た動画のリンク」か「読んだ本の題名」");
    if (!c.v("kokoro")) m.push("「ひとこと」");
    return m;
  },

  onClick(t, c) {
    return handleFind(t, c);
  }
};
