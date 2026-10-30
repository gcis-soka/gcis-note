// 第1回（11/2）気になることを見つけ、来週の一歩を決める
// 画面の枠・保存・ボタンの動きは student.js。ここには各画面の中身・プロンプト・次へ進める条件だけを書く
import { methodOf } from "./common.js";
import { THEMES } from "./themes.js";

const YOSOU_TEMPLATE = "たぶん＿＿だと思う。なぜなら＿＿。";

// ---------- プロンプト（確定：L01.md） ----------
const KW_TAIL = "ここから探究のきっかけになるキーワードを20個、「ど真ん中7・ちょっと意外7・遠いけど面白い6」に分け、一言の説明をつけて表で出してください。番号はつけないでください。表のあとには、説明・アドバイス・問いの例・次の提案を書かないでください。表だけを出してください。";
// 入口 A：3つの質問／B：テーマの例／C：もうやりたいことがある（キーワードの画面をとばし、やりたいことの中の「本当かな？」から始める）
const route = c => (c.d.route === "B" || c.d.route === "C" ? c.d.route : "A");
function prompt1(c) {
  const v = c.v;
  if (route(c) === "B") {
    return `私は高校1年生です。【${v("theme")}】というテーマが少し気になっています。` +
      (v("themeWhere") ? `特に【${v("themeWhere")}】のところが気になりました。` : "") + KW_TAIL;
  }
  return `私は高校1年生です。私についての答え：` +
    `【時間が溶けたもの：${v("odai1") || "なし"}】` +
    `【語りだすと止まらないもの：${v("odai2") || "なし"}】` +
    `【最近モヤっとしたこと：${v("odai3") || "なし"}】。` + KW_TAIL;
}
const SETSU_TAIL = `高校生が直感的に「えっ、本当？」と思うもの、できれば自分の生活で確かめられそうなものにしてください。` +
  `研究者の名前・論文名は書かないでください。理由・問い・調べ方も書かないでください。表のあとには何も書かないでください。`;
function prompt2(c) {
  const ks = ["kw1", "kw2", "kw3"].map(c.v).filter(Boolean).map(k => `【${k}】`).join("");
  return `気になったのは${ks}です。それぞれについて、研究や専門家の間で「こう言われている」という意外な説を3つずつ、1つ40文字以内で出してください。` + SETSU_TAIL;
}
// 入口C：説が思いつかないときだけ使う（AI②と同じ条件で、やりたいことから説を出す）
function prompt2C(c) {
  return `私は高校1年生です。【${c.v("yaritai")}】をやってみたいと思っています。` +
    (c.v("yaritaiWhy") ? `理由は【${c.v("yaritaiWhy")}】です。` : "") +
    `これに関係して、研究や専門家の間で「こう言われている」という意外な説を5つ、1つ40文字以内で出してください。` + SETSU_TAIL;
}
function prompt3(c) {
  return `私が「本当？」と思ったのは【${c.v("setsu")}】です。この説を確かめるために、来週までに30分以内・お金不要・安全にできる小さな一歩を5つ出してください` +
    `（見に行く／やってみる／聞く／測る。方法が偏らないように。検索だけで終わるものは除く）。` +
    `それぞれ、【方法】から始まる短い見出しを太字で書き、その下に何をして何を見ればよいかを1〜2行で書いてください。` +
    `前置きは書かないでください。最後に「ピンとこなければ『もう少し出して』と送ってください」と書いてください。`;
}

function step0(c) {
  const { field, esc } = c;
  if (route(c) === "C") return `
    <p class="lead">もうやってみたいこと・調べてみたいことがある人は、それを書こう。<b>短くてOK。あとで変えてもOK。</b></p>
    ${field("yaritai", "やってみたいこと・調べてみたいこと", { rows: 2, placeholder: "例：古着をリメイクして、自分のブランドを作ってみたい", short: true })}
    ${field("yaritaiWhy", "なぜ気になる？（なくてもOK）", { rows: 2, placeholder: "例：新品の服より、古着の方が自分らしい気がするから" })}
    <p class="note">このあと、キーワードの画面はとばして、<b>やりたいことの中にある「本当かな？」</b>を見つけます。</p>
    <p class="switch"><button type="button" class="link" data-route="A">← 3つの質問にもどる</button></p>`;
  if (route(c) === "B") {
    const sel = c.v("theme");
    return `
      <p><b>テーマの例</b>：少しでも気になるものを1つクリックしよう。あとで変えてもOK。</p>
      <div class="themes">${THEMES.map((t, i) =>
        `<button type="button" class="theme ${t === sel ? "on" : ""}" data-theme="${i}">${esc(t)}</button>`).join("")}</div>
      ${sel ? field("themeWhere", "どこが少し気になった？（なくてもOK）", { type: "text", placeholder: "例：「食」のところ。給食の残りが多いのが気になってた" }) : ""}
      <p class="switch"><button type="button" class="link" data-route="A">← 3つの質問にもどる</button></p>`;
  }
  return `
    <p class="lead">まずは3つの質問に答えるだけ。<b>空欄があってもOK。</b>頭の中の考えを、まとめずにそのまま打って大丈夫。話しことばも途中の文も「うーん」も歓迎。まとめるのはAIの仕事です。<span class="hint">（しゃべって入力もOK：Windowsキー＋H）</span></p>
    ${field("odai1", "① 気づいたら時間が溶けていたのは？", { placeholder: "例：料理動画とか、作らないのに気づいたら1時間くらい見てる", short: true })}
    ${field("odai2", "② 人に語りだすと止まらないのは？", { placeholder: "例：バスケ部の試合の話になると、あの逆転のときがさ…って止まらなくなる", short: true })}
    ${field("odai3", "③ 最近モヤっとしたのは？", { placeholder: "例：電車で席を譲るか迷って、結局声をかけられなくて、ずっとモヤモヤしてた", short: true })}
    <p class="switch"><button type="button" class="link" data-route="B">思いつかないときは → テーマの例から選ぶ</button><br>
      <button type="button" class="link" data-route="C">もうやりたいことが決まっている → そこから始める</button></p>`;
}

// 入口Cの画面3：やりたいことの中の「本当かな？」（自分で書く。思いつかなければAI）
function step2C(c) {
  const { field, promptBox, esc } = c;
  return `
    <div class="themecard"><div class="tc-row"><span>やりたいこと</span><b>${esc(c.v("yaritai") || "—")}</b></div></div>
    <p>やりたいことの中には、「本当は〜なんじゃないか」という<b>自分なりの見込み</b>が隠れています。それを1つ書こう。来週、それを確かめます。</p>
    ${field("setsu", "確かめたい「本当かな？」", {
      rows: 2, placeholder: "例：高校生は、新品より古着の方が「自分らしい」と感じている",
      hint: "書き出しを押すと入ります。＿＿を自分のことばに書きかえよう", chips: [
        { label: "本当は〜なんじゃないか", text: "本当は＿＿なんじゃないか" },
        { label: "〜すると、〜になるはず", text: "＿＿すると、＿＿になるはず" },
        { label: "〜な人は、〜しているはず", text: "＿＿な人は、＿＿しているはず" }]
    })}
    <details class="help"><summary>思いつかないときは、AIに説を出してもらう</summary>
      ${promptBox(prompt2C(c), { first: true })}
      <p class="hint">出てきた説から、いちばん「えっ、本当？」と思ったものを1つ、上の欄に貼ってOK。</p>
    </details>
    ${field("hikkakari", "ひっかかったところ（なくてもOK）", {
      rows: 2, placeholder: "例：本当に？ 友だちは新品の方が好きって言ってた",
      hint: "書き出しを押すと入ります", chips: [
        { label: "本当に〜？", text: "本当に" }, { label: "自分だと〜", text: "自分だと" }, { label: "なんで〜なの？", text: "なんで" }]
    })}
    <p class="note">この「本当かな？」は、まだ本当かどうか分かりません。<b>だから次で、自分で確かめてみます。</b></p>`;
}

const setsuFilled = c => !!c.v("setsu") && !c.v("setsu").includes("＿＿");
function yosouFilled(c) {
  const x = c.v("yosou").replace(/[\s　]/g, "");
  return !!x && x !== YOSOU_TEMPLATE.replace(/[\s　]/g, "");
}

export const L01 = {
  id: "L01",
  no: 1,
  title: "気になることを見つけて、来週の一歩を決める",
  mapAt: 0, // ホームの地図で光らせる位置（気になる）
  steps: [
    { title: "自分が何に興味があるのか、AIと一緒に探してみよう", mins: 4 },
    { title: "AI① キーワード20個", mins: 8 },
    { title: "AI② 「えっ、本当？」と思う説", mins: 7 },
    { title: "AI③ 来週の一歩", mins: 8 },
    { title: "班で共有して提出", mins: 8 }
  ],
  geminiKey: "gcis_gemini", // この回の Gemini のチャット（回ごとに新しいチャット）

  render(i, c) {
    const { field, promptBox, esc, d } = c;
    if (i === 0) return step0(c);
    if (i === 1) return `
      ${promptBox(prompt1(c), { first: true })}
      <p class="hint">画面が重なったら、このページを左に寄せよう（Windows：Windowsキー＋← ／ Chromebook：Alt＋[ ）。Chrome右上の「Geminiに相談」は使いません。</p>
      <p>出てきた20個を眺めて、<b>直感で気になったもの</b>を3つ書こう。理由はいらない。</p>
      <div class="row3">
        ${field("kw1", "気になった ①", { type: "text" })}
        ${field("kw2", "気になった ②", { type: "text" })}
        ${field("kw3", "気になった ③", { type: "text" })}
      </div>
      <p class="hint">読み切れなかったら、各列から1つずつ選んでもOK。</p>`;
    if (i === 2 && route(c) === "C") return step2C(c);
    if (i === 2) return `
      ${promptBox(prompt2(c))}
      <p>出てきた説を眺めて、<b>いちばん「えっ、本当？」と思った説を1つ選ぼう。</b></p>
      ${field("setsu", "選んだ説", { rows: 2, placeholder: "例：完全に静かな部屋よりも、適度な雑音がある場所の方が没頭しやすい", hint: "Geminiの文をコピーして貼ってOK" })}
      ${field("hikkakari", "ひっかかったところ（なくてもOK）", {
        rows: 2, placeholder: "例：本当に？ 自分は図書館のほうがはかどる気がする",
        hint: "書き出しを押すと入ります", chips: [
          { label: "本当に〜？", text: "本当に" }, { label: "自分だと〜", text: "自分だと" }, { label: "なんで〜なの？", text: "なんで" }]
      })}
      <p class="note">AIの説は、本当かどうか分かりません。<b>だから次で、自分で確かめてみます。</b></p>
      <p class="hint">ピンとこなければ、Geminiに「ほかの説も出してください」と送ってOK。</p>`;
    if (i === 3) return `
      ${promptBox(prompt3(c), { first: route(c) === "C" })}
      ${field("ippo", "来週までにやる一歩（5つから1つ選ぶ）", { rows: 3, placeholder: "例：【やってみる】無音の部屋と、カフェの雑音を流した部屋で、15分ずつ同じ問題を解いて比べる", hint: "【やってみる】などの見出しごと貼ってOK。自分で思いついた一歩でもOK" })}
      ${field("ippoDate", "やる日", { type: "date" })}
      ${field("yosou", "予想", { rows: 2, placeholder: "例：たぶん雑音がある方がはかどると思う。なぜなら、家より図書館の方が勉強が進むから。", hint: "たぶん＿＿だと思う。なぜなら＿＿。", chips: [{ label: "書き出しを入れる", text: YOSOU_TEMPLATE }] })}
      <div class="rules"><b>一歩の安全ルール</b>
        <ul><li>他の人の個人情報や写真は集めない</li><li>「検索して終わり」ではなく、体を動かす一歩にする</li></ul></div>`;
    // i === 4：提出
    const m = methodOf(d.ippo);
    return `
      <div class="themecard">
        ${route(c) === "B" && d.theme ? `<div class="tc-row"><span>テーマの例</span><b>${esc(d.theme)}</b></div>` : ""}
        ${route(c) === "C"
          ? `<div class="tc-row"><span>やりたいこと</span><b>${esc(d.yaritai || "—")}</b></div>`
          : `<div class="tc-row"><span>気になったキーワード</span><b>${esc(["kw1", "kw2", "kw3"].map(c.v).filter(Boolean).join("・") || "—")}</b></div>`}
        <div class="tc-row big"><span>「えっ、本当？」と思った説</span><b>${esc(d.setsu || "—")}</b></div>
        <div class="tc-row"><span>ひっかかったところ</span><b>${esc(d.hikkakari || "—")}</b></div>
        <div class="tc-row big"><span>来週までにやる一歩${m && m !== "不明" && m !== "その他" ? ` <i class="mt">${m}</i>` : ""}</span><b>${esc(d.ippo || "—")}</b><em>${esc(d.ippoDate || "")}</em></div>
        <div class="tc-row"><span>予想</span><b>${esc(d.yosou || "—")}</b></div>
      </div>
      ${field("geminiLink", "Geminiのチャットのリンク（なくてもOK）", { type: "url", placeholder: "https://…", hint: "Geminiの「共有」→「リンクをコピー」で取れます。共有できないときは空欄でOK" })}
      <div class="share">
        <b>班で共有（1人1分）</b>
        <p>この画面を見せながら「本当？と思った説・来週やること・予想」を話そう。聞く人は質問を1つ。</p>
      </div>
      ${c.submitted ? `<p class="okmsg">提出済み ✓　あとから直しても自動で保存されます。</p>` : ""}`;
  },

  canNext(i, c) {
    switch (i) {
      case 0: return route(c) === "B" ? !!c.v("theme") : route(c) === "C" ? !!c.v("yaritai") : ["odai1", "odai2", "odai3"].some(k => c.v(k));
      case 1: return ["kw1", "kw2", "kw3"].some(k => c.v(k));
      case 2: return setsuFilled(c);
      case 3: return !!c.v("ippo") && yosouFilled(c);
      default: return true;
    }
  },

  // 入口Cはキーワードの画面（AI①）をとばす
  skip(i, c) { return i === 1 && route(c) === "C"; },
  stepTitle(i, c) { return i === 2 && route(c) === "C" ? "やりたいことの中の「本当かな？」" : ""; },

  // この回だけのボタン（入口A/B/Cの切り替え・テーマの例）。処理したら true
  onClick(t, c) {
    const rt = t.closest("[data-route]");
    if (rt) { c.set("route", rt.dataset.route); c.rerender(); return true; }
    const th = t.closest("[data-theme]");
    if (th) {
      c.set("theme", THEMES[Number(th.dataset.theme)]);
      c.rerender();
      c.app.querySelector('[data-key="themeWhere"]')?.scrollIntoView({ block: "center" });
      return true;
    }
    return false;
  }
};
