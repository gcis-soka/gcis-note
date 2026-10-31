// ステージ7／第4回（12/7）問いを立てて、確かめる計画を作る（A案）
// 流れ：読む時間 → 問いを出す（QFT）→ AIで広げる → しぼる（1学期の A〜D・合言葉）→ 計画の下書き（調べ方を選ぶ→書く→Geminiが指摘）
// 計画の点検（安全・倫理）と着手は第5回（12/14）
// data：toiList・toi・toiWhy・houhou・nani・yotei・hitsuyou・kuraberu・anzen・geminiLink
import { quest } from "./common.js";

const tail = s => String(s || "").trim().replace(/[。．.、,，！!\s　]+$/u, "");
const linesOf = s => String(s || "").split(/\n/).map(x => x.replace(/^[\s・\-－*＊0-9０-９.．、)）]+/u, "").trim()).filter(Boolean);
const safeUrl = u => /^https?:\/\//i.test(String(u || "").trim()) ? String(u).trim() : "";
const MIN_TOI = 3;

// 教科書 p.44「問いの種類」（7分類）。中身が分かったらここに7つ並べる → しぼるプロンプトに1列足される
// 例：["なぜ（原因）", "比較", "影響", …]。空のあいだは使わない
export const Q_TYPES = [];

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

// ---------- プロンプト（試作・未試行） ----------
function promptAdd(c) {
  const L1 = c.prev("L01"), R3 = c.prev("R03");
  const list = linesOf(c.d.toiList).map(x => `・${x}`).join("\n") || "・（まだありません）";
  return `私は高校1年生です。「${tail(L1.setsu) || "（説）"}」という説から探究を始め、論文を読みました。` +
    `分かったこと：${tail(R3.wakatta) || "（なし）"}。まだ分かっていないこと：${tail(R3.mada) || "（なし）"}。\n` +
    `私は次の問いを出しました。\n${list}\n` +
    "これとは違う角度から、問いを10個出してください。私の問いの言い換えは入れないでください。答えやヒントは書かないでください。" +
    "「問い｜どんな角度か（10文字以内）」の表にしてください。表のあとには何も書かないでください。";
}
function promptSort(c) {
  const list = linesOf(c.d.toiList).map(x => `・${x}`).join("\n") || "・（まだありません）";
  const types = Q_TYPES.length ? `｜問いの種類（${Q_TYPES.join("・")}のどれか）` : "";
  return "次は、私のリストの問いを、1学期に習った4つの点で見てください。" +
    "A：「？」で終わる問いになっている。B：検索しても、すぐには答えが出ない。C：いつ・どこ・誰がはっきりしている。D：高校生が自分の手で確かめられる。" +
    `「問い｜A｜B｜C｜D${types}」の表にして、A〜Dは〇（できている）か△（直すとよい）で答えてください。` +
    "問いは書き直さないでください。どれがよいかは決めないでください。表のあとには何も書かないでください。\n" + list;
}
function promptPlan(c) {
  const v = c.v;
  return "私は次の問いを確かめる計画を立てました。\n" +
    `問い：${v("toi") || "（未記入）"}\n調べ方：${v("houhou") || "（未記入）"}\nこの調べ方で確かめること：${v("nani") || "（未記入）"}\n` +
    `予定（いつ・どこで・どうやって）：${v("yotei") || "（未記入）"}\n必要なもの・人：${v("hitsuyou") || "（未記入）"}\n` +
    `比べるもの：${v("kuraberu") || "（未記入）"}\n気をつけること：${v("anzen") || "（未記入）"}\n` +
    "この計画を書き直さずに、良くするための指摘を3つまでください。" +
    "見てほしいのは、①12月から冬休みのあいだにできる量か、②この比べ方で問いに答えられるか、③必要なものや協力してくれる人がそろうか、④人を傷つけたり、個人情報を集めたりしないか、です。" +
    "指摘は質問の形にして、1つ40文字以内にしてください。最後にまとめは書かないでください。";
}

function readRecap(c) {
  const L3 = c.prev("L03"), R3 = c.prev("R03"), esc = c.esc;
  const ps = [["p1Title", "p1Url"], ["p2Title", "p2Url"]].map(([t, u]) => ({ title: String(L3[t] || "").trim(), url: safeUrl(L3[u]) })).filter(p => p.title);
  const qs = ["q1", "q2", "q3"].map(k => String(R3[k] || "").trim()).filter(Boolean);
  return `
    <div class="recap">
      ${ps.map((p, j) => `<div class="tc-row"><span>論文${j ? "②" : "①"}</span><b>${p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.title)} ↗</a>` : esc(p.title)}</b></div>`).join("")}
      <div class="tc-row"><span>分かったこと</span><b>${esc(R3.wakatta || "—")}</b></div>
      <div class="tc-row"><span>まだ分かっていないこと</span><b>${esc(R3.mada || "—")}</b></div>
      ${qs.length ? `<div class="tc-row"><span>気になったこと</span><b><ul class="qs">${qs.map(q => `<li>${esc(q)}</li>`).join("")}</ul></b></div>` : ""}
    </div>`;
}

const listField = (c, rows = 10) => c.field("toiList", `問いのリスト（1行に1つ）`, {
  rows, placeholder: "例：\nなんで雑音があると集中できるの？\n大学生と高校生で同じ？\nどのくらいの音の大きさがいい？"
});
const countLine = () => `<p class="hint">${MIN_TOI}個以上で次へ進めます。10個を目指そう。</p>`;

export const L04 = {
  id: "L04",
  no: 4,
  title: "問いを立てて、確かめる計画を作る",
  mapAt: 3, // 問い（提出すると「計画」へ）
  after: "R03", // Quest 3 を出すと開く（先に進みたい生徒は空白期間にもできる）
  uses: ["L01", "L03", "R03"],
  steps: [
    { title: "読む時間", mins: 8 },
    { title: "問いを出す", mins: 10 },
    { title: "AIで広げる", mins: 5 },
    { title: "問いをしぼる", mins: 10 },
    { title: "確かめる計画を書く", mins: 10 },
    { title: "AIに見てもらって直す", mins: 5 },
    { title: "提出", mins: 2 }
  ],
  geminiKey: "gcis_gemini_L04",

  render(i, c) {
    const { field, promptBox, chips, esc, d } = c;
    if (i === 0) return `
      <p>まず、ここまでを思い出そう。<b>読み切っていない人は、論文の続きを読む時間</b>です。</p>
      ${readRecap(c)}
      <p class="hint">${quest(3)}は、ホームの「${quest(3)}」からいつでも書き足せます。</p>`;
    if (i === 1) return `
      <p>論文や本・動画、${quest(3)}から、<b>問いをできるだけたくさん</b>出そう。</p>
      <div class="share">
        <b>問いを出すときの約束（1学期のQFT）</b>
        <ul>
          <li>できるだけたくさん出す</li>
          <li>出しながら、良い・悪いを決めない</li>
          <li>思いついた言葉のまま書く</li>
          <li>「〜だ」と思ったことは、「？」の形に直す</li>
        </ul>
      </div>
      ${listField(c)}${countLine(c)}`;
    if (i === 2) return `
      <p>自分の問いを出したら、<b>AIに別の角度の問いを足してもらおう</b>。</p>
      ${promptBox(promptAdd(c), { first: true })}
      <p>気に入った問いがあったら、<b>下のリストに足そう</b>（自分の言葉に直してOK）。</p>
      ${listField(c, 12)}${countLine(c)}`;
    if (i === 3) return `
      <p>リストの問いを、1学期に習った<b>A〜D</b>で見てもらおう。<b>同じチャットに</b>送ります。</p>
      ${promptBox(promptSort(c))}
      <div class="share">
        <b>直し方の合言葉（1学期 第7回）</b>
        <ul>${AIKOTOBA.map(([a, b]) => `<li><b>${a}</b>：${b}</li>`).join("")}</ul>
      </div>
      <p>表を見ながら、<b>いちばん確かめてみたい問いを1つ</b>選ぼう。〇が多いものでなくてもOK。合言葉で直してから書こう。</p>
      ${field("toi", "選んだ問い", { type: "text", qmark: true })}
      ${field("toiWhy", "この問いを選んだわけ（なくてもOK）", { rows: 2 })}`;
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
    return `
      <div class="themecard">
        <div class="tc-row big"><span>選んだ問い</span><b>${esc(d.toi || "—")}</b></div>
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
    if (i === 1 || i === 2) return linesOf(c.d.toiList).length >= MIN_TOI;
    if (i === 3) return !!c.v("toi");
    if (i === 4 || i === 5) return !!(c.v("houhou") && c.v("nani") && c.v("yotei"));
    return true;
  },

  onClick(t, c) {
    const b = t.closest("[data-houhou]");
    if (b) { c.set("houhou", b.dataset.houhou); c.rerender(); return true; }
    return false;
  }
};
