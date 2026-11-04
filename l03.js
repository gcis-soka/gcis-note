// ステージ5／第3回（11/16）先行研究に出会う（A案：ニュース→本・動画→論文）
// 仕様：ナレッジの L03.md。論文は2本決める。長すぎないものを選んで全文を読む（授業で途中まで→残りは Quest 3）
// RefNavi への登録は授業で（URLを貼るだけ）。アプリは手伝わない（先生 10/31）
// data：hanMemo・kensaku・tried・p1Title・p1Url・p2Title・p2Url・yomiMemo・geminiLink
import { quest } from "./common.js";

const qsOf = d => ["q1", "q2", "q3"].map(k => String(d[k] || "").trim()).filter(Boolean);
const tail = s => String(s || "").trim().replace(/[。．.、,，！!\s　]+$/u, "");
const safeUrl = u => /^https?:\/\//i.test(String(u || "").trim()) ? String(u).trim() : "";

// 探す場所（検索語を入れて開く）
const SEARCH = [
  { id: "scholar", label: "Google Scholar で探す", url: q => `https://scholar.google.co.jp/scholar?hl=ja&q=${encodeURIComponent(q)}` },
  { id: "jstage", label: "J-STAGE", url: q => `https://www.jstage.jst.go.jp/result/global/-char/ja?globalSearchKey=${encodeURIComponent(q)}` },
  { id: "cinii", label: "CiNii", url: q => `https://cir.nii.ac.jp/all?q=${encodeURIComponent(q)}` }
];

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
      <div class="tc-row"><span>${quest(2)}：見たもの・読んだもの</span><b>${esc(R2.mono || "—")}</b></div>
      <div class="tc-row"><span>心に残った所</span><b>${esc(R2.kokoro || "—")}</b></div>
    </div>`;
}

const papers = c => [["p1Title", "p1Url"], ["p2Title", "p2Url"]].map(([t, u]) => ({ title: c.v(t), url: c.v(u) })).filter(p => p.title);

export const L03 = {
  id: "L03",
  no: 3,
  title: "先行研究に出会う",
  mapAt: 2, // 文献
  after: "R02", // Quest 2 を出すと開く
  uses: ["L01", "L02", "R02"],
  steps: [
    { title: "班で紹介", mins: 8 },
    { title: "研究を探して、論文を2本決める", mins: 20 },
    { title: "読みはじめる", mins: 15 },
    { title: "提出", mins: 2 }
  ],
  geminiKey: "gcis_gemini_L03", // 第3回の新しいチャット

  render(i, c) {
    const { field, promptBox, esc, d } = c;
    if (i === 0) return `
      <p class="lead"><b>先生の合図で、班の時間です。</b>${quest(2)}で見たもの・読んだものを紹介しよう。</p>
      ${myRecap(c)}
      <div class="share">
        <b>話す人（1人1分半）</b>
        <ol class="todo">
          <li>何の動画（本）で、どこが心に残ったか</li>
          <li>うまく言えなくてもOK。「なんか気になった」もそのまま話そう</li>
        </ol>
      </div>
      ${field("hanMemo", "班で出たこと・友だちの紹介で気になったこと（なくてもOK）", { rows: 2 })}`;
    if (i === 1) return `
      <p>記事や本・動画で、同じことに関心を持つ人がいました。その中には、<b>研究者</b>もいます。<br>研究では、どこまで分かっているんだろう？</p>
      <h3>① 検索語をAIに考えてもらう</h3>
      ${promptBox(promptWords(c), { first: true })}
      <h3>② 自分で探す</h3>
      <div class="field"><label><span class="label">検索語</span><span class="hint">AIの言葉でも、自分の言葉でもOK。何度でも試そう</span>
        <input data-key="kensaku" type="text" value="${esc(d.kensaku || "")}" placeholder="例：雑音 集中 作業効率"></label></div>
      <div class="searchbtns">${SEARCH.map((s, j) => `<button type="button" class="btn ${j ? "ghost" : ""}" data-search="${s.id}">${s.label} ↗</button>`).join("")}</div>
      ${d.tried ? `<p class="hint">試した言葉：${esc(d.tried)}</p>` : ""}
      <ul class="todo">
        <li><b>長すぎないもの</b>を選ぼう（ページ数を見る）。全部読みます</li>
        <li>右に<b>[PDF]</b>があるもの・J-STAGEなど、<b>無料で読めるもの</b>から</li>
        <li>見つからないときは、日本語だけ／英語で／言葉を変えて。それでもなければ「研究が少ない」のも発見です</li>
      </ul>
      <h3>③ 論文を2本決める</h3>
      ${field("p1Title", "論文①の題名", { type: "text" })}
      ${field("p1Url", "論文①のURL", { type: "url", placeholder: "https://…" })}
      ${field("p2Title", "論文②の題名", { type: "text" })}
      ${field("p2Url", "論文②のURL", { type: "url", placeholder: "https://…" })}
      <p class="hint">決めたら、RefNaviにもURLを貼って登録しよう。</p>
      ${field("geminiLink", "Geminiのチャットのリンク（なくてもOK）", { type: "url", placeholder: "https://…" })}`;
    if (i === 2) {
      const ps = papers(c);
      return `
        <p><b>論文①から読みはじめよう。</b>今日は途中まででOK。残りは${quest(3)}で読み切ります。</p>
        <div class="recap">${ps.length ? ps.map((p, j) => `<div class="tc-row"><span>論文${j ? "②" : "①"}</span><b>${safeUrl(p.url) ? `<a href="${esc(safeUrl(p.url))}" target="_blank" rel="noopener">${esc(p.title)} ↗</a>` : esc(p.title)}</b></div>`).join("") : `<div class="tc-row"><span>論文</span><b>—</b></div>`}</div>
        <div class="share">
          <b>読み方のコツ</b>
          <ul>
            <li>知らない言葉は、すぐ調べなくてOK。印をつけて先へ</li>
            <li>「何を・誰に・どうやって調べたか」と「何が分かったか」を探しながら読む</li>
            <li>最後の「まとめ・今後の課題」に、<b>まだ分かっていないこと</b>が書いてあることが多い</li>
          </ul>
        </div>
        ${field("yomiMemo", "読みながらのメモ（なくてもOK）", { rows: 4, placeholder: "例：大学生30人で調べていた。高校生ではどうなんだろう" })}`;
    }
    // i === 3：提出
    const ps = papers(c);
    return `
      <div class="themecard">
        <div class="tc-row"><span>本か動画</span><b>${esc(c.prev("R02").mono || "—")}</b></div>
        <div class="tc-row big"><span>論文</span><b>${ps.length ? `<ul class="qs">${ps.map(p => `<li>${esc(p.title)}</li>`).join("")}</ul>` : "—"}</b></div>
      </div>
      ${ps.length < 2 ? `<p class="note">論文が1本だけのときは、${quest(3)}の前にもう1本探してみよう（ホームから「見なおす」で書き足せます）。</p>` : ""}
      <div class="share"><b>次は ${quest(3)}（第4回 12/7 まで）</b><p>2本の論文を読み切って、分かったこと・まだ分かっていないことを書こう。提出すると、ホームに出てきます。</p>
        <p>第4回は、ここまでのことから自分の問いを立てて、確かめる計画を作ります。</p></div>
      ${c.submitted ? `<p class="okmsg">提出済み ✓　あとから直しても自動で保存されます。</p>` : ""}`;
  },

  canNext(i, c) {
    if (i === 1) return !!c.v("p1Title"); // 2本が目標。見つからない生徒も先へ進める
    return true;
  },

  onClick(t, c) {
    const s = t.closest("[data-search]");
    if (s) {
      const q = c.v("kensaku");
      if (!q) { alert("先に検索語を入れてね"); return true; }
      const S = SEARCH.find(x => x.id === s.dataset.search);
      window.open(S.url(q), "_blank", "noopener");
      // 試した言葉を残す（新しい順・10個まで）
      const list = String(c.d.tried || "").split(" / ").filter(Boolean).filter(x => x !== q);
      c.set("tried", [q, ...list].slice(0, 10).join(" / "));
      c.rerender();
      return true;
    }
    return false;
  }
};
