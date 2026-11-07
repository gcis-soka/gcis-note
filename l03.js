// ステージ5／第3回（11/16）先行研究に出会う（A案：ニュース→本・動画→論文）
// 仕様：ナレッジの L03.md。論文は2本決める。長すぎないものを選んで全文を読む（授業で途中まで→残りは Quest 3）
// RefNavi への登録は授業で（URLを貼るだけ）。アプリは登録しないが、登録するもの（第2回の記事・Quest 2 の動画と本）を一覧で出す（11/5）
// data：hanMemo・refLogin・refDouga・refHon・refHan（RefNavi の進み具合）・kensaku・tried・p1Url・p2Url・p1Doi・p2Doi（読むのは Quest 3。授業中に始める：11/7）
// 論文は URL だけ（題名は RefNavi に入れる：11/7）。Geminiのチャットは AIの文の下の chatUrl で預かる（共有リンク欄は 11/7 廃止）
import { quest, listOf, booksOf, refnaviGroupOf } from "./common.js";
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
// 論文①②のURL欄（右に「この論文を開く」）と DOI 欄（RefNavi は論文を DOI で登録する：RefNavi_manual_52。11/7）
export function paperFields(c) {
  return ["1", "2"].map(n => `
      <div class="paperbox">
        <div class="urlrow">
          ${c.field(`p${n}Url`, `論文${n === "1" ? "①" : "②"}のURL`, { type: "url", placeholder: "https://…", hint: n === "1" ? "論文のページのURLをコピーして貼ろう" : "" })}
          <a class="btn small ghost openurl" data-open-url="p${n}Url" target="_blank" rel="noopener" hidden>この論文を開く ↗</a>
        </div>
        ${c.field(`p${n}Doi`, `論文${n === "1" ? "①" : "②"}のDOI`, { type: "text", placeholder: "例：10.xxxxx/xxxxx", hint: n === "1" ? "論文のページにある「10.」から始まる番号（「https://doi.org/」のあとの部分）。ない論文は空でOK" : "" })}
      </div>`).join("");
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
        <li>ISBNがない本は、カメラのボタンで<b>持ってきた本のバーコード</b>を読み取れます（裏表紙の「978」から始まる方）</li>
        <li>動画は YouTube のURLだけ登録できます</li>
      </ul>
      <h3>④ できたら押そう</h3>
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
    { title: "RefNaviに登録する", mins: 8 },
    { title: "研究を探して、論文を2本決める", mins: 17 },
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
      <p class="hint">決めたら、RefNavi にも登録しよう。ホームの「メディアの選択」で論文を選び、「ISBN コード／DOI コード／URL」の欄に<b>DOI</b>を貼ります。DOIがない論文は、URLで登録します。</p>`;
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

  canNext(i, c) {
    if (i === 2) return !!c.v("p1Url"); // 2本が目標。見つからない生徒も先へ進める
    return true;
  },

  onClick(t, c) {
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
