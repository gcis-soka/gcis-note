// 第2回（11/9）一歩を持ち寄り、いろんな人が関心を持っていることに気づく
// 仕様：ナレッジの L02.md「アプリ画面」／プロンプト：L02_PROMPTS（確定）
// data：did（やった／まだ）・yatta・mita・kanji・iikire・yarunara・tomo・geminiLink・q1〜q3

// 文末の句読点・空白を取る（プロンプトの文をつなぐため）
const tail = s => String(s || "").trim().replace(/[。．.、,，！!\s　]+$/u, "");
// 予想の書き出しの空欄（＿＿）が残っていたら取る（例：「なぜなら＿＿。」）
const cleanYosou = s => tail(String(s || "").replace(/[、。]?\s*なぜなら\s*＿＿[。]?/g, "").replace(/＿＿/g, ""));

const IIKIRE_CHIPS = [
  { label: "1回だけ", text: "1回だけなので、" },
  { label: "自分だけ", text: "自分だけなので、" },
  { label: "〜の場合は？", text: "|の場合は？" } // | の位置にカーソル
];
const Q_CHIPS = [
  { label: "なんで〜？", text: "なんで|？" },
  { label: "本当に〜？", text: "本当に|？" },
  { label: "〜な人でも同じ？", text: "|な人でも同じ？" },
  { label: "どのくらい〜？", text: "どのくらい|？" },
  { label: "研究では、〜はどこまで分かっている？", text: "研究では、|はどこまで分かっている？" }
];

const done = c => c.v("did") === "やった";
const notYet = c => c.v("did") === "まだ";

// ---------- プロンプト ----------
function prompt1(c) {
  const L1 = c.prev("L01");
  const setsu = tail(L1.setsu) || "（説）";
  let ippo;
  if (notYet(c)) {
    ippo = cleanYosou(L1.yosou)
      ? `一歩はまだやっていませんが、「${cleanYosou(L1.yosou)}」と予想しています。`
      : "一歩はまだやっていません。";
  } else {
    const result = [c.v("mita"), c.v("kanji")].map(tail).filter(Boolean).join("。");
    ippo = `一歩として、${tail(c.v("yatta"))}。結果は、${result}。`;
  }
  return `私は高校1年生です。「${setsu}」という説が気になっています。${ippo}` +
    "この説と同じことに注目している人や、取り組んでいる人が分かる、日本語で読めるニュースや、国・国際機関・団体の調査や報告を、実際に検索して5つ見つけてください。" +
    "私が想像していなかった場面や分野のものも入れてください。" +
    "列は「媒体｜日付｜見出し｜だれが何をしているか（30文字以内）｜リンク」の表にしてください。" +
    "無料で読めるものを優先してください。表のあとには何も書かないでください。";
}
const PROMPT2 = "ありがとうございます。今度は、この説とはまったく別の分野や場面で、同じしくみに注目している人や、似たことで困っている人が分かる記事を5つ、同じ表で出してください。表のあとには何も書かないでください。";

// 第1回の内容（説・一歩・予想）を上に出す
function recapL01(c) {
  const L1 = c.prev("L01"), esc = c.esc;
  return `
    <div class="recap">
      <div class="tc-row"><span>第1回で「えっ、本当？」と思った説</span><b>${esc(L1.setsu || "—")}</b></div>
      <div class="tc-row"><span>やると決めた一歩</span><b>${esc(L1.ippo || "—")}</b></div>
      <div class="tc-row"><span>予想</span><b>${esc(L1.yosou || "—")}</b></div>
    </div>`;
}

function step0(c) {
  const { field } = c;
  const choice = `
    <p><b>一歩はやってみた？</b></p>
    <div class="choice">
      <button type="button" class="choice-btn ${done(c) ? "on" : ""}" data-did="やった">やった</button>
      <button type="button" class="choice-btn ${notYet(c) ? "on" : ""}" data-did="まだ">まだ（できなかった）</button>
    </div>`;
  let body = "";
  if (done(c)) body = `
    ${field("yatta", "やったこと", { rows: 2, placeholder: "例：無音のときと、カフェの雑音を流したときで、15分ずつ計算問題を解いた" })}
    ${field("mita", "見たこと・数字（なくてもOK）", { rows: 2, placeholder: "例：無音は12問、雑音ありは15問。雑音ありの方が時計を見る回数が少なかった" })}
    ${field("kanji", "感じたこと（予想と違った・意外だった）", { rows: 2, placeholder: "例：予想どおりだったけど、歌詞のある曲だと逆に気が散った" })}
    ${field("iikire", "この一歩だけでは言い切れないこと（1行）", {
      type: "text", placeholder: "例：1回だけなので、毎日そうなるかは分からない",
      hint: "書き出しを押すと入ります", chips: IIKIRE_CHIPS })}`;
  if (notYet(c)) body = `
    ${field("yarunara", "やるとしたら、何をする？（1行）", { type: "text", placeholder: "例：週末に、無音と雑音で15分ずつ問題を解いて比べる" })}
    <p class="note">大丈夫。班では「説・予想・やるとしたら」を話そう。</p>`;
  return recapL01(c) + choice + body;
}

function myStory(c) {
  const L1 = c.prev("L01"), esc = c.esc;
  const result = done(c)
    ? [c.v("yatta"), c.v("mita"), c.v("kanji")].filter(Boolean).join(" ／ ")
    : `まだ。やるとしたら：${c.v("yarunara") || "—"}`;
  return `
    <div class="themecard">
      <div class="tc-row big"><span>説</span><b>${esc(L1.setsu || "—")}</b></div>
      <div class="tc-row"><span>予想</span><b>${esc(L1.yosou || "—")}</b></div>
      <div class="tc-row big"><span>結果</span><b>${esc(result || "—")}</b></div>
    </div>`;
}

export const L02 = {
  id: "L02",
  no: 2,
  title: "一歩を持ち寄り、いろんな人が関心を持っていることに気づく",
  mapAt: 1, // 一歩
  after: "L01", // L01 を提出すると開く
  uses: ["L01"], // 画面に出すために読む回
  steps: [
    { title: "やってきたこと", mins: 5 },
    { title: "班で報告", mins: 10 },
    { title: "AIで、同じことに関心を持つ人を探す", mins: 20 },
    { title: "気になったこと", mins: 8 },
    { title: "提出", mins: 2 }
  ],
  geminiKey: "gcis_gemini_L02", // 第1回とは別の、新しいチャット

  render(i, c) {
    const { field, promptBox, chips, esc, d } = c;
    if (i === 0) return step0(c);
    if (i === 1) return `
      <p class="lead"><b>先生の合図で、班の時間です。</b>合図まではこの画面で待とう。</p>
      ${myStory(c)}
      <div class="share">
        <b>話す人（1人1分）</b><p>この画面を見せながら「説・予想・結果」を話そう。</p>
        <b>聞く人</b><p>1人1つ、「〇〇なところが面白い」か「本当に〜？」を言おう。</p>
      </div>
      ${field("tomo", "友だちに言われたこと（なくてもOK）", { rows: 2, placeholder: "例：「部活のあとでも同じになる？」と聞かれた" })}`;
    if (i === 2) return `
      <p>あなたの説と<b>同じことに関心を持っている人</b>が、世の中にいるか探してみよう。</p>
      ${promptBox(prompt1(c), { first: true })}
      <p>表が出たら、続けて下の文を<b>同じチャットに</b>送ろう。</p>
      ${promptBox(PROMPT2)}
      <ol class="todo">
        <li>出てきた見出しを眺めて、いちばん「へぇ」と思った1つを読もう</li>
        <li><b>リンクを開いて、見出しと中身が合っているか見る</b>（AIは、ない記事を作ってしまうことがあります）</li>
        <li><b>誰が出したか</b>（国・新聞・企業・個人）を見る</li>
      </ol>
      <p class="hint">合う記事が見つからないときは、まだ誰も調べていないことかもしれません。それも発見です。</p>
      ${field("geminiLink", "Geminiのチャットのリンク（なくてもOK）", { type: "url", placeholder: "https://…", hint: "次回、記事を開き直すのに使います。Geminiの「共有」→「リンクをコピー」" })}`;
    if (i === 3) return `
      <p>読んだ記事や、ここまでの一歩から、<b>気になったことを「？」で終わる形で</b>書こう（1つからでOK）。</p>
      <div class="field"><span class="hint">書き出しを押すと、空いている欄に入ります</span>${chips(Q_CHIPS, "q1,q2,q3")}</div>
      ${field("q1", "気になったこと ①", { type: "text", qmark: true })}
      ${field("q2", "気になったこと ②", { type: "text", qmark: true })}
      ${field("q3", "気になったこと ③", { type: "text", qmark: true })}
      <p class="hint">読み終わらなかったら、次回までに読んで書き足そう。提出したあとも直せます。</p>`;
    // i === 4：提出
    const qs = ["q1", "q2", "q3"].map(c.v).filter(Boolean);
    return `
      ${myStory(c)}
      <div class="themecard" style="margin-top:12px">
        ${done(c) ? `<div class="tc-row"><span>この一歩だけでは言い切れないこと</span><b>${esc(d.iikire || "—")}</b></div>` : ""}
        <div class="tc-row"><span>友だちに言われたこと</span><b>${esc(d.tomo || "—")}</b></div>
        <div class="tc-row big"><span>気になったこと</span><b>${qs.length ? `<ul class="qs">${qs.map(q => `<li>${esc(q)}</li>`).join("")}</ul>` : "—"}</b></div>
      </div>
      <div class="share"><b>次回は</b><p>記事に出てきた研究を探し、まだ分かっていないことを見つけます。</p></div>
      ${c.submitted ? `<p class="okmsg">提出済み ✓　あとから直しても自動で保存されます。</p>` : ""}`;
  },

  canNext(i, c) {
    switch (i) {
      case 0: return done(c) ? !!(c.v("yatta") && c.v("kanji")) : notYet(c) ? !!c.v("yarunara") : false;
      case 3: return ["q1", "q2", "q3"].some(k => c.v(k));
      default: return true;
    }
  },

  onClick(t, c) {
    const b = t.closest("[data-did]");
    if (b) { c.set("did", b.dataset.did); c.rerender(); return true; }
    return false;
  }
};
