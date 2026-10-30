// ステージ3／第2回（11/9）同じことに関心を持つ人を探す
// 仕様：ナレッジの L02.md「アプリ画面」／プロンプト：L02_PROMPTS（確定）
// 結果の記録は R01（Quest 1 の結果）。ここでは R01 を読んでプロンプトに入れる
// data：tomo・geminiLink・q1〜q3
import { quest } from "./common.js";
const MISSION = quest(1);

// 文末の句読点・空白を取る（プロンプトの文をつなぐため）
const tail = s => String(s || "").trim().replace(/[。．.、,，！!\s　]+$/u, "");
// 予想の書き出しの空欄（＿＿）が残っていたら取る（例：「なぜなら＿＿。」）
const cleanYosou = s => tail(String(s || "").replace(/[、。]?\s*なぜなら\s*＿＿[。]?/g, "").replace(/＿＿/g, ""));

const Q_CHIPS = [
  { label: "なんで〜？", text: "なんで|？" },
  { label: "本当に〜？", text: "本当に|？" },
  { label: "〜な人でも同じ？", text: "|な人でも同じ？" },
  { label: "どのくらい〜？", text: "どのくらい|？" },
  { label: "研究では、〜はどこまで分かっている？", text: "研究では、|はどこまで分かっている？" }
];

const res = c => c.prev("R01");
const done = c => res(c).did === "やった";

// ---------- プロンプト ----------
function prompt1(c) {
  const L1 = c.prev("L01"), R = res(c);
  const setsu = tail(L1.setsu) || "（説）";
  let ippo;
  if (done(c)) {
    const result = [R.mita, R.kanji].map(tail).filter(Boolean).join("。");
    ippo = `一歩として、${tail(R.yatta)}。結果は、${result}。`;
  } else {
    ippo = cleanYosou(L1.yosou)
      ? `一歩はまだやっていませんが、「${cleanYosou(L1.yosou)}」と予想しています。`
      : "一歩はまだやっていません。";
  }
  return `私は高校1年生です。「${setsu}」という説が気になっています。${ippo}` +
    "この説と同じことに注目している人や、取り組んでいる人が分かる、日本語で読めるニュースや、国・国際機関・団体の調査や報告を、実際に検索して5つ見つけてください。" +
    "私が想像していなかった場面や分野のものも入れてください。" +
    "列は「媒体｜日付｜見出し｜だれが何をしているか（30文字以内）｜リンク」の表にしてください。" +
    "無料で読めるものを優先してください。表のあとには何も書かないでください。";
}
const PROMPT2 = "ありがとうございます。今度は、この説とはまったく別の分野や場面で、同じしくみに注目している人や、似たことで困っている人が分かる記事を5つ、同じ表で出してください。表のあとには何も書かないでください。";

function myStory(c) {
  const L1 = c.prev("L01"), R = res(c), esc = c.esc;
  const result = done(c)
    ? [R.yatta, R.mita, R.kanji].filter(Boolean).join(" ／ ")
    : `まだ。やるとしたら：${R.yarunara || "—"}`;
  return `
    <div class="themecard">
      <div class="tc-row big"><span>説</span><b>${esc(L1.setsu || "—")}</b></div>
      <div class="tc-row"><span>${MISSION}</span><b>${esc(L1.ippo || "—")}</b></div>
      <div class="tc-row"><span>予想</span><b>${esc(L1.yosou || "—")}</b></div>
      <div class="tc-row big"><span>結果</span><b>${esc(result || "—")}</b></div>
    </div>`;
}

export const L02 = {
  id: "L02",
  no: 2,
  title: "同じことに関心を持つ人を探す",
  mapAt: 1, // 一歩
  after: "R01", // Quest 1 の結果を出すと開く
  uses: ["L01", "R01"],
  steps: [
    { title: "班で報告", mins: 12 },
    { title: "AIで、同じことに関心を持つ人を探す", mins: 20 },
    { title: "気になったこと", mins: 8 },
    { title: "提出", mins: 2 }
  ],
  geminiKey: "gcis_gemini_L02", // 第1回とは別の、新しいチャット

  render(i, c) {
    const { field, promptBox, chips, esc, d } = c;
    if (i === 0) return `
      <p class="lead"><b>先生の合図で、班の時間です。</b>合図まではこの画面で待とう。</p>
      ${myStory(c)}
      <div class="share">
        <b>話す人（1人1分半）</b>
        <ol class="todo">
          <li>「前回、〇〇をやろうと言っていました。<b>どうなったと思う？</b>」と聞く<br><span class="hint">まだの人は「やるとしたら〇〇。どうなると思う？」</span></li>
          <li>班の人が答える（「わからない」もOK）</li>
          <li>結果を伝える</li>
        </ol>
        <b>聞く人</b><p>結果を聞いたら、1人1つ「〇〇なところが面白い」か「本当に〜？」を言おう。</p>
      </div>
      ${field("tomo", "友だちに言われたこと（なくてもOK）", { rows: 2, placeholder: "例：「部活のあとでも同じになる？」と聞かれた" })}`;
    if (i === 1) return `
      <p>あなたの説と<b>同じことに関心を持っている人</b>が、世の中にいるか探してみよう。</p>
      ${promptBox(prompt1(c), { first: true })}
      <p>表が出たら、続けて下の文を<b>同じチャットに</b>送ろう。</p>
      ${promptBox(PROMPT2)}
      <ol class="todo">
        <li>出てきた見出しを眺めて、いちばん「へぇ」と思った1つを読もう</li>
        <li><b>リンクを開いて、見出しと中身が合っているか見る</b>（AIは、ない記事を作ってしまうことがあります）</li>
        <li><b>誰が出したか</b>（国・新聞・企業・個人）を見る</li>
      </ol>
      <p class="hint">自分で検索して見つけた記事でもOK。合う記事が見つからないときは、まだ誰も調べていないことかもしれません。それも発見です。</p>
      ${field("geminiLink", "Geminiのチャットのリンク（なくてもOK）", { type: "url", placeholder: "https://…", hint: "次回、記事を開き直すのに使います。Geminiの「共有」→「リンクをコピー」" })}`;
    if (i === 2) return `
      <p>読んだ記事や、ここまでのことから、<b>気になったことを「？」で終わる形で</b>書こう（1つからでOK）。</p>
      <div class="field"><span class="hint">書き出しを押すと、空いている欄に入ります</span>${chips(Q_CHIPS, "q1,q2,q3")}</div>
      ${field("q1", "気になったこと ①", { type: "text", qmark: true })}
      ${field("q2", "気になったこと ②", { type: "text", qmark: true })}
      ${field("q3", "気になったこと ③", { type: "text", qmark: true })}
      <p class="hint">読み終わらなかったら、次回までに読んで書き足そう。提出したあとも直せます。</p>`;
    // i === 3：提出
    const qs = ["q1", "q2", "q3"].map(c.v).filter(Boolean);
    const R = res(c);
    return `
      ${myStory(c)}
      <div class="themecard" style="margin-top:12px">
        ${done(c) ? `<div class="tc-row"><span>これだけでは言い切れないこと</span><b>${esc(R.iikire || "—")}</b></div>` : ""}
        <div class="tc-row"><span>友だちに言われたこと</span><b>${esc(d.tomo || "—")}</b></div>
        <div class="tc-row big"><span>気になったこと</span><b>${qs.length ? `<ul class="qs">${qs.map(q => `<li>${esc(q)}</li>`).join("")}</ul>` : "—"}</b></div>
      </div>
      <div class="share"><b>次回は</b><p>記事に出てきた研究を探し、まだ分かっていないことを見つけます。</p></div>
      ${c.submitted ? `<p class="okmsg">提出済み ✓　あとから直しても自動で保存されます。</p>` : ""}`;
  },

  canNext(i, c) {
    if (i === 2) return ["q1", "q2", "q3"].some(k => c.v(k));
    return true;
  }
};
