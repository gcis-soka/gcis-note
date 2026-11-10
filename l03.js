// ステージ5／第3回（11/16）先行研究に出会う（A案：ニュース→本・動画→論文）
// 仕様：ナレッジの L03.md。論文は2本決める。長すぎないものを選んで全文を読む（授業で途中まで→残りは Quest 3）
// RefNavi への登録は授業で（URLを貼るだけ）。アプリは登録しないが、登録するもの（第2回の記事・Quest 2 の動画と本）を一覧で出す（11/5）
// data：hanMemo・refLogin・refDouga・refHon・refKiji・refHan（RefNavi の進み具合）・kensaku・tried・p1Url・p2Url・p1Doi・p2Doi・sanko（RefNavi から貼った参考文献リスト）（読むのは Quest 3。授業中に始める：11/7）
// 論文は URL だけ（題名は RefNavi に入れる：11/7）。Geminiのチャットは AIの文の下の chatUrl で預かる（共有リンク欄は 11/7 廃止）
import { quest, listOf, booksOf, refnaviGroupOf, REFNAVI_GROUPS, doiOf, snapFirst } from "./common.js";
import { copyText } from "./r02.js";
// Quest 2 で見たもの・読んだもの（動画・本の2欄）
const pickText = R => [...listOf(R, "douga"), ...listOf(R, "honTitle")].join(" ／ ");

const qsOf = d => ["q1", "q2", "q3"].map(k => String(d[k] || "").trim()).filter(Boolean);
const tail = s => String(s || "").trim().replace(/[。．.、,，！!\s　]+$/u, "");
const safeUrl = u => /^https?:\/\//i.test(String(u || "").trim()) ? String(u).trim() : "";

// 探す場所（検索語を入れて開く）
const SEARCH = [
  { id: "scholar", label: "Google Scholar で探す", url: q => `https://scholar.google.co.jp/scholar?hl=ja&q=${encodeURIComponent(q)}` },
  { id: "jstage", label: "J-STAGE", url: q => `https://www.jstage.jst.go.jp/result/global/-char/ja?globalSearchKey=${encodeURIComponent(q)}` },
  { id: "cinii", label: "CiNii", url: q => `https://cir.nii.ac.jp/all?q=${encodeURIComponent(q)}` }
];

// 論文を探す道具（検索語・Scholar／J-STAGE／CiNii・試した言葉・選び方）。第3回と Quest 3（折りたたみ）で使う
export function searchTools(c) {
  const { esc, d } = c;
  return `
      <div class="field"><label><span class="label">検索語</span><span class="hint">AIの言葉でも、自分の言葉でもOK。何度でも試そう</span>
        <input data-key="kensaku" type="text" value="${esc(d.kensaku || "")}" placeholder="例：雑音 集中 作業効率"></label></div>
      <div class="searchbtns">${SEARCH.map((s, j) => `<button type="button" class="btn ${j ? "ghost" : ""}" data-search="${s.id}">${s.label} ↗</button>`).join("")}</div>
      ${d.tried ? `<p class="hint">試した言葉：${esc(d.tried)}</p>` : ""}
      <ul class="todo">
        <li><b>長すぎないもの</b>を選ぼう（ページ数を見る）。全部読みます</li>
        <li>右に<b>[PDF]</b>があるもの・J-STAGEなど、<b>無料で読めるもの</b>から</li>
        <li><b>DOI がない論文</b>は、RefNavi に参考文献の情報を手で入れることになって大変。気をつけて選ぼう</li>
        <li>見つからないときは、日本語だけ／英語で／言葉を変えて。それでもなければ「研究が少ない」のも発見です</li>
      </ul>`;
}
// 論文のページの見方の図（Scholar の結果→題名を押す→J-STAGE の論文のページ：URL・DOI・PDF）。
// 先生の画面写真（11/8：Scholar の結果・J-STAGE の論文のページ）をもとに図式で描いた。題名・著者・DOI は架空の見本
const PAPER_HOWTO = `
  <figure class="urlhowto libhowto" aria-label="論文のページの見方：Scholarで題名を押し、論文のページでURL・DOI・PDFを見つける">
    <svg viewBox="0 0 540 412" role="img" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="538" height="162" rx="10" fill="#fff" stroke="#c9ced8"/>
      <rect x="10" y="10" width="520" height="22" rx="11" fill="#eef1f6"/>
      <text x="22" y="25" font-size="11" fill="#5f6673">scholar.google.co.jp/scholar?q=…</text>
      <text x="16" y="58" font-size="16" fill="#666">Google Scholar</text>
      <rect x="140" y="42" width="250" height="24" rx="2" fill="#fff" stroke="#4285f4"/>
      <text x="150" y="59" font-size="11" fill="#333">検索語</text>
      <rect x="390" y="42" width="30" height="24" fill="#4285f4"/>
      <circle cx="403" cy="52" r="5" fill="none" stroke="#fff" stroke-width="2"/><path d="M407 56 L412 61" stroke="#fff" stroke-width="2"/>
      <path d="M10 76 H530" stroke="#e3e3e3"/>
      <text x="22" y="100" font-size="14" fill="#660099" text-decoration="underline">論文の題名</text>
      <rect x="14" y="84" width="104" height="24" rx="5" fill="none" stroke="#d93025" stroke-width="3"/>
      <circle cx="136" cy="96" r="12" fill="#d93025"/><text x="131" y="101" font-size="14" font-weight="700" fill="#fff">1</text>
      <text x="156" y="100" font-size="11" fill="#d93025" font-weight="700">題名を押す</text>
      <text x="22" y="120" font-size="11" fill="#006621">著者名，著者名</text>
      <text x="22" y="136" font-size="11" fill="#006621">雑誌名, 2023 · jstage.jst.go.jp</text>
      <text x="22" y="153" font-size="10" fill="#888">抄録（研究の短いまとめ）…</text>
      <text x="398" y="100" font-size="13" fill="#1a0dab"><tspan font-weight="700">[PDF]</tspan> jst.go.jp</text>
      <rect x="392" y="84" width="104" height="24" rx="5" fill="none" stroke="#d93025" stroke-width="2" stroke-dasharray="4 3"/>
      <text x="398" y="124" font-size="10" fill="#d93025">[PDF] があれば</text>
      <text x="398" y="138" font-size="10" fill="#d93025">本文を無料で読める</text>
      <path d="M270 166 L270 182" stroke="#d93025" stroke-width="3"/><path d="M262 180 L270 192 L278 180 Z" fill="#d93025"/>
      <rect x="1" y="194" width="538" height="216" rx="10" fill="#fff" stroke="#c9ced8"/>
      <rect x="10" y="203" width="300" height="22" rx="11" fill="#eef1f6"/>
      <text x="22" y="218" font-size="11" fill="#5f6673">jstage.jst.go.jp/article/…</text>
      <rect x="6" y="199" width="308" height="30" rx="8" fill="none" stroke="#d93025" stroke-width="3"/>
      <circle cx="330" cy="214" r="12" fill="#d93025"/><text x="325" y="219" font-size="14" font-weight="700" fill="#fff">2</text>
      <text x="350" y="218" font-size="11" fill="#d93025" font-weight="700">このページのURL → 論文のURL欄へ</text>
      <rect x="2" y="234" width="536" height="28" fill="#2e3a87"/>
      <text x="16" y="253" font-size="12" font-weight="700" fill="#fff">J-STAGE　　雑誌名</text>
      <text x="16" y="286" font-size="14" fill="#222">論文の題名</text>
      <text x="16" y="303" font-size="11" fill="#333">著者名，著者名</text>
      <rect x="16" y="311" width="40" height="16" rx="8" fill="#eef5e0"/><text x="36" y="323" font-size="10" fill="#7a9a2a" text-anchor="middle">フリー</text>
      <rect x="16" y="340" width="32" height="18" rx="2" fill="#eaf4f7" stroke="#7fb3c8"/><text x="32" y="353" font-size="10" fill="#2a6f86" text-anchor="middle">DOI</text>
      <text x="56" y="353" font-size="12" fill="#1a73e8" text-decoration="underline">https://doi.org/10.xxxxx/xxxx</text>
      <rect x="10" y="334" width="252" height="30" rx="6" fill="none" stroke="#d93025" stroke-width="3"/>
      <circle cx="278" cy="349" r="12" fill="#d93025"/><text x="273" y="354" font-size="14" font-weight="700" fill="#fff">3</text>
      <text x="298" y="346" font-size="11" fill="#d93025" font-weight="700">右クリック →「リンクのアドレスを</text>
      <text x="298" y="361" font-size="11" fill="#d93025" font-weight="700">コピー」→ DOI欄へ</text>
      <rect x="388" y="274" width="140" height="28" rx="4" fill="#d50000"/>
      <text x="458" y="293" font-size="12" font-weight="700" fill="#fff" text-anchor="middle">PDFをダウンロード</text>
      <rect x="384" y="270" width="148" height="36" rx="7" fill="none" stroke="#d93025" stroke-width="3"/>
      <circle cx="366" cy="288" r="12" fill="#d93025"/><text x="361" y="293" font-size="14" font-weight="700" fill="#fff">4</text>
      <text x="390" y="322" font-size="10" fill="#d93025">本文（PDF）が開く</text>
      <text x="16" y="386" font-size="11" fill="#555">抄録</text>
      <path d="M16 396 H360 M16 404 H300" stroke="#ddd" stroke-width="4"/>
    </svg>
    <figcaption>J-STAGE の例：① Scholar で<b>題名</b>を押す（右に <b>[PDF]</b> があれば、本文を無料で読めます）→ ② 開いたページの<b>アドレスバーのURL</b>をコピーして「論文のURL」へ → ③ <b>DOI</b> のリンクを右クリック（Chromebook は2本指でタップ）→「<b>リンクのアドレスをコピー</b>」→「DOI」の欄に貼る → ④「<b>PDFをダウンロード</b>」で本文を開いて読む。ほかのサイトでも「DOI」「doi.org」を探そう</figcaption>
  </figure>`;
// 論文①②（Quest 3 は③も：11/9）のURL欄（右に「この論文を開く」）と DOI 欄（RefNavi は論文を DOI で登録する：RefNavi_manual_52。11/7）
// DOI 欄はリンクの形（https://doi.org/10.…）にそろえ、右に「このDOIを開く」。番号だけを使うのは RefNavi に写すときだけ（11/9 先生）。
// 番号だけ・「DOI: 10.…」を貼ってもリンクの形に直す。URL 欄に doi.org のリンクを貼ったときは、空の DOI 欄に入れる
export function paperFields(c, count = 2) {
  const NO = { 1: "①", 2: "②", 3: "③" };
  return PAPER_HOWTO + ["1", "2", "3"].slice(0, count).map(n => `
      <div class="paperbox">
        <div class="urlrow">
          ${c.field(`p${n}Url`, `論文${NO[n]}のURL${n === "3" ? "（もっと読みたくなったら）" : ""}`, { type: "url", placeholder: "https://…", hint: n === "1" ? "論文のページのURL（アドレスバー）をコピーして貼ろう" : n === "3" ? "入れると、上に「論文③」のタブができて、メモが書けます" : "" })}
          <a class="btn small ghost openurl" data-open-url="p${n}Url" target="_blank" rel="noopener" hidden>この論文を開く ↗</a>
        </div>
        <div class="urlrow">
          ${c.field(`p${n}Doi`, `論文${NO[n]}のDOI`, { type: "url", placeholder: "https://doi.org/10.xxxxx/xxxxx", hint: n === "1" ? "DOI のリンク（https://doi.org/…）を貼ろう。DOI がない論文は空でOK" : "" })}
          <a class="btn small ghost openurl" data-open-url="p${n}Doi" target="_blank" rel="noopener" hidden>このDOIを開く ↗</a>
        </div>
        <p class="hint okmsg" data-doi-note="${n}" hidden>DOI のリンクの形にしました ✓</p>
      </div>`).join("");
}
// 入力のたびに：DOI 欄をリンクの形に／URL 欄が doi.org のリンクなら空の DOI 欄に入れる（第3回・Quest 3 の onInput から呼ぶ）
export const doiLink = s => { const d = doiOf(s); return d ? `https://doi.org/${d}` : ""; };
export function handlePaperInput(el, c) {
  const m = /^p([123])(Url|Doi)$/.exec(el.dataset.key || "");
  if (!m) return;
  const n = m[1], box = el.closest(".paperbox");
  const note = () => { const p = box?.querySelector(`[data-doi-note="${n}"]`); if (p) p.hidden = false; };
  if (m[2] === "Doi") {
    const link = doiLink(el.value);
    if (link && link !== el.value.trim()) { el.value = link; c.set(el.dataset.key, link); note(); }
    return;
  }
  const link = /doi\.org\//i.test(el.value) ? doiLink(el.value) : "";
  const t = box?.querySelector(`[data-key="p${n}Doi"]`);
  if (link && t && !c.v(`p${n}Doi`)) { t.value = link; c.set(`p${n}Doi`, link); t.dispatchEvent(new Event("input", { bubbles: true })); }
}
// RefNavi に写すとき用：DOI の番号だけをコピーするボタン（押したときの欄の値から作る）
export function doiCopyButtons(count) {
  return `<div class="searchbtns doicopy">${["①", "②", "③"].slice(0, count).map((no, j) =>
    `<button type="button" class="btn small ghost" data-copydoi="p${j + 1}Doi">論文${no}のDOI番号をコピー</button>`).join("")}</div>`;
}
export function handleDoiCopy(t, c) {
  const b = t.closest("[data-copydoi]");
  if (!b) return false;
  const d = doiOf(c.v(b.dataset.copydoi)), was = b.textContent;
  if (d) copyText(d);
  b.textContent = d ? "コピーしました ✓" : "DOI がまだありません";
  setTimeout(() => { b.textContent = was; }, 1500);
  return true;
}
// 検索ボタン（試した言葉を残す：新しい順・10個まで）
export function handleSearch(t, c) {
  const s = t.closest("[data-search]");
  if (!s) return false;
  const q = c.v("kensaku");
  if (!q) { alert("先に検索語を入れてね"); return true; }
  const S = SEARCH.find(x => x.id === s.dataset.search);
  window.open(S.url(q), "_blank", "noopener");
  const list = String(c.d.tried || "").split(" / ").filter(Boolean).filter(x => x !== q);
  c.set("tried", [q, ...list].slice(0, 10).join(" / "));
  c.rerender();
  return true;
}

// ---------- プロンプト（試作・未試行：L03.md「検索語プロンプト」） ----------
function promptWords(c) {
  const L1 = c.prev("L01"), qs = qsOf(c.prev("L02")), R2 = c.prev("R02");
  const setsu = tail(L1.setsu) || "（説）";
  const q = qs.length ? qs.map(x => `「${x}」`).join("") : "（気になったこと）";
  const kokoro = tail(R2.kokoro) ? `本か動画で、「${tail(R2.kokoro)}」という所が心に残りました。` : "";
  return `私は高校1年生です。「${setsu}」という説について、${q}が気になっています。${kokoro}` +
    "Google Scholarで研究を探すための検索語を考えてください。研究者が論文で使う言葉で、日本語の組み合わせを3つ、英語の組み合わせを3つ、それぞれ2〜3語にしてください。" +
    "論文名や著者名は書かないでください。「検索語｜この言葉を選んだわけ（20文字以内）」の表にしてください。表のあとには何も書かないでください。";
}

function myRecap(c) {
  const L1 = c.prev("L01"), qs = qsOf(c.prev("L02")), R2 = c.prev("R02"), esc = c.esc;
  return `
    <div class="recap">
      <div class="tc-row"><span>説（第1回）</span><b>${esc(L1.setsu || "—")}</b></div>
      <div class="tc-row"><span>気になったこと（第2回）</span><b>${qs.length ? `<ul class="qs">${qs.map(q => `<li>${esc(q)}</li>`).join("")}</ul>` : "—"}</b></div>
      <div class="tc-row"><span>${quest(2)}：見たもの・読んだもの</span><b>${esc(pickText(R2) || "—")}</b></div>
      <div class="tc-row"><span>心に残った所</span><b>${esc(R2.kokoro || "—")}</b></div>
    </div>`;
}

// ---------- RefNavi に登録する（11/7 追加：班で紹介のあと） ----------
const REFNAVI_URL = "https://www.refnavi.net/index.php";
// 生徒に RefNavi の動画は見せない。アプリの図と手順だけで登録できるようにする（11/7 先生）
// ログインの図（トップ→Googleでログイン→学校のアカウント）。先生の画面写真（11/7）をもとに描いた
const REF_LOGIN_HOWTO = `
  <figure class="urlhowto libhowto" aria-label="RefNaviのログイン：Googleでログインを押し、学校のアカウントを選ぶ">
    <svg viewBox="0 0 540 222" role="img" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="250" height="220" rx="10" fill="#fff" stroke="#c9ced8"/>
      <rect x="10" y="10" width="232" height="22" rx="11" fill="#eef1f6"/>
      <text x="22" y="25" font-size="11" fill="#5f6673">refnavi.net/index.php</text>
      <text x="126" y="78" font-size="30" font-weight="700" fill="#4a4a4a" text-anchor="middle">RefNavi</text>
      <text x="126" y="98" font-size="9" fill="#3d7a4f" text-anchor="middle">Better Information, Better Inquiry</text>
      <rect x="56" y="114" width="140" height="30" rx="3" fill="#fff" stroke="#bbb"/>
      <text x="70" y="134" font-size="13" font-weight="700" fill="#4285f4">G</text>
      <text x="88" y="134" font-size="12" fill="#333">Googleでログイン</text>
      <rect x="52" y="110" width="148" height="38" rx="6" fill="none" stroke="#d93025" stroke-width="3"/>
      <circle cx="216" cy="129" r="12" fill="#d93025"/><text x="211" y="134" font-size="14" font-weight="700" fill="#fff">1</text>
      <rect x="56" y="156" width="140" height="30" rx="3" fill="#fff" stroke="#ddd"/>
      <text x="70" y="176" font-size="12" fill="#aaa">Microsoftでログイン</text>
      <path d="M258 120 L278 120" stroke="#d93025" stroke-width="3"/><path d="M276 112 L288 120 L276 128 Z" fill="#d93025"/>
      <rect x="289" y="1" width="250" height="220" rx="10" fill="#fff" stroke="#c9ced8"/>
      <text x="414" y="34" font-size="14" font-weight="700" fill="#222" text-anchor="middle">アカウントの選択</text>
      <path d="M300 48 H528" stroke="#e3e3e3"/>
      <circle cx="318" cy="76" r="12" fill="#1e6b57"/><text x="313" y="81" font-size="12" fill="#fff">S</text>
      <text x="338" y="73" font-size="12" font-weight="700" fill="#222">学校のアカウント</text>
      <text x="338" y="89" font-size="11" fill="#5f6673">…@tokyo.soka.ed.jp</text>
      <rect x="300" y="56" width="200" height="42" rx="6" fill="none" stroke="#d93025" stroke-width="3"/>
      <circle cx="516" cy="77" r="12" fill="#d93025"/><text x="511" y="82" font-size="14" font-weight="700" fill="#fff">2</text>
      <path d="M300 108 H528" stroke="#e3e3e3"/>
      <circle cx="318" cy="132" r="12" fill="#bbb"/><text x="313" y="137" font-size="12" fill="#fff">?</text>
      <text x="338" y="136" font-size="12" fill="#999">ほかのアカウント（使わない）</text>
    </svg>
    <figcaption>① 「<b>Googleでログイン</b>」を押す → ② <b>学校のアカウント</b>（…@tokyo.soka.ed.jp）を選ぶ</figcaption>
  </figure>`;
// 初めて RefNavi に入るとき：1つの画面に「児童・生徒」（はじめから選ばれている）・グループコード・「RefNaviに入る」が縦に並ぶ（11/9 先生の画面写真に合わせた）
const REF_FIRST_HOWTO = `
  <figure class="urlhowto libhowto" aria-label="初めてのとき：児童・生徒になっているか確かめ、グループコードを入れてRefNaviに入る">
    <svg viewBox="0 0 540 200" role="img" xmlns="http://www.w3.org/2000/svg">
      <rect x="95" y="1" width="350" height="198" rx="10" fill="#fff" stroke="#c9ced8"/>
      <text x="270" y="32" font-size="13" font-weight="700" fill="#222" text-anchor="middle">先生か児童生徒のどちらか選んでください。</text>
      <circle cx="236" cy="58" r="7" fill="#fff" stroke="#1a73e8" stroke-width="2"/><circle cx="236" cy="58" r="3.5" fill="#1a73e8"/>
      <text x="250" y="63" font-size="12" fill="#222">児童・生徒</text>
      <circle cx="236" cy="82" r="7" fill="#fff" stroke="#bbb" stroke-width="1.5"/>
      <text x="250" y="87" font-size="12" fill="#999">先生</text>
      <rect x="222" y="45" width="96" height="26" rx="6" fill="none" stroke="#d93025" stroke-width="3"/>
      <circle cx="336" cy="58" r="12" fill="#d93025"/><text x="331" y="63" font-size="14" font-weight="700" fill="#fff">1</text>
      <text x="354" y="62" font-size="10" fill="#5f6673">はじめから</text><text x="354" y="75" font-size="10" fill="#5f6673">選ばれている</text>
      <text x="172" y="124" font-size="11" fill="#333">グループコード：</text>
      <rect x="262" y="106" width="96" height="28" rx="4" fill="#fff" stroke="#aaa"/><text x="270" y="125" font-size="11" fill="#999">ここに貼る</text>
      <rect x="258" y="102" width="104" height="36" rx="6" fill="none" stroke="#d93025" stroke-width="3"/>
      <circle cx="380" cy="120" r="12" fill="#d93025"/><text x="375" y="125" font-size="14" font-weight="700" fill="#fff">2</text>
      <rect x="195" y="152" width="150" height="32" rx="5" fill="#1a73e8"/><text x="270" y="173" font-size="12" fill="#fff" text-anchor="middle">RefNaviに入る</text>
      <rect x="191" y="148" width="158" height="40" rx="7" fill="none" stroke="#d93025" stroke-width="3"/>
      <circle cx="367" cy="168" r="12" fill="#d93025"/><text x="362" y="173" font-size="14" font-weight="700" fill="#fff">3</text>
    </svg>
    <figcaption>① 「<b>児童・生徒</b>」になっているか確かめる（はじめから選ばれています）→ ② 上の<b>グループコード</b>を「コピー」して貼る → ③ 「<b>RefNaviに入る</b>」（2回目からは、ログインするだけで使えます）</figcaption>
  </figure>`;
// 個人タグ（11/9 先生）：全員が同じ名前の個人タグを作り、登録のたびに選ぶ。グループタグは選ばない
export const REF_TAG = "1年個人探究";
// タグを作る図：「整理する」→「タグ管理」→ タグ名 →「作る」
const REF_TAG_HOWTO = `
  <figure class="urlhowto libhowto" aria-label="個人タグを作る：整理するのタグ管理で、タグ名を入れて作る">
    <svg viewBox="0 0 540 150" role="img" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="250" height="148" rx="10" fill="#fff" stroke="#c9ced8"/>
      <text x="20" y="32" font-size="12" fill="#333">調べる ▾</text><text x="86" y="32" font-size="12" font-weight="700" fill="#222">整理する ▾</text><text x="168" y="32" font-size="12" fill="#333">グラフ</text>
      <rect x="80" y="16" width="76" height="24" rx="5" fill="none" stroke="#d93025" stroke-width="3"/>
      <circle cx="68" cy="28" r="10" fill="#d93025"/><text x="64" y="32" font-size="12" font-weight="700" fill="#fff">1</text>
      <rect x="84" y="48" width="120" height="70" rx="4" fill="#fff" stroke="#bbb"/>
      <text x="96" y="72" font-size="12" fill="#333">リスト</text>
      <text x="96" y="102" font-size="12" font-weight="700" fill="#222">タグ管理</text>
      <rect x="88" y="84" width="112" height="28" rx="5" fill="none" stroke="#d93025" stroke-width="3"/>
      <circle cx="220" cy="98" r="12" fill="#d93025"/><text x="215" y="103" font-size="14" font-weight="700" fill="#fff">2</text>
      <path d="M258 75 L278 75" stroke="#d93025" stroke-width="3"/><path d="M276 67 L288 75 L276 83 Z" fill="#d93025"/>
      <rect x="289" y="1" width="250" height="148" rx="10" fill="#fff" stroke="#c9ced8"/>
      <text x="414" y="28" font-size="13" font-weight="700" fill="#222" text-anchor="middle">タグを作る</text>
      <text x="304" y="62" font-size="11" fill="#333">タグ名：</text>
      <rect x="352" y="46" width="120" height="26" rx="3" fill="#fff" stroke="#aaa"/><text x="360" y="64" font-size="11" fill="#222">${REF_TAG}</text>
      <rect x="348" y="42" width="128" height="34" rx="6" fill="none" stroke="#d93025" stroke-width="3"/>
      <circle cx="494" cy="59" r="12" fill="#d93025"/><text x="489" y="64" font-size="14" font-weight="700" fill="#fff">3</text>
      <rect x="370" y="92" width="88" height="28" rx="4" fill="#1a73e8"/><text x="414" y="111" font-size="12" fill="#fff" text-anchor="middle">作る</text>
      <rect x="366" y="88" width="96" height="36" rx="6" fill="none" stroke="#d93025" stroke-width="3"/>
      <circle cx="480" cy="106" r="12" fill="#d93025"/><text x="475" y="111" font-size="14" font-weight="700" fill="#fff">4</text>
    </svg>
    <figcaption>① 「<b>整理する</b>」→ ② 「<b>タグ管理</b>」→ ③ タグ名に「<b>${REF_TAG}</b>」を貼る → ④ 「<b>作る</b>」。下の「個人タグ」の表に出たらOK</figcaption>
  </figure>`;
// 論文の登録の図（11/9 先生：RefNavi の「論文」は DOI を貼って「照合」）。REF_ADD_HOWTO と同じ描き方。DOI は架空の見本
export const REF_PAPER_HOWTO = `
  <figure class="urlhowto libhowto" aria-label="RefNaviに論文を登録：論文のボタンを押し、DOIの番号を貼って照合し、タグを選んで登録">
    <svg viewBox="0 0 540 250" role="img" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="250" height="248" rx="10" fill="#fff" stroke="#c9ced8"/>
      <text x="16" y="30" font-size="12" font-weight="700" fill="#222">上の種類のボタン</text>
      <rect x="10" y="48" width="44" height="20" rx="10" fill="#8fd6a3"/><text x="32" y="62" font-size="10" fill="#1f3d2a" text-anchor="middle">本</text><rect x="58" y="48" width="44" height="20" rx="10" fill="#3d7a4f"/><text x="80" y="62" font-size="10" fill="#fff" text-anchor="middle">論文</text><rect x="106" y="48" width="44" height="20" rx="10" fill="#8fd6a3"/><text x="128" y="62" font-size="10" fill="#1f3d2a" text-anchor="middle">雑誌</text><rect x="154" y="48" width="44" height="20" rx="10" fill="#8fd6a3"/><text x="176" y="62" font-size="10" fill="#1f3d2a" text-anchor="middle">新聞</text><rect x="202" y="48" width="44" height="20" rx="10" fill="#8fd6a3"/><text x="224" y="62" font-size="10" fill="#1f3d2a" text-anchor="middle">動画</text><rect x="10" y="74" width="76" height="20" rx="10" fill="#8fd6a3"/><text x="48" y="88" font-size="10" fill="#1f3d2a" text-anchor="middle">ウェブサイト</text><rect x="90" y="74" width="76" height="20" rx="10" fill="#8fd6a3"/><text x="128" y="88" font-size="10" fill="#1f3d2a" text-anchor="middle">パンフレット類</text><rect x="170" y="74" width="76" height="20" rx="10" fill="#8fd6a3"/><text x="208" y="88" font-size="10" fill="#1f3d2a" text-anchor="middle">インタビュー</text><rect x="10" y="100" width="116" height="20" rx="10" fill="#8fd6a3"/><text x="68" y="114" font-size="10" fill="#1f3d2a" text-anchor="middle">行政資料・白書</text><rect x="130" y="100" width="116" height="20" rx="10" fill="#8fd6a3"/><text x="188" y="114" font-size="10" fill="#1f3d2a" text-anchor="middle">統計データ</text>
      <rect x="54" y="44" width="52" height="28" rx="14" fill="none" stroke="#d93025" stroke-width="3"/>
      <circle cx="30" cy="150" r="12" fill="#d93025"/><text x="25" y="155" font-size="14" font-weight="700" fill="#fff">1</text>
      <text x="50" y="154" font-size="11" fill="#333">「論文」を押す</text>
      <text x="16" y="200" font-size="10" fill="#5f6673">※ボタンの並び方は、画面の広さで変わります</text>
      <path d="M258 100 L278 100" stroke="#d93025" stroke-width="3"/><path d="M276 92 L288 100 L276 108 Z" fill="#d93025"/>
      <rect x="289" y="1" width="250" height="248" rx="10" fill="#fff" stroke="#c9ced8"/>
      <text x="304" y="28" font-size="13" font-weight="700" fill="#3d7a4f">論文</text>
      <text x="304" y="50" font-size="11" fill="#333">DOI（10 からはじまる番号）</text>
      <rect x="304" y="58" width="164" height="26" rx="3" fill="#fff" stroke="#aaa"/><text x="311" y="76" font-size="11" fill="#222">10.xxxxx/xxxx</text>
      <rect x="474" y="58" width="40" height="26" rx="3" fill="#f4f6f8" stroke="#888"/><text x="494" y="76" font-size="11" fill="#222" text-anchor="middle">照合</text>
      <rect x="300" y="54" width="218" height="34" rx="6" fill="none" stroke="#d93025" stroke-width="3"/>
      <circle cx="316" cy="108" r="12" fill="#d93025"/><text x="311" y="113" font-size="14" font-weight="700" fill="#fff">2</text>
      <text x="336" y="112" font-size="11" fill="#333">DOI の番号を貼って「照合」</text>
      <rect x="304" y="126" width="220" height="22" rx="3" fill="#f4f6f8"/><text x="312" y="141" font-size="11" fill="#555"><tspan fill="#d93025">＊</tspan> 執筆者名・論文タイトルなどが自動で入る</text>
      <text x="304" y="172" font-size="10" fill="#2f6b43" font-weight="700">個人タグ</text><text x="350" y="172" font-size="10" fill="#999">（いちばん下）</text>
      <rect x="304" y="178" width="132" height="40" rx="3" fill="#fff" stroke="#aaa"/>
      <text x="310" y="192" font-size="10" fill="#555">選択なし</text>
      <rect x="306" y="198" width="128" height="16" fill="#cfd4dc"/><text x="310" y="210" font-size="10" fill="#222">${REF_TAG}</text>
      <rect x="300" y="194" width="140" height="24" rx="5" fill="none" stroke="#d93025" stroke-width="3"/>
      <circle cx="454" cy="206" r="12" fill="#d93025"/><text x="449" y="211" font-size="14" font-weight="700" fill="#fff">3</text>
      <rect x="470" y="222" width="52" height="22" rx="4" fill="#1a73e8"/><text x="496" y="237" font-size="11" fill="#fff" text-anchor="middle">登録</text>
      <circle cx="456" cy="233" r="10" fill="#d93025"/><text x="452" y="237" font-size="12" font-weight="700" fill="#fff">4</text>
    </svg>
    <figcaption>① 上の種類のボタンで「<b>論文</b>」を押す → ② 「<b>DOI</b>」の欄に <b>DOI の番号</b>を貼って「<b>照合</b>」（赤い「＊」の欄が埋まったか確かめる）→ ③ いちばん下の<b>個人タグ</b>で「<b>${REF_TAG}</b>」を選ぶ → ④「<b>登録</b>」。<b>DOI がない論文</b>は、②の照合はせずに、論文のページを見ながら執筆者名・論文タイトル・誌名・巻号・掲載頁・発行年を入れる（見つかるものは全部）</figcaption>
  </figure>`;
// 登録の図（11/10 先生：本・記事・動画の3種類）。どの種類も同じ4ステップ：①種類のボタン ②貼って照合／解析 ③個人タグ ④登録
const REF_ADD_HOWTO = `
  <figure class="urlhowto libhowto" aria-label="RefNaviの登録はどの種類も同じ4ステップ：種類のボタン、貼って照合か解析、個人タグ、登録">
    <svg viewBox="0 0 540 268" role="img" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="538" height="266" rx="10" fill="#fff" stroke="#c9ced8"/>
      <circle cx="24" cy="50" r="11" fill="#d93025"/><text x="24" y="55" font-size="13" font-weight="700" fill="#fff" text-anchor="middle">1</text><text x="40" y="30" font-size="11" font-weight="700" fill="#222">種類のボタンを押す</text>
      <rect x="40" y="40" width="52" height="20" rx="10" fill="#3d7a4f"/><text x="66" y="54" font-size="10" fill="#fff" text-anchor="middle">本</text><rect x="98" y="40" width="52" height="20" rx="10" fill="#cfe9d6"/><text x="124" y="54" font-size="10" fill="#5f6673" text-anchor="middle">論文</text><rect x="156" y="40" width="52" height="20" rx="10" fill="#cfe9d6"/><text x="182" y="54" font-size="10" fill="#5f6673" text-anchor="middle">雑誌</text><rect x="214" y="40" width="52" height="20" rx="10" fill="#cfe9d6"/><text x="240" y="54" font-size="10" fill="#5f6673" text-anchor="middle">新聞</text><rect x="272" y="40" width="52" height="20" rx="10" fill="#3d7a4f"/><text x="298" y="54" font-size="10" fill="#fff" text-anchor="middle">動画</text><rect x="330" y="40" width="84" height="20" rx="10" fill="#3d7a4f"/><text x="372" y="54" font-size="10" fill="#fff" text-anchor="middle">ウェブサイト</text><rect x="420" y="40" width="84" height="20" rx="10" fill="#cfe9d6"/><text x="462" y="54" font-size="10" fill="#5f6673" text-anchor="middle">パンフレット類</text>
      <text x="512" y="54" font-size="10" fill="#5f6673" text-anchor="end">…</text>
      <path d="M14 86 H526" stroke="#e3e3e3"/>
      <rect x="14" y="96" width="164" height="84" rx="8" fill="#fff" stroke="#c9ced8"/><text x="24" y="116" font-size="12" font-weight="700" fill="#3d7a4f">本</text><text x="24" y="136" font-size="10" fill="#333">ISBN</text><rect x="24" y="144" width="74" height="22" rx="3" fill="#fff" stroke="#aaa"/><text x="30" y="159" font-size="10" fill="#999">ここに貼る</text><rect x="102" y="144" width="38" height="22" rx="3" fill="#f4f6f8" stroke="#888"/><text x="121" y="159" font-size="10" fill="#222" text-anchor="middle">照合</text><rect x="100" y="142" width="42" height="26" rx="5" fill="none" stroke="#d93025" stroke-width="2.5"/><rect x="144" y="144" width="26" height="22" rx="3" fill="#f4f6f8" stroke="#888"/><text x="157" y="160" font-size="11" text-anchor="middle">📷</text><rect x="141" y="141" width="32" height="28" rx="5" fill="none" stroke="#d93025" stroke-width="2.5"/><text x="157" y="134" font-size="9" font-weight="700" fill="#d93025" text-anchor="middle">本はここ</text><rect x="188" y="96" width="164" height="84" rx="8" fill="#fff" stroke="#c9ced8"/><text x="198" y="116" font-size="12" font-weight="700" fill="#3d7a4f">記事 →「ウェブサイト」</text><text x="198" y="136" font-size="10" fill="#333">URL</text><rect x="198" y="144" width="104" height="22" rx="3" fill="#fff" stroke="#aaa"/><text x="204" y="159" font-size="10" fill="#999">ここに貼る</text><rect x="306" y="144" width="38" height="22" rx="3" fill="#f4f6f8" stroke="#888"/><text x="325" y="159" font-size="10" fill="#222" text-anchor="middle">解析</text><rect x="304" y="142" width="42" height="26" rx="5" fill="none" stroke="#d93025" stroke-width="2.5"/><rect x="362" y="96" width="164" height="84" rx="8" fill="#fff" stroke="#c9ced8"/><text x="372" y="116" font-size="12" font-weight="700" fill="#3d7a4f">動画</text><text x="372" y="136" font-size="10" fill="#333">URL</text><rect x="372" y="144" width="104" height="22" rx="3" fill="#fff" stroke="#aaa"/><text x="378" y="159" font-size="10" fill="#999">ここに貼る</text><rect x="480" y="144" width="38" height="22" rx="3" fill="#f4f6f8" stroke="#888"/><text x="499" y="159" font-size="10" fill="#222" text-anchor="middle">照合</text><rect x="478" y="142" width="42" height="26" rx="5" fill="none" stroke="#d93025" stroke-width="2.5"/>
      <text x="270" y="198" font-size="11" fill="#222" text-anchor="middle"><tspan font-weight="700" fill="#d93025">②</tspan> 本は 📷 でバーコード、記事・動画は URL を貼って「解析」「照合」→ 自動で入る</text>
      <path d="M14 210 H526" stroke="#e3e3e3"/>
      <circle cx="28" cy="238" r="11" fill="#d93025"/><text x="28" y="243" font-size="13" font-weight="700" fill="#fff" text-anchor="middle">3</text><text x="46" y="234" font-size="11" font-weight="700" fill="#222">いちばん下の個人タグ</text>
      <rect x="180" y="222" width="140" height="32" rx="3" fill="#fff" stroke="#aaa"/>
      <text x="188" y="235" font-size="9" fill="#999">選択なし</text>
      <rect x="182" y="238" width="136" height="14" fill="#cfd4dc"/><text x="188" y="249" font-size="10" fill="#222">${REF_TAG}</text>
      <rect x="178" y="235" width="144" height="20" rx="4" fill="none" stroke="#d93025" stroke-width="2.5"/>
      <path d="M332 238 L372 238" stroke="#d93025" stroke-width="2.5"/><path d="M370 231 L380 238 L370 245 Z" fill="#d93025"/>
      <circle cx="400" cy="238" r="11" fill="#d93025"/><text x="400" y="243" font-size="13" font-weight="700" fill="#fff" text-anchor="middle">4</text>
      <rect x="420" y="226" width="64" height="26" rx="4" fill="#1a73e8"/><text x="452" y="243" font-size="12" fill="#fff" text-anchor="middle">登録</text>
    </svg>
    <figcaption><b>どの種類も同じ4ステップ</b>：① 上の種類のボタン → ② 本は 📷 でバーコードを読む／記事・動画は URL を貼って「解析」「照合」（赤い＊が埋まったか見る）→ ③ いちばん下の個人タグで「<b>${REF_TAG}</b>」を選ぶ（グループタグ・カスタムタグは選ばない）→ ④「<b>登録</b>」</figcaption>
  </figure>`;
// 出力して貼る（11/7 先生：RefNavi を「楽だ」と早く感じる場面。第3回で出力→アプリに貼る、Quest 3 で貼り直す、RQシートに自動で載る）
// 書式は1学期 GCIS 第2回のスライド（「著者名（年）.『書名』. 出版社.」など、著者と年が先に来る形）にいちばん近い RefNavi の出力形式。
// RefNavi の形式：MLA 第9版・APA・ハーバード式・Bibtex・SIST02・学びの技（初期設定）・Refnavi。仮に APA（11/7。先生が RefNavi で出力を確かめたら確定）
export const REF_FORMAT = "APA";
const fmtName = () => REF_FORMAT ? `「${REF_FORMAT}」` : "先生が指定した書式";
// 出力の図（「整理する」→「リスト」→「表示中を全て選択」→「出力」→書式→コピー）。11/9 先生の画面写真に合わせた（出力のあとは RefNavi_manual_52 の名前どおり・図式）
const refOutHowto = () => `
  <figure class="urlhowto libhowto" aria-label="RefNaviの出力：整理するのリストで、表示中を全て選択し、出力で書式を選んでコピー">
    <svg viewBox="0 0 540 230" role="img" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="250" height="228" rx="10" fill="#fff" stroke="#c9ced8"/>
      <text x="20" y="28" font-size="12" font-weight="700" fill="#222">整理する ▾</text>
      <rect x="14" y="13" width="80" height="22" rx="5" fill="none" stroke="#d93025" stroke-width="3"/>
      <rect x="104" y="12" width="70" height="44" rx="4" fill="#fff" stroke="#bbb"/>
      <text x="114" y="30" font-size="11" font-weight="700" fill="#222">リスト</text><text x="114" y="48" font-size="11" fill="#999">タグ管理</text>
      <rect x="108" y="16" width="62" height="20" rx="4" fill="none" stroke="#d93025" stroke-width="3"/>
      <circle cx="190" cy="27" r="11" fill="#d93025"/><text x="186" y="31" font-size="12" font-weight="700" fill="#fff">1</text>
      <text x="16" y="78" font-size="11" font-weight="700" fill="#333">あなたの情報の一覧</text>
      <rect x="16" y="86" width="220" height="16" fill="#f4f6f8"/><text x="22" y="98" font-size="10" fill="#555">『絵本の力』</text><rect x="214" y="89" width="10" height="10" rx="2" fill="#1a73e8"/>
      <rect x="16" y="104" width="220" height="16" fill="#f4f6f8"/><text x="22" y="116" font-size="10" fill="#555">（動画）…</text><rect x="214" y="107" width="10" height="10" rx="2" fill="#1a73e8"/>
      <rect x="16" y="122" width="220" height="16" fill="#f4f6f8"/><text x="22" y="134" font-size="10" fill="#555">（記事）…</text><rect x="214" y="125" width="10" height="10" rx="2" fill="#1a73e8"/>
      <rect x="16" y="146" width="30" height="16" rx="2" fill="#fff" stroke="#999"/><text x="20" y="158" font-size="10" fill="#333">10 ▾</text>
      <text x="52" y="158" font-size="9" fill="#5f6673">← 10件より多ければ大きく</text>
      <rect x="20" y="172" width="104" height="22" rx="4" fill="#6c757d"/><text x="72" y="187" font-size="10" fill="#fff" text-anchor="middle">表示中を全て選択</text>
      <rect x="16" y="168" width="112" height="30" rx="6" fill="none" stroke="#d93025" stroke-width="3"/>
      <circle cx="142" cy="183" r="11" fill="#d93025"/><text x="138" y="187" font-size="12" font-weight="700" fill="#fff">2</text>
      <rect x="20" y="202" width="44" height="22" rx="4" fill="#198754"/><text x="42" y="217" font-size="11" fill="#fff" text-anchor="middle">出力</text>
      <rect x="16" y="198" width="52" height="30" rx="6" fill="none" stroke="#d93025" stroke-width="3"/>
      <circle cx="82" cy="213" r="11" fill="#d93025"/><text x="78" y="217" font-size="12" font-weight="700" fill="#fff">3</text>
      <rect x="164" y="202" width="40" height="22" rx="4" fill="#0d6efd"/><text x="184" y="217" font-size="10" fill="#fff" text-anchor="middle">タグ</text>
      <path d="M258 115 L278 115" stroke="#d93025" stroke-width="3"/><path d="M276 107 L288 115 L276 123 Z" fill="#d93025"/>
      <rect x="289" y="1" width="250" height="228" rx="10" fill="#fff" stroke="#c9ced8"/>
      <text x="304" y="28" font-size="13" font-weight="700" fill="#222">出力</text>
      <path d="M300 40 H528" stroke="#e3e3e3"/>
      <text x="304" y="66" font-size="11" fill="#333">出力形式</text>
      <rect x="304" y="74" width="150" height="26" rx="3" fill="#fff" stroke="#aaa"/><text x="312" y="92" font-size="11" fill="#333">${REF_FORMAT || "先生が指定した書式"} ▾</text>
      <rect x="300" y="70" width="158" height="34" rx="6" fill="none" stroke="#d93025" stroke-width="3"/>
      <circle cx="476" cy="87" r="12" fill="#d93025"/><text x="471" y="92" font-size="14" font-weight="700" fill="#fff">4</text>
      <rect x="304" y="128" width="150" height="28" rx="4" fill="#388e3c"/><text x="379" y="147" font-size="11" fill="#fff" text-anchor="middle">クリップボードにコピー</text>
      <rect x="300" y="124" width="158" height="36" rx="6" fill="none" stroke="#d93025" stroke-width="3"/>
      <circle cx="476" cy="142" r="12" fill="#d93025"/><text x="471" y="147" font-size="14" font-weight="700" fill="#fff">5</text>
      <text x="304" y="186" font-size="11" fill="#5f6673">→ 下の「参考文献リスト」に貼る</text>
    </svg>
    <figcaption>① 「<b>整理する</b>」→「<b>リスト</b>」→ ② 「<b>表示中を全て選択</b>」→ ③ 「<b>出力</b>」→ ④ 出力形式で<b>${fmtName()}</b>を選ぶ → ⑤ クリップボードにコピーして、下の欄に貼る</figcaption>
  </figure>`;
// 班の進み具合（自分で押す）：refLogin（準備）・refHon・refKiji・refDouga（種類ごとのカード）・refHan（班の全員）。教員画面にも出る
// 種類ごとのカード（11/10）：押すボタン・貼るもの・自分の文献（コピー）・その種類のコツ・「できた」ボタンを1か所に。本→記事→動画の順（本は自動で入る気持ちよさが大きいので最初）
const REF_KINDS = [
  { key: "refHon", kind: "本", tab: "本", paste: "<b>📷</b> でバーコード", btn: "照合", tip: "" }, // 11/10 先生：コピーより📷を先に（A案）。ISBN のコピーは「読み取れないときは」の中
  { key: "refKiji", kind: "記事", tab: "ウェブサイト", paste: "貼る：<b>URL</b>", btn: "解析", tip: "赤い＊の欄が空いたら、記事の見出しやサイト名（新聞社など）を手で入れよう" },
  { key: "refDouga", kind: "動画", tab: "動画", paste: "貼る：<b>URL</b>", btn: "照合", tip: "自動で入るのは YouTube だけ。ほかの動画は、配信者と動画タイトルを手で入れよう" }
];
function refCards(c) {
  const L2 = c.prev("L02"), R2 = c.prev("R02"), { esc, d } = c;
  const row = (label, copy, open) => `
      <li class="refrow"><span class="reftext">${esc(label)}</span>
        <button type="button" class="btn small ghost" data-copytext="${esc(copy)}">コピー</button>${open ? ` <a class="btn small ghost openurl" href="${esc(open)}" target="_blank" rel="noopener">開く ↗</a>` : ""}</li>`;
  const items = {
    refHon: booksOf(R2).map(b => b.isbn ? `
      <li class="refrow"><span class="reftext">${esc(b.title)}</span>
        <span class="isbnfall"><span class="hint">読み取れないときは</span> ISBN ${esc(b.isbn)} <button type="button" class="btn small ghost" data-copytext="${esc(b.isbn)}">コピー</button> <span class="hint">→「ISBN」の欄に貼って「照合」</span></span></li>`
      : row(`${b.title}（ISBNなし：題名で探して手で入れる）`, b.title, "")),
    refKiji: listOf(L2, "kiji").map(u => row(u, u, safeUrl(u))),
    refDouga: listOf(R2, "douga").map(u => row(u, u, safeUrl(u)))
  };
  const empty = { refHon: `${quest(2)} で読んだ本はありません`, refKiji: "第2回に読んだ記事のリンクがありません。ホームの「第2回」の画面3から書き足そう", refDouga: `${quest(2)} で見た動画はありません` };
  return REF_KINDS.map(k => `
    <div class="regcard ${d[k.key] ? "done" : ""}">
      <div class="regcard-head"><span class="regkind">${k.kind}</span>
        <span class="regsteps"><span>押す：<b>${k.tab}</b></span><span>${k.paste}</span><span><b>${k.btn}</b> → タグ → 登録</span></span></div>
      ${k.key === "refHon" && items.refHon.length ? `<ol class="camsteps"><li><b>本を手に持つ</b>（裏表紙の「978」から始まるバーコード）</li><li>「本」の欄の <b>📷</b> を押して、<b>画面のカメラにバーコードをかざす</b>。題名や著者が一気に入ります</li></ol>` : ""}
      ${items[k.key].length ? `<ul class="reflist">${items[k.key].join("")}</ul>` : `<p class="hint">${empty[k.key]}</p>`}
      ${k.tip ? `<p class="hint">💡 ${k.tip}</p>` : ""}
      ${items[k.key].length ? `<button type="button" class="choice-btn ${d[k.key] ? "on" : ""}" data-refchk="${k.key}">${d[k.key] ? "✓ " : ""}${k.kind}を登録できた</button>` : ""}
    </div>`).join("");
}
// グループコード：生徒には自分のクラスの分だけ。先生が生徒画面を見ているときは全クラス分（11/9）
function groupCodeLine(c) {
  const esc = c.esc, g = refnaviGroupOf(c.ki, c.cls);
  const mine = g ? `<p class="refrow"><span>あなたのグループコード：<b>${esc(g)}</b></span> <button type="button" class="btn small ghost" data-copytext="${esc(g)}">コピー</button></p>` : "";
  if (!c.asTeacher) return mine || `<p class="hint">グループコードは、先生が伝えます。</p>`;
  const all = Object.entries(REFNAVI_GROUPS).flatMap(([ki, gs]) => Object.entries(gs).map(([cls, code]) => `${esc(ki)}期 ${esc(cls)}組 <b>${esc(code)}</b>`));
  return mine + `<p class="hint">（先生の画面だけに出ています）生徒には、自分のクラスのコードが「あなたのグループコード」として出ます：${all.join("／") || "まだ入っていません"}</p>`;
}
// 参考文献リストを出す（第3回 画面3・11/9 先生：登録とは別の画面に。「表示中を全て選択」→「出力」）
function refOutStep(c) {
  return `
      <p class="lead">登録した文献から、<b>参考文献リスト</b>を作ってみよう。1学期に聞いた参考文献の書き方に、<b>ボタン1つでそろいます</b>。</p>
      ${refOutHowto()}
      <ul class="todo">
        <li>一覧の下の「<b>10</b>」は、1ページに出す数。登録が10件より多い人は、数を大きくしてから「表示中を全て選択」</li>
      </ul>
      ${c.field("sanko", "参考文献リスト（RefNavi から貼る）", { rows: 6, hint: `RefNavi で出力して、そのまま貼ろう。${quest(3)}で論文を足したら貼り直します。RQ をまとめるときに、ここから自動で使います` })}`;
}
function refStep(c) {
  const { d } = c;
  const chk = (k, label) => `<button type="button" class="choice-btn ${d[k] ? "on" : ""}" data-refchk="${k}">${d[k] ? "✓ " : ""}${label}</button>`;
  return `
      <p class="lead">班で協力して、<b>${quest(2)} の本・動画と、第2回の記事を RefNavi に登録</b>しよう。できた人は、となりの人を手伝おう。</p>
      <div class="why">
        <b>なぜ登録するの？</b>
        <ul>
          <li><b>人は忘れる</b>から。「あれ、どこで読んだんだっけ？」は、だれにでもよくあること。その場で記録しておけば、いつでも元の資料に戻れる</li>
          <li>友だちや先生に、何を読んだかを<b>正確に伝えられる</b></li>
          <li>参考文献リストが、<b>ボタン1つでできる</b>（次の画面でやってみよう）</li>
        </ul>
      </div>
      <details class="fold regsetup" ${d.refLogin ? "" : "open"}>
        <summary>${d.refLogin ? "✓ " : ""}はじめの準備（初めての1回だけ）：ログイン → グループコード → 個人タグ</summary>
        <h3>① RefNavi を開いて、ログイン</h3>
        ${snapFirst("RefNavi")}
        <div class="searchbtns"><button type="button" class="btn" data-refnavi>RefNavi を右半分に開く ↗</button></div>
        ${REF_LOGIN_HOWTO}
        <h3>② グループコードを入れる</h3>
        ${groupCodeLine(c)}
        ${REF_FIRST_HOWTO}
        <h3>③ 個人タグ「${REF_TAG}」を作る</h3>
        <p class="refrow"><span>タグ名：<b>${REF_TAG}</b></span> <button type="button" class="btn small ghost" data-copytext="${REF_TAG}">コピー</button></p>
        ${REF_TAG_HOWTO}
        <div class="choice small">${chk("refLogin", "準備ができた")}</div>
      </details>
      ${d.refLogin ? `<div class="searchbtns"><button type="button" class="btn ghost" data-refnavi>RefNavi を右半分に開く ↗</button></div>` : ""}
      <h3 id="regstart">1件ずつ登録しよう</h3>
      ${REF_ADD_HOWTO}
      ${refCards(c)}
      <div class="choice small">${chk("refHan", "班の全員が登録できた")}</div>`;
}


const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
const papers = c => ["p1Url", "p2Url"].map((k, j) => ({ no: j ? "②" : "①", url: c.v(k) })).filter(p => p.url);
// 論文①（開く ↗ と サイト名）
const paperLink = (p, esc) => safeUrl(p.url) ? `<a href="${esc(safeUrl(p.url))}" target="_blank" rel="noopener">開く ↗</a> <span class="hint">${esc(hostOf(p.url))}</span>` : esc(p.url);

export const L03 = {
  id: "L03",
  no: 3,
  title: "先行研究に出会う",
  mapAt: 2, // 文献
  after: "R02", // Quest 2 を出すと開く
  uses: ["L01", "L02", "R02"],
  steps: [
    { title: "班で紹介", mins: 9 },
    { title: "RefNaviに登録する", mins: 10 },
    { title: "参考文献リストを出す", mins: 3 },
    { title: "研究を探して、読んでみる論文を2本決める", mins: 15 },
    { title: "提出して、Quest 3 へ", mins: 2 }
  ],
  geminiKey: "gcis_gemini_L03", // 第3回の新しいチャット
  needChat: true, // 画面4（AIで検索語）は、この回のチャットのURLを貼るまで次へ進めない（11/9 先生：まだ3回目なので必須に）

  render(i, c) {
    const { field, promptBox, esc, d } = c;
    if (i === 0) return `
      <p class="lead"><b>先生の合図で、班の時間です。</b>${quest(2)}で見たもの・読んだものを紹介しよう。</p>
      ${myRecap(c)}
      <div class="share">
        <b>話す人（1分くらい）</b>
        <ol class="todo">
          <li>「これを見ました（読みました）」と見せる。本は手に持って、動画は題名の画面で</li>
          <li><b>分かったこと</b>（へえ、と思ったこと）</li>
          <li><b>気になったこと</b>。うまく言えなくてもOK</li>
        </ol>
        <p><b>みんなで、軽くおしゃべり</b>（質問も「私も！」も歓迎）</p>
        <p class="hint">おしゃべりが落ち着いたら、話した人が「ありがとう！じゃあ次、〇〇さんお願いします」と次の人を指名します。</p>
      </div>
      ${field("hanMemo", "班で出たこと・友だちの紹介で気になったこと（なくてもOK）", { rows: 2 })}`;
    if (i === 1) return refStep(c);
    if (i === 2) return refOutStep(c);
    if (i === 3) return `
      <p>記事や本・動画で、同じことに関心を持つ人がいました。その中には、<b>研究者</b>もいます。<br>研究では、どこまで分かっているんだろう？</p>
      <h3>① 検索語をAIに考えてもらう</h3>
      ${promptBox(promptWords(c), { first: true })}
      <h3>② 自分で探す</h3>
      ${searchTools(c)}
      <h3>③ 読んでみる論文を2本決める</h3>
      <p>たくさん探して、たくさん眺めてOK。その中から「<b>読んでみたい！</b>」と思える論文を2本決めよう。ぴったりでなくても大丈夫。読んでみると、次に探す言葉が見えてきます。</p>
      ${paperFields(c)}
      <p class="hint">決めたら、RefNavi にも登録しよう。上の種類のボタンで「<b>論文</b>」→「<b>DOI</b>」の欄に<b>DOI の番号</b>を貼って「<b>照合</b>」→ 個人タグ「<b>${REF_TAG}</b>」を選んで登録。DOIがない論文は「<b>論文</b>」で、論文のページを見ながら入れよう：執筆者名・論文タイトル・誌名・巻号・掲載頁・発行年（見つかるものは全部）。</p>
      ${doiCopyButtons(2)}
      ${REF_PAPER_HOWTO}`;
    // i === 4：提出（提出すると Quest 3 が出る。授業の残りの時間で Quest 3 を読みはじめる：11/7）
    const ps = papers(c);
    return `
      <div class="themecard">
        <div class="tc-row"><span>本か動画</span><b>${esc(pickText(c.prev("R02")) || "—")}</b></div>
        <div class="tc-row big"><span>論文</span><b>${ps.length ? ps.map(p => `論文${p.no}　${paperLink(p, esc)}`).join("<br>") : "—"}</b></div>
      </div>
      ${ps.length < 2 ? `<p class="note">論文が1本だけのときは、${quest(3)}の前にもう1本探してみよう（ホームから「見なおす」で書き足せます）。</p>` : ""}
      <div class="share"><b>次は ${quest(3)}：論文を読む（第4回 12/7 まで）</b><p>提出すると、ホームに「${quest(3)}」が出ます。<b>授業の残りの時間で、${quest(3)}を開いて論文①から読みはじめよう</b>。今日は途中まででOK。続きは授業の外で読み切ります。</p>
        <p>第4回は、ここまでのことから自分の問いを立てて、確かめる計画を作ります。</p></div>
      ${c.submitted ? `<p class="okmsg">提出済み ✓　あとから直しても自動で保存されます。</p>` : ""}`;
  },

  onInput(el, c) { handlePaperInput(el, c); },

  canNext(i, c) {
    if (i === 2) return !!c.v("sanko"); // 参考文献リストは必須（11/9 先生）
    if (i === 3) return !!c.v("p1Url"); // 2本が目標。見つからない生徒も先へ進める
    return true;
  },
  // 次へが押せないときに出す名前（「〜が書けたら、次へ進もう」）
  need(i, c) {
    if (i === 2 && !c.v("sanko")) return ["「参考文献リスト」"];
    return [];
  },

  onClick(t, c) {
    if (handleDoiCopy(t, c)) return true;
    const k = t.closest("[data-refchk]");
    if (k) {
      const key = k.dataset.refchk, on = !c.d[key];
      c.set(key, on ? 1 : ""); c.rerender();
      // 準備ができたら、準備は閉じて「1件ずつ登録しよう」へ（閉じた分だけ画面が縮むため）
      if (key === "refLogin" && on) c.app.querySelector("#regstart")?.scrollIntoView({ block: "start", behavior: "smooth" });
      return true;
    }
    const cp = t.closest("[data-copytext]");
    if (cp) {
      copyText(cp.dataset.copytext);
      const was = cp.textContent; cp.textContent = "コピーしました ✓";
      setTimeout(() => { cp.textContent = was; }, 1500);
      return true;
    }
    if (t.closest("[data-refnavi]")) {
      const W = screen.availWidth || 1366, H = screen.availHeight || 768;
      const w = window.open(REFNAVI_URL, "gcis_refnavi", `popup=yes,left=${Math.round(W / 2)},top=0,width=${Math.round(W / 2)},height=${H}`) || window.open(REFNAVI_URL, "_blank");
      try { w?.focus(); } catch { /* なし */ }
      return true;
    }
    return handleSearch(t, c);
  }
};
