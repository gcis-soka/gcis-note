// ステージ5／第3回（11/16）先行研究に出会う（A案：ニュース→本・動画→論文）
// 仕様：ナレッジの L03.md。論文は2本決める。長すぎないものを選んで全文を読む（授業で途中まで→残りは Quest 3）
// RefNavi への登録は授業で（URLを貼るだけ）。アプリは登録しないが、登録するもの（第2回の記事・Quest 2 の動画と本）を一覧で出す（11/5）
// data：hanMemo・refLogin・refDouga・refHon・refHan（RefNavi の進み具合）・kensaku・tried・p1Url・p2Url・p1Doi・p2Doi・sanko（RefNavi から貼った参考文献リスト）（読むのは Quest 3。授業中に始める：11/7）
// 論文は URL だけ（題名は RefNavi に入れる：11/7）。Geminiのチャットは AIの文の下の chatUrl で預かる（共有リンク欄は 11/7 廃止）
import { quest, listOf, booksOf, refnaviGroupOf, doiOf } from "./common.js";
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
// 初めて RefNavi に入るとき（RefNavi_manual_52：「児童・生徒」を選び、グループコードを入力して登録）。59期は今回が初めて（11/7）
const REF_FIRST_HOWTO = `
  <figure class="urlhowto libhowto" aria-label="初めてのとき：児童・生徒を選び、グループコードを入れて登録">
    <svg viewBox="0 0 540 150" role="img" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="250" height="148" rx="10" fill="#fff" stroke="#c9ced8"/>
      <text x="126" y="30" font-size="13" font-weight="700" fill="#222" text-anchor="middle">あなたは？</text>
      <rect x="26" y="50" width="90" height="40" rx="6" fill="#f4f6f8" stroke="#ddd"/><text x="71" y="75" font-size="12" fill="#999" text-anchor="middle">先生</text>
      <rect x="136" y="50" width="90" height="40" rx="6" fill="#f4f6f8" stroke="#bbb"/><text x="181" y="75" font-size="12" fill="#333" text-anchor="middle">児童・生徒</text>
      <rect x="132" y="46" width="98" height="48" rx="8" fill="none" stroke="#d93025" stroke-width="3"/>
      <circle cx="181" cy="116" r="12" fill="#d93025"/><text x="176" y="121" font-size="14" font-weight="700" fill="#fff">3</text>
      <path d="M258 75 L278 75" stroke="#d93025" stroke-width="3"/><path d="M276 67 L288 75 L276 83 Z" fill="#d93025"/>
      <rect x="289" y="1" width="250" height="148" rx="10" fill="#fff" stroke="#c9ced8"/>
      <text x="304" y="30" font-size="12" font-weight="700" fill="#333">グループコード</text>
      <rect x="304" y="40" width="150" height="28" rx="3" fill="#fff" stroke="#aaa"/><text x="312" y="59" font-size="11" fill="#999">ここに入れる</text>
      <rect x="300" y="36" width="158" height="36" rx="6" fill="none" stroke="#d93025" stroke-width="3"/>
      <circle cx="476" cy="54" r="12" fill="#d93025"/><text x="471" y="59" font-size="14" font-weight="700" fill="#fff">4</text>
      <rect x="304" y="90" width="80" height="30" rx="4" fill="#388e3c"/><text x="344" y="110" font-size="12" fill="#fff" text-anchor="middle">登録</text>
    </svg>
    <figcaption>初めてのときだけ：③ 「<b>児童・生徒</b>」を選ぶ → ④ <b>グループコード</b>を入れて登録（2回目からは、ログインするとすぐホームが出ます）</figcaption>
  </figure>`;
// 登録の図（ホームの「メディアの選択」→「ISBN コード／DOI コード／URL」欄→照合・解析）。
// RefNavi 操作マニュアル（RefNavi_manual_52, 2026/10）の名前どおり。並びは図式（実際の画面写真があれば描き直す）
const REF_ADD_HOWTO = `
  <figure class="urlhowto libhowto" aria-label="RefNaviの登録：メディアの選択で種類を選び、ISBNかURLを貼って照合・解析し、確かめて登録">
    <svg viewBox="0 0 540 222" role="img" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="250" height="220" rx="10" fill="#fff" stroke="#c9ced8"/>
      <text x="16" y="28" font-size="14" font-weight="700" fill="#222">ホーム</text>
      <path d="M12 40 H240" stroke="#e3e3e3"/>
      <text x="20" y="66" font-size="12" font-weight="700" fill="#333">メディアの選択</text>
      <rect x="20" y="80" width="64" height="40" rx="6" fill="#f4f6f8" stroke="#bbb"/><text x="52" y="105" font-size="12" fill="#333" text-anchor="middle">図書</text>
      <rect x="92" y="80" width="64" height="40" rx="6" fill="#f4f6f8" stroke="#bbb"/><text x="124" y="105" font-size="12" fill="#333" text-anchor="middle">動画</text>
      <rect x="164" y="80" width="64" height="40" rx="6" fill="#f4f6f8" stroke="#ddd"/><text x="196" y="105" font-size="12" fill="#999" text-anchor="middle">…</text>
      <rect x="16" y="76" width="144" height="48" rx="8" fill="none" stroke="#d93025" stroke-width="3"/>
      <circle cx="40" cy="146" r="12" fill="#d93025"/><text x="35" y="151" font-size="14" font-weight="700" fill="#fff">1</text>
      <text x="60" y="144" font-size="11" fill="#333">本は「図書」</text>
      <text x="60" y="160" font-size="11" fill="#333">動画は「動画」を選ぶ</text>
      <path d="M258 120 L278 120" stroke="#d93025" stroke-width="3"/><path d="M276 112 L288 120 L276 128 Z" fill="#d93025"/>
      <rect x="289" y="1" width="250" height="220" rx="10" fill="#fff" stroke="#c9ced8"/>
      <text x="304" y="28" font-size="14" font-weight="700" fill="#222">情報登録</text>
      <path d="M300 40 H528" stroke="#e3e3e3"/>
      <text x="304" y="62" font-size="11" fill="#333">ISBN コード／DOI コード／URL</text>
      <rect x="304" y="70" width="150" height="28" rx="3" fill="#fff" stroke="#aaa"/>
      <text x="312" y="89" font-size="11" fill="#999">ここに貼り付け</text>
      <rect x="460" y="70" width="64" height="28" rx="4" fill="#388e3c"/><text x="492" y="89" font-size="11" fill="#fff" text-anchor="middle">照合／解析</text>
      <rect x="300" y="66" width="228" height="36" rx="6" fill="none" stroke="#d93025" stroke-width="3"/>
      <circle cx="316" cy="124" r="12" fill="#d93025"/><text x="311" y="129" font-size="14" font-weight="700" fill="#fff">2</text>
      <text x="336" y="122" font-size="11" fill="#333">本＝ISBN →「照合」</text>
      <text x="336" y="138" font-size="11" fill="#333">動画＝URL →「解析」</text>
      <rect x="304" y="152" width="220" height="22" rx="3" fill="#f4f6f8"/><text x="312" y="167" font-size="11" fill="#555"><tspan fill="#d93025">*</tspan> 書名・著者などが自動で入る</text>
      <circle cx="316" cy="196" r="12" fill="#d93025"/><text x="311" y="201" font-size="14" font-weight="700" fill="#fff">3</text>
      <text x="336" y="200" font-size="11" fill="#333">確かめて、登録する</text>
    </svg>
    <figcaption>① ホームの「<b>メディアの選択</b>」で、本は「図書」、動画は「動画」→ ② 「<b>ISBN コード／DOI コード／URL</b>」の欄に貼って、本は「<b>照合</b>」、動画は「<b>解析</b>」→ ③ 赤い「＊」の欄が埋まっているか確かめて登録</figcaption>
  </figure>`;
// 出力して貼る（11/7 先生：RefNavi を「楽だ」と早く感じる場面。第3回で出力→アプリに貼る、Quest 3 で貼り直す、RQシートに自動で載る）
// 書式は1学期 GCIS 第2回のスライド（「著者名（年）.『書名』. 出版社.」など、著者と年が先に来る形）にいちばん近い RefNavi の出力形式。
// RefNavi の形式：MLA 第9版・APA・ハーバード式・Bibtex・SIST02・学びの技（初期設定）・Refnavi。仮に APA（11/7。先生が RefNavi で出力を確かめたら確定）
export const REF_FORMAT = "APA";
const fmtName = () => REF_FORMAT ? `「${REF_FORMAT}」` : "先生が指定した書式";
// 出力の図（「整理する」→「リスト」→チェック→「出力」→書式→クリップボードにコピー）。RefNavi_manual_52 の名前どおり、並びは図式
const refOutHowto = () => `
  <figure class="urlhowto libhowto" aria-label="RefNaviの出力：整理するのリストでチェックし、出力で書式を選んでコピー">
    <svg viewBox="0 0 540 190" role="img" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="250" height="188" rx="10" fill="#fff" stroke="#c9ced8"/>
      <text x="16" y="28" font-size="13" font-weight="700" fill="#222">整理する ＞ リスト</text>
      <path d="M12 40 H240" stroke="#e3e3e3"/>
      <rect x="20" y="54" width="14" height="14" rx="2" fill="#388e3c"/><text x="23" y="66" font-size="11" fill="#fff">✓</text><text x="42" y="66" font-size="11" fill="#333">『絵本の力』</text>
      <rect x="20" y="80" width="14" height="14" rx="2" fill="#388e3c"/><text x="23" y="92" font-size="11" fill="#fff">✓</text><text x="42" y="92" font-size="11" fill="#333">（動画）youtu.be/…</text>
      <rect x="20" y="106" width="14" height="14" rx="2" fill="#388e3c"/><text x="23" y="118" font-size="11" fill="#fff">✓</text><text x="42" y="118" font-size="11" fill="#333">（論文）…</text>
      <rect x="16" y="48" width="160" height="78" rx="6" fill="none" stroke="#d93025" stroke-width="3"/>
      <circle cx="196" cy="86" r="12" fill="#d93025"/><text x="191" y="91" font-size="14" font-weight="700" fill="#fff">1</text>
      <rect x="20" y="142" width="64" height="28" rx="4" fill="#388e3c"/><text x="52" y="161" font-size="12" fill="#fff" text-anchor="middle">出力</text>
      <rect x="16" y="138" width="72" height="36" rx="6" fill="none" stroke="#d93025" stroke-width="3"/>
      <circle cx="106" cy="156" r="12" fill="#d93025"/><text x="101" y="161" font-size="14" font-weight="700" fill="#fff">2</text>
      <path d="M258 95 L278 95" stroke="#d93025" stroke-width="3"/><path d="M276 87 L288 95 L276 103 Z" fill="#d93025"/>
      <rect x="289" y="1" width="250" height="188" rx="10" fill="#fff" stroke="#c9ced8"/>
      <text x="304" y="28" font-size="13" font-weight="700" fill="#222">出力</text>
      <path d="M300 40 H528" stroke="#e3e3e3"/>
      <text x="304" y="62" font-size="11" fill="#333">出力形式</text>
      <rect x="304" y="70" width="150" height="26" rx="3" fill="#fff" stroke="#aaa"/><text x="312" y="88" font-size="11" fill="#333">${REF_FORMAT || "先生が指定した書式"} ▾</text>
      <rect x="300" y="66" width="158" height="34" rx="6" fill="none" stroke="#d93025" stroke-width="3"/>
      <circle cx="476" cy="83" r="12" fill="#d93025"/><text x="471" y="88" font-size="14" font-weight="700" fill="#fff">3</text>
      <rect x="304" y="120" width="150" height="28" rx="4" fill="#388e3c"/><text x="379" y="139" font-size="11" fill="#fff" text-anchor="middle">クリップボードにコピー</text>
      <rect x="300" y="116" width="158" height="36" rx="6" fill="none" stroke="#d93025" stroke-width="3"/>
      <circle cx="476" cy="134" r="12" fill="#d93025"/><text x="471" y="139" font-size="14" font-weight="700" fill="#fff">4</text>
      <text x="304" y="172" font-size="11" fill="#5f6673">→ アプリの「参考文献リスト」に貼る</text>
    </svg>
    <figcaption>① 「<b>整理する</b>」の「<b>リスト</b>」で、登録した資料にチェック → ② 「<b>出力</b>」→ ③ 出力形式で<b>${fmtName()}</b>を選ぶ → ④ クリップボードにコピーして、下の欄に貼る</figcaption>
  </figure>`;
// 班の進み具合（自分で押す）。教員画面にも出る
const REF_CHECKS = [
  ["refLogin", "ログインできた"],
  ["refDouga", "動画を登録できた（見た人）"],
  ["refHon", "本を登録できた（読んだ人）"],
  ["refHan", "班の全員が登録できた"]
];
// RefNavi に登録するもの（Quest 2 の動画と本、第2回の記事）。1行ずつコピーできる
function refList(c) {
  const L2 = c.prev("L02"), R2 = c.prev("R02"), esc = c.esc;
  const row = (kind, label, copy, open) => `
    <li class="refrow"><span class="hint">${esc(kind)}</span> <span class="reftext">${esc(label)}</span>
      <button type="button" class="btn small ghost" data-copytext="${esc(copy)}">コピー</button>${open ? ` <a class="btn small ghost openurl" href="${esc(open)}" target="_blank" rel="noopener">開く ↗</a>` : ""}</li>`;
  const videos = listOf(R2, "douga").map(u => row("動画", u, u, safeUrl(u)));
  const books = booksOf(R2).map(b => b.isbn ? row("本", `${b.title}　ISBN ${b.isbn}`, b.isbn, "") : row("本", `${b.title}（ISBNなし）`, b.title, ""));
  const arts = listOf(L2, "kiji").map(u => row("記事", u, u, safeUrl(u)));
  if (!videos.length && !books.length && !arts.length) return `<p class="note">${quest(2)} に動画も本もありません。ホームの「${quest(2)}」から書き足そう。</p>`;
  return `
    ${videos.length || books.length ? `<ul class="reflist">${videos.join("")}${books.join("")}</ul>` : ""}
    ${arts.length ? `<p class="hint">時間があれば、第2回に読んだ記事も</p><ul class="reflist">${arts.join("")}</ul>` : ""}`;
}
function refStep(c) {
  const { d, esc } = c;
  return `
      <p class="lead">班で協力して、<b>${quest(2)} で見た動画・読んだ本を RefNavi に登録</b>しよう。</p>
      <div class="share">
        <b>班で進めよう</b>
        <ul>
          <li>みんなで同時に進める。1つできたら「できた！」と声をかけよう</li>
          <li>できた人は、となりの人の画面をのぞいて手伝おう</li>
        </ul>
      </div>
      <h3>① RefNavi を開いて、ログイン</h3>
      <div class="searchbtns"><button type="button" class="btn" data-refnavi>RefNavi を右半分に開く ↗</button></div>
      ${REF_LOGIN_HOWTO}
      ${REF_FIRST_HOWTO}
      ${(g => g ? `<p class="refrow"><span>あなたのグループコード：<b>${esc(g)}</b></span> <button type="button" class="btn small ghost" data-copytext="${esc(g)}">コピー</button></p>` : `<p class="hint">グループコードは、先生が伝えます。</p>`)(refnaviGroupOf(c.ki, c.cls))}
      <h3>② 登録するもの</h3>
      <p class="hint">「コピー」を押して、RefNavi に貼ろう。動画はURL、本はISBNで登録します。</p>
      ${refList(c)}
      <h3>③ RefNavi で登録する</h3>
      ${REF_ADD_HOWTO}
      <ul class="todo">
        <li><b>本を持ってきた人は、カメラのボタンで本のバーコードを読み取ってみよう</b>（裏表紙の「978」から始まる方）。題名や著者が一気に入ります。読み取れないときは、②の一覧の ISBN を「コピー」して貼れば大丈夫</li>
        <li>動画は YouTube のURLだけ登録できます</li>
      </ul>
      <h3>④ 参考文献リストを出してみよう</h3>
      <p>1学期に手で書いた参考文献の書式が、<b>ボタン1つでできます</b>。</p>
      ${refOutHowto()}
      ${c.field("sanko", "参考文献リスト（RefNavi から貼る）", { rows: 5, hint: `RefNavi で出力して、そのまま貼ろう。${quest(3)}で論文を足したら貼り直します。RQ をまとめるときに、ここから自動で使います` })}
      <h3>⑤ できたら押そう</h3>
      <div class="choice small">${REF_CHECKS.map(([k, label]) => `<button type="button" class="choice-btn ${d[k] ? "on" : ""}" data-refchk="${k}">${d[k] ? "✓ " : ""}${label}</button>`).join("")}</div>`;
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
    { title: "班で紹介", mins: 8 },
    { title: "RefNaviに登録する", mins: 10 },
    { title: "研究を探して、論文を2本決める", mins: 15 },
    { title: "提出して、Quest 3 へ", mins: 2 }
  ],
  geminiKey: "gcis_gemini_L03", // 第3回の新しいチャット

  render(i, c) {
    const { field, promptBox, esc, d } = c;
    if (i === 0) return `
      <p class="lead"><b>先生の合図で、班の時間です。</b>${quest(2)}で見たもの・読んだものを紹介しよう。</p>
      ${myRecap(c)}
      <div class="share">
        <b>話す人（1分くらい）</b>
        <ol class="todo">
          <li>何の動画（本）で、どこが心に残ったか。本を持ってきた人は見せながら</li>
          <li>うまく言えなくてもOK。「なんか気になった」もそのまま話そう</li>
        </ol>
        <p class="hint">話し終わったら、話した人が「ありがとう！じゃあ次、〇〇さん」と次の人を指名します。</p>
      </div>
      ${field("hanMemo", "班で出たこと・友だちの紹介で気になったこと（なくてもOK）", { rows: 2 })}`;
    if (i === 1) return refStep(c);
    if (i === 2) return `
      <p>記事や本・動画で、同じことに関心を持つ人がいました。その中には、<b>研究者</b>もいます。<br>研究では、どこまで分かっているんだろう？</p>
      <h3>① 検索語をAIに考えてもらう</h3>
      ${promptBox(promptWords(c), { first: true })}
      <h3>② 自分で探す</h3>
      ${searchTools(c)}
      <h3>③ 論文を2本決める</h3>
      ${paperFields(c)}
      <p class="hint">決めたら、RefNavi にも登録しよう。「メディアの選択」で「<b>論文</b>」→「<b>DOI</b>」の欄に<b>DOI の番号</b>を貼って「<b>照合</b>」。DOIがない論文は、URLで登録します。</p>
      ${doiCopyButtons(2)}`;
    // i === 3：提出（提出すると Quest 3 が出る。授業の残りの時間で Quest 3 を読みはじめる：11/7）
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
    if (i === 2) return !!c.v("p1Url"); // 2本が目標。見つからない生徒も先へ進める
    return true;
  },

  onClick(t, c) {
    if (handleDoiCopy(t, c)) return true;
    const k = t.closest("[data-refchk]");
    if (k) { c.set(k.dataset.refchk, c.d[k.dataset.refchk] ? "" : 1); c.rerender(); return true; }
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
