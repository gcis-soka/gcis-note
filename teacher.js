// 教員画面：期・クラス・回ごとの進み具合（リアルタイム）＋学年まとめ（読み込みは1回・読み直しボタン）
import {
  escapeHtml, classLabel as baseClassLabel, kiLabel, firstYearKi, methodOf, lsGet, lsSet, quest, classSize,
  CLASSES, TEST_CLASS, METHODS, PICK_N, listOf, booksOf, doiOf, memoText
} from "./common.js";

const GRADE = -1; // 「学年」タブ（全クラスのまとめ）
const classLabel = c => c === GRADE ? "学年" : baseClassLabel(c);

const MISSION = quest(1);
const STALL_MIN = 5; // この分数以上更新がなく未提出なら「止まってる？」
const esc = escapeHtml;
const safeUrl = u => /^https:\/\//i.test(String(u || "").trim()) ? String(u).trim() : "";
const linkCell = u => safeUrl(u) ? `<a href="${esc(safeUrl(u))}" target="_blank" rel="noopener">開く ↗</a>` : esc(u || "—");
const item = (d, k, label) => `<div class="tc-row"><span>${label}</span><b>${esc(d[k] || "—")}</b></div>`;
const br = t => esc(t || "").replace(/\n/g, "<br>");
// Quest 3 のメモ（論文ごと：wakatta・wakatta2 など）をまとめて1行に（11/9）
const memoItem = (d, k, label) => `<div class="tc-row"><span>${label}</span><b>${br(memoText(d, k)) || "—"}</b></div>`;
const didChip = x => x === "やった" ? `<span class="mchip">やった</span>` : x === "まだ" ? `<span class="mchip zero">まだ</span>` : "";
function resultRows(d) {
  return d.did === "まだ"
    ? `<div class="tc-row"><span>${MISSION}</span><b>まだ</b></div>${item(d, "yarunara", "やるとしたら")}`
    : `<div class="tc-row"><span>${MISSION}</span><b>${esc(d.did || "—")}</b></div>${item(d, "yatta", "やったこと")}${item(d, "mita", "見たこと・数字")}${item(d, "kanji", "感じたこと")}${item(d, "iikire", "これだけでは言い切れないこと")}`;
}
const qsOf = d => ["q1", "q2", "q3"].map(k => String(d[k] || "").trim()).filter(Boolean);
// Quest 2：本か動画（動画・本を5件まで。古い1欄 mono は使った生徒がいなかったので読まない：11/7）
const pickKind = d => [listOf(d, "douga").length && "動画", listOf(d, "honTitle").length && "本"].filter(Boolean).join("・");
const linksCell = us => us.map(u => linkCell(u)).join("<br>");
const pickCell = d => [linksCell(listOf(d, "douga")), listOf(d, "honTitle").map(esc).join("<br>")].filter(Boolean).join("<br>");
const nCols = (label, unit) => PICK_N.map((n, i) => `${label}${i + 1}`);
const nVals = (d, base) => PICK_N.map(n => d?.[base + n] || "");
// 第3回：決めた論文（題名・URL）
// 論文は URL だけ（題名は RefNavi：11/7）
// 論文の欄ごと（③は Quest 3 だけ：11/9）。空も含めて番号順
const paperSlots = d => [1, 2, 3].map(n => ({ n, no: "①②③"[n - 1], url: String(d[`p${n}Url`] || "").trim(), doi: doiOf(d[`p${n}Doi`]) || String(d[`p${n}Doi`] || "").trim(), yomi: d[`yomi${n}`] || "" }));
const papersOf = d => [["p1Url", "p1Doi"], ["p2Url", "p2Doi"]].map(([k, o]) => ({ url: String(d[k] || "").trim(), doi: doiOf(d[o]) || String(d[o] || "").trim() })).filter(p => p.url);
// DOI はリンクの形で開けるように（番号だけは RefNavi に写すときだけ：11/9）
const paperCell = p => p ? linkCell(p.url) + (p.doi ? ` <a class="hint" href="https://doi.org/${esc(p.doi)}" target="_blank" rel="noopener">DOI ↗</a>` : "") : "";
// 第3回：RefNavi の進み具合（生徒が自分で押す：l03.js の REF_CHECKS と同じ）
const REF_LABELS = [["refLogin", "ログイン"], ["refDouga", "動画"], ["refHon", "本"], ["refHan", "班の全員"]];
const refDone = d => !!(d.refDouga || d.refHon);
const refCell = d => d.refLogin || refDone(d) ? `<span class="mchip ${refDone(d) ? "" : "zero"}">${refDone(d) ? "登録" : "ログイン"}</span>` : "";
const yomiChip = x => x ? `<span class="mchip ${x === "全部読んだ" ? "" : "zero"}">${esc(x)}</span>` : "";
const qsList = d => Array.isArray(d.qs) ? d.qs : []; // 第4回の問い [{t, k, a}]

// ---------- 回ごとの見せ方 ----------
// date：この日になったら、そのステージを最初に表示する
const VIEWS = {
  L01: {
    tab: "第1回", date: "2026-11-02",
    stepNames: ["お題", "AI①", "AI②", "AI③", "共有"],
    head: ["「本当？」と思った説", "方法", "来週の一歩", "やる日"],
    cells: r => {
      const d = r.note?.data || {}, m = methodOf(d.ippo);
      return [esc(d.setsu || ""), m ? `<span class="mchip">${m}</span>` : "", esc(d.ippo || ""), esc(d.ippoDate || "")];
    },
    nowrap: [1, 3],
    // 一歩の方法の偏り
    chips(rs) {
      const count = Object.fromEntries([...METHODS, "その他", "不明"].map(m => [m, 0]));
      rs.forEach(r => { const m = methodOf(r.note?.data?.ippo); if (m) count[m]++; });
      const total = Object.values(count).reduce((a, b) => a + b, 0);
      return total
        ? `<span class="hint">一歩の方法：</span>${[...METHODS, "その他", "不明"].filter(m => count[m] || METHODS.includes(m))
            .map(m => `<span class="mchip ${count[m] ? "" : "zero"}">${m} <b>${count[m]}</b></span>`).join("")}`
        : "";
    },
    detail(r) {
      const d = r.note?.data || {};
      const first = d.route === "B"
        ? `<div class="tc-row"><span>入口</span><b>テーマの例から選んだ</b></div>${item(d, "theme", "テーマの例")}${item(d, "themeWhere", "どこが少し気になった？")}`
        : d.route === "C"
          ? `<div class="tc-row"><span>入口</span><b>やりたいことから始めた</b></div>${item(d, "yaritai", "やりたいこと")}${item(d, "yaritaiWhy", "なぜ気になる？")}`
          : `${item(d, "odai1", "時間が溶けたもの")}${item(d, "odai2", "語りだすと止まらないもの")}${item(d, "odai3", "最近モヤっとしたこと")}`;
      return `
        ${first}
        ${d.route === "C" ? "" : `<div class="tc-row"><span>気になったキーワード</span><b>${esc(["kw1", "kw2", "kw3"].map(k => d[k]).filter(Boolean).join("・") || "—")}</b></div>`}
        ${item(d, "setsu", "「えっ、本当？」と思った説")}${item(d, "hikkakari", "ひっかかったところ")}
        <div class="tc-row"><span>来週までにやる一歩（方法：${esc(methodOf(d.ippo) || "—")}）</span><b>${esc(d.ippo || "—")}</b></div>
        ${item(d, "ippoDate", "やる日")}${item(d, "yosou", "予想")}
        <div class="tc-row"><span>Geminiのチャット</span><b>${linkCell(d.geminiLink)}</b></div>`;
    },
    csvHead: ["入口", "テーマの例", "どこが気になった", "時間が溶けたもの", "語りだすと止まらないもの", "モヤっとしたこと", "やりたいこと", "なぜ気になる",
      "キーワード1", "キーワード2", "キーワード3", "本当？と思った説", "ひっかかったところ", "方法", "一歩", "やる日", "予想", "Geminiのリンク"],
    csvRow: r => {
      const d = r.note?.data || {};
      return [d.route === "B" ? "テーマの例" : d.route === "C" ? "やりたいこと" : "3つの質問", d.theme, d.themeWhere, d.odai1, d.odai2, d.odai3, d.yaritai, d.yaritaiWhy, d.kw1, d.kw2, d.kw3,
        d.setsu, d.hikkakari, methodOf(d.ippo), d.ippo, d.ippoDate, d.yosou, d.geminiLink];
    }
  },
  R01: {
    tab: MISSION, date: "2026-11-03", noStall: true, // 家でやるので「止まってる？」は出さない
    stepNames: ["記録"],
    head: ["説（第1回）", "やった？", "やったこと", "見たこと・数字", "感じたこと／やるとしたら", "言い切れないこと"],
    cells: r => {
      const d = r.note?.data || {}, s = r.l01?.data || {};
      return [esc(s.setsu || ""), didChip(d.did), esc(d.yatta || ""), esc(d.mita || ""),
        esc(d.did === "まだ" ? d.yarunara || "" : d.kanji || ""), esc(d.iikire || "")];
    },
    nowrap: [1],
    chips(rs) {
      const n = x => rs.filter(r => (r.note?.data?.did || "") === x).length;
      return rs.some(r => r.note)
        ? `<span class="hint">${MISSION}：</span><span class="mchip">やった <b>${n("やった")}</b></span><span class="mchip zero">まだ <b>${n("まだ")}</b></span>`
        : "";
    },
    detail(r) {
      const d = r.note?.data || {}, s = r.l01?.data || {};
      return `
        <div class="recap">${item(s, "setsu", "第1回の説")}${item(s, "ippo", MISSION)}${item(s, "yosou", "予想")}</div>
        ${resultRows(d)}`;
    },
    csvHead: ["説（第1回）", "一歩（第1回）", "予想（第1回）", "やった／まだ", "やったこと", "見たこと・数字", "感じたこと", "言い切れないこと", "やるとしたら"],
    csvRow: r => {
      const d = r.note?.data || {}, s = r.l01?.data || {};
      return [s.setsu, s.ippo, s.yosou, d.did, d.yatta, d.mita, d.kanji, d.iikire, d.yarunara];
    }
  },
  L02: {
    tab: "第2回", date: "2026-11-09",
    stepNames: ["班", "AI", "読む・？", "本・動画", "提出"],
    head: ["説（第1回）", "やった？", "友だちに言われたこと", "気になったこと（？）"],
    cells: r => {
      const d = r.note?.data || {}, s = r.l01?.data || {};
      return [esc(s.setsu || ""), didChip(r.r01?.data?.did), esc(d.tomo || ""), qsOf(d).map(esc).join("<br>")];
    },
    nowrap: [1],
    chips(rs) {
      return rs.some(r => r.note)
        ? `<span class="hint">「？」を1つ以上：</span><span class="mchip">${rs.filter(r => qsOf(r.note?.data || {}).length).length}人</span>`
        : "";
    },
    detail(r) {
      const d = r.note?.data || {}, s = r.l01?.data || {}, qs = qsOf(d);
      return `
        <div class="recap">${item(s, "setsu", "第1回の説")}${item(s, "ippo", MISSION)}${item(s, "yosou", "予想")}</div>
        ${resultRows(r.r01?.data || {})}${item(d, "tomo", "友だちに言われたこと")}
        <div class="tc-row"><span>気になったこと</span><b>${qs.length ? `<ul class="qs">${qs.map(q => `<li>${esc(q)}</li>`).join("")}</ul>` : "—"}</b></div>
        <div class="tc-row"><span>読んだ記事</span><b>${linksCell(listOf(d, "kiji")) || "—"}</b></div>
        <div class="tc-row"><span>見る動画</span><b>${linksCell(listOf(d, "douga")) || "—"}</b></div>
        <div class="tc-row"><span>読む本</span><b>${listOf(d, "honTitle").map(esc).join("<br>") || "—"}</b></div>`;
    },
    csvHead: ["説（第1回）", "やった／まだ", "友だちに言われたこと", "気になったこと1", "気になったこと2", "気になったこと3", "読んだ記事1", "読んだ記事2", "読んだ記事3", ...nCols("見る動画"), ...nCols("読む本")],
    csvRow: r => {
      const d = r.note?.data || {}, s = r.l01?.data || {};
      return [s.setsu, r.r01?.data?.did, d.tomo, d.q1, d.q2, d.q3, d.kiji || "", d.kiji2 || "", d.kiji3 || "", ...nVals(d, "douga"), ...nVals(d, "honTitle")];
    }
  },
  R02: {
    tab: quest(2), date: "2026-11-10", noStall: true, // 家でやるので「止まってる？」は出さない
    stepNames: ["記録"],
    head: ["気になったこと（第2回）", "見た動画", "読んだ本", "心に残った所・ひとこと"],
    cells: r => {
      const d = r.note?.data || {};
      return [qsOf(r.l02?.data || {}).map(esc).join("<br>"), linksCell(listOf(d, "douga")), listOf(d, "honTitle").map(esc).join("<br>"), esc(d.kokoro || "")];
    },
    nowrap: [1],
    chips(rs) {
      const has = k => rs.filter(r => pickKind(r.note?.data || {}).includes(k)).length;
      return rs.some(r => pickKind(r.note?.data || {}))
        ? `<span class="hint">${quest(2)}：</span><span class="mchip">動画 <b>${has("動画")}</b></span><span class="mchip">本 <b>${has("本")}</b></span>`
        : "";
    },
    detail(r) {
      const d = r.note?.data || {}, qs = qsOf(r.l02?.data || {});
      return `
        <div class="recap"><div class="tc-row"><span>第2回で気になったこと</span><b>${qs.length ? `<ul class="qs">${qs.map(q => `<li>${esc(q)}</li>`).join("")}</ul>` : "—"}</b></div></div>
        <div class="tc-row"><span>見た動画</span><b>${listOf(d, "douga").map(u => `${linkCell(u)} <span class="hint">${esc(u)}</span>`).join("<br>") || "—"}</b></div>
        <div class="tc-row"><span>読んだ本（ISBN）</span><b>${booksOf(d).map(b => `${esc(b.title)}${b.isbn ? `（${esc(b.isbn)}）` : ""}`).join("<br>") || "—"}</b></div>
        ${item(d, "kokoro", "いちばん心に残った所と、ひとこと")}`;
    },
    csvHead: ["気になったこと1（第2回）", "気になったこと2（第2回）", "気になったこと3（第2回）", "本か動画", ...nCols("見た動画"), ...nCols("読んだ本"), ...nCols("ISBN"), "心に残った所・ひとこと"],
    csvRow: r => {
      const d = r.note?.data || {}, q = r.l02?.data || {};
      return [q.q1, q.q2, q.q3, pickKind(d), ...nVals(d, "douga"), ...nVals(d, "honTitle"), ...nVals(d, "isbn"), d.kokoro];
    }
  },
  L03: {
    tab: "第3回", date: "2026-11-16",
    stepNames: ["班", "RefNavi", "研究を探す", "提出"],
    head: ["本か動画（Quest 2）", "RefNavi", "論文①", "論文②", "試した検索語"],
    cells: r => {
      const d = r.note?.data || {}, ps = papersOf(d);
      return [pickKind(r.r02?.data || {}) ? `<span class="mchip">${pickKind(r.r02?.data || {})}</span>` : "", refCell(d), paperCell(ps[0]), paperCell(ps[1]), esc(d.tried || "")];
    },
    nowrap: [0, 1],
    chips(rs) {
      const n = k => rs.filter(r => r.note && papersOf(r.note.data || {}).length === k).length;
      return rs.some(r => r.note)
        ? `<span class="hint">RefNavi：</span><span class="mchip">登録できた <b>${rs.filter(r => refDone(r.note?.data || {})).length}</b></span><span class="hint">決めた論文：</span><span class="mchip">2本 <b>${n(2)}</b></span><span class="mchip">1本 <b>${n(1)}</b></span><span class="mchip zero">0本 <b>${n(0)}</b></span>`
        : "";
    },
    detail(r) {
      const d = r.note?.data || {}, ps = papersOf(d), q = r.r02?.data || {};
      return `
        <div class="recap">${item(r.l01?.data || {}, "setsu", "第1回の説")}<div class="tc-row"><span>${quest(2)}：見たもの・読んだもの</span><b>${pickCell(q) || "—"}</b></div>${item(q, "kokoro", "心に残った所")}</div>
        ${item(d, "hanMemo", "班で出たこと")}
        <div class="tc-row"><span>RefNavi</span><b>${REF_LABELS.filter(([k]) => d[k]).map(([, l]) => esc(l)).join("・") || "—"}</b></div>
        <div class="tc-row"><span>参考文献リスト</span><b>${esc(d.sanko || "—").replace(/\n/g, "<br>")}</b></div>
        ${item(d, "tried", "試した検索語")}
        ${ps.map((p, j) => `<div class="tc-row"><span>論文${j ? "②" : "①"}</span><b>${paperCell(p)}</b></div>`).join("") || `<div class="tc-row"><span>論文</span><b>—</b></div>`}
        `;
    },
    csvHead: ["試した検索語", "論文1のURL", "論文1のDOI", "論文2のURL", "論文2のDOI", "参考文献リスト", "班で出たこと", ...REF_LABELS.map(([, l]) => "RefNavi：" + l)],
    csvRow: r => {
      const d = r.note?.data || {};
      return [d.tried, d.p1Url, d.p1Doi, d.p2Url, d.p2Doi, d.sanko, d.hanMemo, ...REF_LABELS.map(([k]) => d[k] ? "○" : "")];
    }
  },
  R03: {
    tab: quest(3), date: "2026-11-17", noStall: true, // 家でやるので「止まってる？」は出さない
    stepNames: ["記録"],
    head: ["論文①", "論文②（③）", "分かったこと", "まだ分かっていないこと"],
    cells: r => {
      const d = r.note?.data || {}, s = paperSlots({ ...(d.fromL03 ? d : r.l03?.data || {}), yomi1: d.yomi1, yomi2: d.yomi2, yomi3: d.yomi3, p3Url: d.p3Url, p3Doi: d.p3Doi });
      const cell = p => p.url ? `${yomiChip(p.yomi)} ${paperCell(p)}` : "";
      return [cell(s[0]), [cell(s[1]), s[2].url ? `③ ${cell(s[2])}` : ""].filter(Boolean).join("<br>"), br(memoText(d, "wakatta")), br(memoText(d, "mada"))];
    },
    nowrap: [],
    chips(rs) {
      const n = rs.filter(r => r.note?.data?.yomi1 === "全部読んだ").length;
      const n2 = rs.filter(r => r.note?.data?.yomi2 === "全部読んだ").length;
      return rs.some(r => r.note)
        ? `<span class="hint">全部読んだ：</span><span class="mchip">論文① <b>${n}</b></span><span class="mchip">論文② <b>${n2}</b></span>`
        : "";
    },
    detail(r) {
      const d = r.note?.data || {}, qs = qsOf(d);
      const ps = paperSlots({ ...(d.fromL03 ? d : r.l03?.data || {}), yomi1: d.yomi1, yomi2: d.yomi2, yomi3: d.yomi3, p3Url: d.p3Url, p3Doi: d.p3Doi }).filter(p => p.url);
      return `
        <div class="recap">${ps.map(p => `<div class="tc-row"><span>論文${p.no}（${esc(p.yomi || "—")}）</span><b>${paperCell(p)}</b></div>`).join("") || `<div class="tc-row"><span>論文</span><b>—</b></div>`}</div>
        ${memoItem(d, "wakatta", "分かったこと")}${memoItem(d, "mada", "まだ分かっていないこと")}
        <div class="tc-row"><span>気になったこと</span><b>${qs.length ? `<ul class="qs">${qs.map(q => `<li>${esc(q)}</li>`).join("")}</ul>` : "—"}</b></div>
        <div class="tc-row"><span>参考文献リスト</span><b>${esc(d.sanko || r.l03?.data?.sanko || "—").replace(/\n/g, "<br>")}</b></div>`;
    },
    csvHead: ["論文1のURL", "論文1を読んだか", "論文2のURL", "論文2を読んだか", "論文1：分かったこと", "論文1：まだ分かっていないこと", "論文2：分かったこと", "論文2：まだ分かっていないこと", "論文3のURL", "論文3を読んだか", "論文3：分かったこと", "論文3：まだ分かっていないこと", "気になったこと1", "気になったこと2", "気になったこと3", "参考文献リスト"],
    csvRow: r => {
      const d = r.note?.data || {}, l = d.fromL03 ? d : r.l03?.data || {}; // 論文は Quest 3 で変えられる（11/7）
      return [l.p1Url, d.yomi1, l.p2Url, d.yomi2, d.wakatta, d.mada, d.wakatta2, d.mada2, d.p3Url, d.yomi3, d.wakatta3, d.mada3, d.q1, d.q2, d.q3, d.sanko || r.l03?.data?.sanko];
    }
  },
  L04: {
    tab: "第4回", date: "2026-12-07",
    stepNames: ["問いを出す", "AIで広げる", "7種類に分ける", "1つ選ぶ", "計画", "AIに見せる", "提出"],
    head: ["問いの数", "選んだ問い", "調べ方", "確かめること", "予定"],
    cells: r => {
      const d = r.note?.data || {}, qs = qsList(d), own = qs.filter(q => !q.a).length;
      const k = qs.find(q => q.t === d.toi)?.k;
      return [qs.length ? `${own}${qs.length > own ? `<span class="hint">＋AI ${qs.length - own}</span>` : ""}` : "",
        `${esc(d.toi || "")}${k ? ` <span class="mchip">${esc(k)}</span>` : ""}`,
        d.houhou ? `<span class="mchip">${esc(d.houhou)}</span>` : "", esc(d.nani || ""), esc(d.yotei || "")];
    },
    nowrap: [0, 2],
    chips(rs) {
      const names = ["文献・データ", "アンケート", "インタビュー", "観察", "実験・制作"];
      const count = n => rs.filter(r => r.note?.data?.houhou === n).length;
      const ns = rs.map(r => qsList(r.note?.data || {}).filter(q => !q.a).length).filter(n => n > 0);
      const avg = ns.length ? (ns.reduce((a, b) => a + b, 0) / ns.length).toFixed(1) : "";
      return rs.some(r => r.note)
        ? `${avg ? `<span class="hint">問いの数（自分で出した）：</span><span class="mchip">平均 <b>${avg}</b></span><span class="mchip">最多 <b>${Math.max(...ns)}</b></span>` : ""}` +
          `<span class="hint">調べ方：</span>${names.map(n => `<span class="mchip ${count(n) ? "" : "zero"}">${n} <b>${count(n)}</b></span>`).join("")}`
        : "";
    },
    detail(r) {
      const d = r.note?.data || {}, q = r.r03?.data || {}, qs = qsList(d);
      return `
        <div class="recap">${memoItem(q, "wakatta", `${quest(3)}：分かったこと`)}${memoItem(q, "mada", "まだ分かっていないこと")}</div>
        <div class="tc-row"><span>出した問い（${qs.length}個・チャレンジ${esc(d.rounds || 0)}回）</span><b>${qs.length ? `<ul class="qs">${qs.map(x => `<li>${esc(x.t)}${x.k ? ` <span class="mchip">${esc(x.k)}</span>` : ""}${x.a ? ` <span class="hint">AI</span>` : ""}</li>`).join("")}</ul>` : "—"}</b></div>
        ${item(d, "toi", "選んだ問い")}${item(d, "toiWhy", "選んだわけ")}
        ${item(d, "yosou", "予想")}
        <div class="tc-row"><span>問いへの答え</span><b>${[d.sudeni && `もう調べられていそう：${esc(d.sudeni)}`, d.kakame && `確かめたい：${esc(d.kakame)}`, d.aite && `相手：${esc(d.aite)}`].filter(Boolean).join("／") || "—"}</b></div>
        ${item(d, "houhou", "調べ方")}${item(d, "houhou2", "あわせて使う調べ方")}${item(d, "nani", "確かめること")}${item(d, "yotei", "予定")}
        ${item(d, "hitsuyou", "必要なもの・人")}${item(d, "kuraberu", "比べるもの")}${item(d, "anzen", "気をつけること（安全・倫理）")}
        <div class="tc-row"><span>Geminiのチャット</span><b>${linkCell(d.geminiLink)}</b></div>`;
    },
    csvHead: ["出した問い（種類）", "問いの数", "うちAI", "チャレンジ回数", "選んだ問い", "選んだわけ", "予想", "もう調べられていそう", "確かめたい", "相手", "調べ方", "あわせて使う調べ方", "確かめること", "予定", "必要なもの・人", "比べるもの", "気をつけること", "Geminiのリンク"],
    csvRow: r => {
      const d = r.note?.data || {}, qs = qsList(d);
      return [qs.map(x => `${x.t}（${x.k || "未分類"}${x.a ? "・AI" : ""}）`).join(" / "), qs.length, qs.filter(x => x.a).length, d.rounds || 0,
        d.toi, d.toiWhy, d.yosou, d.sudeni, d.kakame, d.aite, d.houhou, d.houhou2, d.nani, d.yotei, d.hitsuyou, d.kuraberu, d.anzen, d.geminiLink];
    }
  }
};
const LESSON_IDS = Object.keys(VIEWS);
const prevOf = id => LESSON_IDS[LESSON_IDS.indexOf(id) - 1] || null; // 1つ前のステージ（これを出すと次が開く）
// 進み具合。kind：done＝提出済み／work＝途中／none＝開いていない／prev＝前のステージが未提出
function stageStatus(id, n, before) {
  if (!n) {
    if (!prevOf(id)) return { label: "ログインのみ", cls: "st-none", stall: false, kind: "none" };
    return before?.submitted
      ? { label: "未着手", cls: "st-none", stall: false, kind: "none" }
      : { label: "前が未提出", cls: "st-none", stall: false, kind: "prev" };
  }
  if (n.submitted) return { label: "提出済み", cls: "st-done", stall: false, kind: "done" };
  const V = VIEWS[id], step = n.step ?? 0;
  const mins = n.updatedAt ? (Date.now() - n.updatedAt.getTime()) / 60000 : 0;
  return { label: `${step + 1}. ${V.stepNames[step] ?? ""}`, cls: "st-work", stall: !V.noStall && mins >= STALL_MIN, kind: "work" };
}
const range = n => Array.from({ length: n }, (_, i) => i + 1);
const dupsOf = nums => [...new Set(nums.filter((n, i, a) => a.indexOf(n) !== i))];
function lessonForToday() {
  const today = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD（端末の日付）
  return [...LESSON_IDS].reverse().find(id => VIEWS[id].date <= today) || LESSON_IDS[0];
}

export function mountTeacher({ be, app, dlg }) {
  const k1 = firstYearKi();
  const KIS = [k1, String(k1 - 1), String(k1 - 2), ""]; // 1年・2年・3年・期なし
  let ki = KIS.includes(lsGet("gcis_t_ki") ?? "x") ? lsGet("gcis_t_ki") : k1;
  let cls = Number(lsGet("gcis_t_cls") ?? 1);
  if (![GRADE, ...CLASSES, TEST_CLASS].includes(cls)) cls = 1;
  let lesson = lessonForToday(); // 回は保存しない（授業日に合わせて開く）
  let unwatch = null, students = [], notes = [];
  // 学年まとめ：{ students, notes, at（読み込んだ時刻）, lessons（読んだ回）, loading, error }
  let grade = null, gradeToken = 0;
  const view = () => VIEWS[lesson];

  function renderShell() {
    const tabs = [GRADE, ...CLASSES, TEST_CLASS].map(c =>
      `<button class="tab ${c === cls ? "on" : ""}" data-cls="${c}">${classLabel(c)}</button>`).join("");
    const kiOpts = KIS.map((k, i) =>
      `<option value="${k}" ${k === ki ? "selected" : ""}>${kiLabel(k)}${i < 3 && k ? `（いまの${i + 1}年）` : ""}</option>`).join("");
    app.innerHTML = `
      <section class="card">
        <div class="t-head">
          <div class="tabs"><select id="ki" class="ki" ${cls === TEST_CLASS ? "disabled" : ""}>${kiOpts}</select>${tabs}</div>
          <div class="t-actions"><span class="lesson-tabs">${LESSON_IDS.map(id =>
            `<button class="tab ${id === lesson ? "on" : ""}" data-lesson="${id}">${VIEWS[id].tab}</button>`).join("")}</span><button class="btn ghost small" id="csv">CSVで保存</button></div>
        </div>
        ${cls === TEST_CLASS ? `<p class="hint">テスト：期を問わず表示します（アドレス順）。先生が「生徒画面へ」で入力したものもここに出ます。</p>` : ""}
        ${cls === GRADE ? `<p class="hint">学年まとめ：選んだ回を出せていない人（まだログインしていない人も含む）を、1人1行でクラス・番号順に出します。自動では更新しないので、最新にするときは「読み直す」。クラス名を押すとそのクラスの表に移ります。</p>` : ""}
        <div id="summary" class="summary"></div>
        <div id="methods" class="methods"></div>
        <div id="table"></div>
        <div id="missing" class="missing"></div>
      </section>`;
    app.querySelectorAll("[data-cls]").forEach(b => b.onclick = () => {
      cls = Number(b.dataset.cls); lsSet("gcis_t_cls", String(cls)); renderShell(); watch();
    });
    app.querySelectorAll("[data-lesson]").forEach(b => b.onclick = () => {
      lesson = b.dataset.lesson; renderShell();
      if (cls === GRADE) loadGrade(); else renderTable();
    });
    document.getElementById("ki").onchange = e => { ki = e.target.value; lsSet("gcis_t_ki", ki); watch(); };
    document.getElementById("csv").onclick = downloadCsv;
  }

  function rows() {
    const by = id => Object.fromEntries(notes.filter(n => n.lesson === id).map(n => [n.uid, n]));
    const cur = by(lesson), all = Object.fromEntries(LESSON_IDS.map(id => [id, by(id)]));
    const rs = students.map(s => ({ ...s, note: cur[s.uid] || null,
      ...Object.fromEntries(LESSON_IDS.map(id => [id.toLowerCase(), all[id][s.uid] || null])) })); // r.l01・r.r01・r.l02 …
    return cls === TEST_CLASS
      ? rs.sort((a, b) => String(a.email).localeCompare(String(b.email)))
      : rs.sort((a, b) => a.number - b.number);
  }

  const status = r => stageStatus(lesson, r.note, prevOf(lesson) ? r[prevOf(lesson).toLowerCase()] : null);

  const fmtTime = d => d ? d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) : "—";
  const numCell = r => cls === TEST_CLASS ? escapeHtml(r.number ? `${r.number}番` : "教員") : r.number;

  function renderTable() {
    if (!document.getElementById("table")) return;
    if (cls === GRADE) { renderGrade(); return; }
    const size = classSize(ki, cls);
    const rs = rows();
    const submitted = rs.filter(r => r.note?.submitted).length;
    const stalled = rs.filter(r => status(r).stall).length;
    document.getElementById("summary").innerHTML = `
      <div class="sum"><b>${rs.length}</b><span>ログイン${cls === TEST_CLASS ? "" : ` / ${size}`}</span></div>
      <div class="sum"><b>${submitted}</b><span>提出済み</span></div>
      <div class="sum warn"><b>${stalled}</b><span>${view().noStall ? "（家でやるので数えない）" : `${STALL_MIN}分以上止まってる？`}</span></div>`;

    document.getElementById("methods").innerHTML = view().chips(rs);

    if (!rs.length) {
      document.getElementById("table").innerHTML = `<p class="hint">まだ誰もログインしていません。</p>`;
    } else {
      document.getElementById("table").innerHTML = `
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>${cls === TEST_CLASS ? "アドレス" : "番号"}</th><th>進み具合</th>${view().head.map(h => `<th>${h}</th>`).join("")}<th>更新</th></tr></thead>
          <tbody>${rs.map(r => {
            const st = status(r), V = view();
            return `<tr data-uid="${r.uid}" class="${st.stall ? "stall" : ""}">
              ${cls === TEST_CLASS ? `<td class="addr-cell">${escapeHtml(r.email || "")}</td>` : `<td class="num">${numCell(r)}</td>`}
              <td><span class="st ${st.cls}">${st.label}</span>${st.stall ? ` <span class="st st-stall">止まってる？</span>` : ""}</td>
              ${V.cells(r).map((c, i) => `<td class="${V.nowrap.includes(i) ? "nowrap" : ""}">${c}</td>`).join("")}
              <td class="nowrap">${fmtTime(r.note?.updatedAt)}</td></tr>`;
          }).join("")}</tbody></table></div>`;
      app.querySelectorAll("tr[data-uid]").forEach(tr => tr.onclick = () => showDetail(tr.dataset.uid));
    }

    const box = document.getElementById("missing");
    if (cls === TEST_CLASS) { box.innerHTML = ""; return; }
    const have = new Set(rs.map(r => r.number));
    const miss = range(size).filter(n => !have.has(n));
    box.innerHTML = miss.length ? `<b>まだログインしていない番号：</b>${miss.join("、")}` : `<b>全員ログインしています ✓</b>`;
    const dup = dupsOf(rs.map(r => r.number));
    if (dup.length) box.innerHTML += `<p class="error">番号が重なっています：${dup.join("、")}番（入力ミスの可能性）</p>`;
    const extra = rs.map(r => r.number).filter(n => n > size);
    if (extra.length) box.innerHTML += `<p class="error">${size}番より大きい番号：${[...new Set(extra)].join("、")}番（入力ミスの可能性）</p>`;
  }

  // ---------- 学年まとめ ----------
  async function loadGrade() {
    const my = ++gradeToken, lessons = [prevOf(lesson), lesson].filter(Boolean);
    grade = { ...(grade || {}), loading: true, error: "" };
    renderGrade();
    try {
      const g = be.demo
        ? (() => { const all = CLASSES.map(c => demoData(c)); return { students: all.flatMap(x => x[0]), notes: all.flatMap(x => x[1]) }; })()
        : await be.getGrade({ ki }, lessons);
      if (my !== gradeToken) return;
      grade = { ...g, lessons, at: new Date(), loading: false, error: "" };
    } catch (e) {
      console.error(e);
      if (my !== gradeToken) return;
      grade = { students: [], notes: [], lessons, at: null, loading: false,
        error: "読み込めません（権限エラー）。先生のアカウント（@soka.ed.jp）か、Firestoreのルールが最新か確認してください。" };
    }
    renderGrade();
  }

  // クラスごと：人数・ログインした人（進み具合つき）・まだログインしていない番号・重なり・大きすぎる番号
  function gradeRows() {
    const by = id => Object.fromEntries((grade?.notes || []).filter(n => n.lesson === id).map(n => [n.uid, n]));
    const cur = by(lesson), bef = prevOf(lesson) ? by(prevOf(lesson)) : {};
    return CLASSES.map(c => {
      const size = classSize(ki, c);
      const people = (grade?.students || []).filter(s => s.class === c).sort((a, b) => a.number - b.number)
        .map(s => ({ ...s, st: stageStatus(lesson, cur[s.uid] || null, bef[s.uid] || null) }));
      const have = new Set(people.map(p => p.number));
      return {
        c, size, people,
        miss: range(size).filter(n => !have.has(n)),
        dup: dupsOf(people.map(p => p.number)),
        extra: [...new Set(people.map(p => p.number).filter(n => n > size))]
      };
    });
  }

  function renderGrade() {
    const sum = document.getElementById("summary"), tbl = document.getElementById("table");
    const mth = document.getElementById("methods"), box = document.getElementById("missing");
    if (!tbl || cls !== GRADE) return;
    box.innerHTML = "";
    const at = grade?.at ? grade.at.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) : "";
    mth.innerHTML = `<span class="hint">${grade?.loading ? "読み込み中…" : at ? `${at} に読み込み` : ""}</span>
      <button class="btn ghost small" id="reload" ${grade?.loading ? "disabled" : ""}>読み直す</button>
      ${grade?.at && !grade?.error && gradeList().length ? `<button class="btn ghost small" id="slips">出せていない人の個票を印刷</button>` : ""}`;
    document.getElementById("reload").onclick = loadGrade;
    const sb = document.getElementById("slips"); if (sb) sb.onclick = printSlips;
    if (grade?.error) { sum.innerHTML = ""; tbl.innerHTML = `<p class="error">${esc(grade.error)}</p>`; return; }
    if (!grade?.at) { sum.innerHTML = ""; tbl.innerHTML = ""; return; }

    const gs = gradeRows(), V = view();
    const total = gs.reduce((a, g) => a + g.size, 0);
    const login = gs.reduce((a, g) => a + g.people.length, 0);
    const done = gs.reduce((a, g) => a + g.people.filter(p => p.st.kind === "done").length, 0);
    const miss = gs.reduce((a, g) => a + g.miss.length, 0);
    sum.innerHTML = `
      <div class="sum"><b>${login}</b><span>ログイン / ${total}</span></div>
      <div class="sum"><b>${done}</b><span>${esc(V.tab)}を提出済み</span></div>
      <div class="sum warn"><b>${login - done}</b><span>ログインしたが未提出</span></div>
      <div class="sum warn"><b>${miss}</b><span>まだログインしていない</span></div>`;

    // 出せていない人を1人1行で：クラス・番号・いまの状況（まだログインしていない人も含める）
    const fmtWhen = d => d ? d.toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
    const list = gradeList(gs);
    const warns = gs.flatMap(g => [
      g.dup.length ? `${classLabel(g.c)}：番号が重なっています（${g.dup.join("、")}番）` : "",
      g.extra.length ? `${classLabel(g.c)}：${g.size}番より大きい番号（${g.extra.join("、")}番）` : ""
    ]).filter(Boolean);

    tbl.innerHTML = list.length ? `
      <div class="tbl-wrap"><table class="tbl g-tbl">
        <thead><tr><th>クラス</th><th>番号</th><th>いまの状況（${esc(V.tab)}）</th><th>最後に書いた時刻</th></tr></thead>
        <tbody>${list.map(x => `<tr>
          <td class="nowrap"><button class="tab small" data-goto="${x.c}">${classLabel(x.c)}</button></td>
          <td class="num">${esc(x.number)}</td>
          <td><span class="st ${x.stc}">${esc(x.label)}</span></td>
          <td class="nowrap">${x.kind === "work" ? fmtWhen(x.when) : ""}</td></tr>`).join("")}</tbody></table></div>`
      : `<p class="hint">全員が${esc(V.tab)}を提出しています ✓</p>`;
    box.innerHTML = warns.map(t => `<p class="error">${t}（入力ミスの可能性）</p>`).join("");
    tbl.querySelectorAll("[data-goto]").forEach(b => b.onclick = () => {
      cls = Number(b.dataset.goto); lsSet("gcis_t_cls", String(cls)); renderShell(); watch();
    });
  }

  // 出せていない人の一覧（画面の表と個票で共通）
  function gradeList(gs = gradeRows()) {
    const order = { miss: 0, prev: 1, none: 2, work: 3 };
    return gs.flatMap(g => [
      ...g.miss.map(n => ({ c: g.c, number: n, kind: "miss", label: "まだログインしていない", stc: "st-miss" })),
      ...g.people.filter(p => p.st.kind !== "done").map(p => ({ c: g.c, number: p.number, uid: p.uid, kind: p.st.kind,
        label: p.st.kind === "work" ? `途中：${p.st.label}` : p.st.label, stc: p.st.cls,
        when: p.st.kind === "work" ? (grade.notes.find(n => n.uid === p.uid && n.lesson === lesson)?.updatedAt || null) : null }))
    ]).sort((a, b) => a.c - b.c || a.number - b.number || order[a.kind] - order[b.kind]);
  }

  // 個票：出せていない人に「提出してね」の紙を配る（A4に10枚・切り取り線つき）。名前・アドレスは載せない
  function printSlips() {
    const list = gradeList(); if (!list.length) return;
    const tab = view().tab, prevTab = prevOf(lesson) ? VIEWS[prevOf(lesson)].tab : "";
    const at = grade.at.toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
    const url = "gcis-note.web.app"; // 開発版で印刷しても、生徒には本番の入口を案内する
    const now = x => x.kind === "miss" ? "まだ探究ノートにログインしていないようです。"
      : x.kind === "prev" ? `先に「${prevTab}」を提出すると、ホームに「${tab}」が出ます。`
      : x.kind === "work" ? (view().stepNames.length > 1 ? `「${x.label.replace(/^途中：/, "")}」まで進んでいます。続きからでOK！` : "書きかけになっています。続きからでOK！")
      : `「${tab}」をまだ始めていないようです。`;
    const slip = x => `<div class="slip" data-c="${x.c}">
        <div class="who"><b>${esc(classLabel(x.c))} ${esc(x.number)}番</b> さんへ</div>
        <h2>探究ノート「${esc(tab)}」を提出してね</h2>
        <p class="now">${esc(now(x))}</p>
        <ol><li>Classroom のリンクから開く（<b>${url}</b>）</li>
          <li>学校のアカウントでログイン${x.kind === "miss" ? "して、クラスと番号を入れる" : ""}</li>
          <li>${x.kind === "prev" ? `「${esc(prevTab)}」を提出 → 「${esc(tab)}」も書いて提出` : `ホームの「${esc(tab)}」を書いて「提出する」`}</li></ol>
        <div class="foot"><span class="due">締め切り：<span class="due-v"></span></span><span class="at">${esc(at)} 時点<br>行き違いならごめんね</span></div>
      </div>`;
    const w = window.open("", "_blank");
    if (!w) { alert("新しいタブを開けませんでした。ポップアップを許可してから、もう一度押してください。"); return; }
    w.document.write(`<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>${esc(tab)} 個票（${list.length}枚）</title><style>
      @page { size: A4; margin: 8mm; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", sans-serif; color: #111; }
      .bar { position: sticky; top: 0; background: #f4f4f0; border-bottom: 1px solid #ccc; padding: 10px 14px; display: flex; gap: 16px; align-items: center; flex-wrap: wrap; font-size: 14px; }
      .bar input[type=text] { font-size: 14px; padding: 4px 8px; width: 12em; }
      .bar button { font-size: 15px; padding: 6px 16px; font-weight: bold; cursor: pointer; }
      .sheet { width: 194mm; margin: 12px auto; display: grid; grid-template-columns: 1fr 1fr; }
      .slip { height: 55mm; padding: 4mm 5mm; border: 1px dashed #999; margin: -0.5px 0 0 -0.5px; display: flex; flex-direction: column; break-inside: avoid; }
      .who { font-size: 13pt; } .who b { font-size: 15pt; }
      h2 { font-size: 13pt; margin: 1.5mm 0; }
      .now { font-size: 9.5pt; margin: 0 0 1mm; line-height: 1.4; }
      ol { font-size: 9.5pt; margin: 0; padding-left: 5mm; line-height: 1.45; }
      .foot { margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; gap: 3mm; font-size: 7.5pt; color: #555; }
      .due { font-size: 10pt; color: #111; white-space: nowrap; } .due-v { display: inline-block; min-width: 26mm; border-bottom: 1px solid #111; }
      .at { text-align: right; }
      .by-class .sheet + .sheet { break-before: page; }
      body.nobrk .by-class, body:not(.nobrk) .all { display: none; }
      @media print { .bar { display: none; } .sheet { margin: 0 auto; } }
    </style></head><body>
      <div class="bar"><span><b>${list.length}枚</b>（${esc(tab)}・${esc(at)} 時点）</span>
        <label>締め切り <input type="text" id="due" placeholder="例：11/9（月）の朝"></label>
        <label><input type="checkbox" id="brk"> クラスごとに改ページ</label>
        <button id="go">印刷する</button></div>
      <div class="all"><div class="sheet">${list.map(slip).join("")}</div></div>
      <div class="by-class">${[...new Set(list.map(x => x.c))].map(c => `<div class="sheet">${list.filter(x => x.c === c).map(slip).join("")}</div>`).join("")}</div>
    </body></html>`);
    w.document.close();
    const d = w.document;
    d.body.classList.add("nobrk");
    d.getElementById("due").oninput = e => d.querySelectorAll(".due-v").forEach(s => s.textContent = e.target.value);
    d.getElementById("brk").onchange = e => d.body.classList.toggle("nobrk", !e.target.checked);
    d.getElementById("go").onclick = () => w.print();
  }

  // 学年まとめのCSV：画面と同じく、出せていない人を1人1行（まだログインしていない人も含む）
  function gradeCsvLines() {
    return gradeRows().flatMap(g => [
      ...g.miss.map(n => ({ n, email: "", label: "まだログインしていない" })),
      ...g.people.filter(p => p.st.kind !== "done").map(p => ({ n: p.number, email: p.email,
        label: p.st.kind === "work" ? `途中：${p.st.label}` : p.st.label }))
    ].sort((a, b) => a.n - b.n).map(x => [kiLabel(ki), classLabel(g.c), x.n, x.label, x.email]));
  }

  function showDetail(uid) {
    const r = rows().find(x => x.uid === uid); if (!r) return;
    dlg.innerHTML = `
      <div class="dlg">
        <div class="dlg-head"><h3>${r.class === TEST_CLASS ? "テスト" : `${kiLabel(r.ki)} ${classLabel(r.class)} ${r.number}番`}　${view().tab}</h3><button class="btn ghost small" id="close">閉じる</button></div>
        <p class="hint">${escapeHtml(r.email || "")}</p>
        <div class="themecard">${view().detail(r)}</div>
      </div>`;
    dlg.showModal();
    document.getElementById("close").onclick = () => dlg.close();
  }

  const csvCell = s => `"${String(s ?? "").replace(/"/g, '""')}"`;
  function downloadCsv() {
    const V = view();
    if (cls === GRADE) {
      if (!grade?.at) return;
      const head = ["期", "クラス", "番号", `いまの状況（${V.tab}）`, "アドレス"];
      saveCsv([head, ...gradeCsvLines()], `${lesson}_${kiLabel(ki)}_出せていない人.csv`);
      return;
    }
    const head = ["期", "クラス", "番号", "アドレス", "進み具合", ...V.csvHead, "更新"];
    const lines = rows().map(r =>
      [kiLabel(r.ki), classLabel(r.class), r.number || "", r.email, status(r).label, ...V.csvRow(r),
        r.note?.updatedAt?.toLocaleString("ja-JP") || ""].map(csvCell).join(","));
    downloadText([head.map(csvCell).join(","), ...lines].join("\r\n"),
      cls === TEST_CLASS ? `${lesson}_テスト.csv` : `${lesson}_${kiLabel(ki)}_${classLabel(cls)}.csv`);
  }
  const saveCsv = (rowsArr, name) => downloadText(rowsArr.map(r => r.map(csvCell).join(",")).join("\r\n"), name);
  function downloadText(text, name) {
    const blob = new Blob(["\ufeff" + text], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function watch() {
    unwatch?.(); unwatch = null;
    if (cls === GRADE) { loadGrade(); return; }
    students = []; notes = []; renderTable();
    if (be.demo) { [students, notes] = demoData(); renderTable(); return; }
    unwatch = be.watchGroup({ ki, cls }, null, // すべてのステージ（第2回の表に第1回の説も出すため）
      s => { students = s; renderTable(); },
      n => { notes = n; renderTable(); },
      e => {
        console.error(e);
        const t = document.getElementById("table");
        if (t) t.innerHTML = `<p class="error">読み込めません（権限エラー）。先生のアカウント（@soka.ed.jp）か、Firestoreのルールが最新か確認してください。</p>`;
      });
  }

  // デモ用の架空データ（実在の生徒ではありません）
  function demoData(cls0 = cls) {
    const cls = cls0;
    const ex = [
      ["完全に静かな部屋よりも、適度な雑音がある場所の方が没頭しやすい", "【やってみる】無音と、カフェの雑音を流したときで、15分ずつ同じ問題を解いて比べる"],
      ["画面を白黒にするだけで、スマホを見る時間が激減する", "【測る】3日はいつもどおり、3日は白黒にして、スクリーンタイムを記録する"],
      ["ご褒美をあげると、かえってやる気が下がることがある", "【聞く】部活の友だち3人に、ご褒美があるとやる気が上がるか下がるかを聞く"],
      ["夢中になりやすいのは、少し難しいくらいの課題", "【見に行く】昼休みの図書館で、集中している人がどんな席を選んでいるか見る"],
      ["", ""]
    ];
    const st = [], nt = [];
    const n = cls === TEST_CLASS ? 3 : 30;
    for (let i = 1; i <= n; i++) {
      const uid = "u" + i, e = ex[(i * 3) % ex.length];
      st.push(cls === TEST_CLASS
        ? { uid, ki: "", class: 0, number: i === 1 ? 0 : i, email: i === 1 ? "demo.teacher@soka.ed.jp" : `test${i}@example` }
        : { uid, ki, class: cls, number: i, email: `${ki}student${i}@example` });
      if (i % 7 === 0) continue;
      const step = i % 3 === 0 ? i % 4 : 4, sub = step === 4; // 第1回：多くは提出済み
      nt.push({ uid, lesson: "L01", step, submitted: sub, updatedAt: new Date(Date.now() - (i % 9) * 60000),
        data: { setsu: step >= 2 ? e[0] : "", hikkakari: step >= 2 ? "本当に？" : "", ippo: step >= 3 ? e[1] : "", ippoDate: step >= 3 ? "2026-11-05" : "", yosou: step >= 3 ? "（予想の例）" : "",
          kw1: i % 6 === 3 ? "" : "集中", route: i % 6 === 0 ? "B" : i % 6 === 3 ? "C" : "A", theme: i % 6 === 0 ? "「SNS」に対して、私たちはどう向き合っていくか？" : "",
          yaritai: i % 6 === 3 ? "（やりたいことの例）古着をリメイクして、自分のブランドを作ってみたい" : "" } });
      if (!sub || i % 4 === 0) continue;
      const mada = i % 5 === 1;
      nt.push({ uid, lesson: "R01", step: 0, submitted: i % 3 !== 2, updatedAt: new Date(Date.now() - (i % 8) * 60000),
        data: mada
          ? { did: "まだ", yarunara: "週末に、無音と雑音で15分ずつ問題を解く" }
          : { did: "やった", yatta: "（やったことの例）", mita: "（数字の例）", kanji: "予想どおりだったけど、歌詞のある曲だと逆に気が散った",
              iikire: "1回だけなので、毎日そうなるかは分からない" } });
      if (i % 3 === 2) continue;
      const s2 = i % 5 === 0 ? 4 : i % 5;
      nt.push({ uid, lesson: "L02", step: s2, submitted: s2 === 4 && i % 8 !== 7, updatedAt: new Date(Date.now() - (i % 8) * 60000),
        data: { tomo: s2 >= 1 ? "部活のあとでも同じ？" : "",
          q1: s2 >= 2 ? "なんで歌詞があると気が散るの？" : "", q2: s2 >= 2 && i % 2 ? "研究では、雑音の大きさはどこまで分かっている？" : "" } });
      if (!(s2 === 4 && i % 8 !== 7)) continue;
      nt.push({ uid, lesson: "R02", step: 0, submitted: i % 4 !== 1, updatedAt: new Date(Date.now() - (i % 8) * 60000),
        data: i % 10 === 0
          ? { douga: "https://youtu.be/xxxxxxxxxxx?t=125", kokoro: "（動画の例）2分05秒あたり。雑音の大きさで、集中しやすさが逆になるという話" }
          : { honTitle: "『（本の題名の例）』", isbn: "9784000000000", kokoro: "（本の例）p.48 音楽のテンポで作業の速さが変わるという実験" } });
      if (i % 4 === 1) continue;
      const s3 = i % 6 === 0 ? 2 : 3, two = i % 5 !== 0;
      nt.push({ uid, lesson: "L03", step: s3, submitted: s3 === 3, updatedAt: new Date(Date.now() - (i % 8) * 60000),
        data: { refLogin: 1, refDouga: i % 3 ? 1 : "", refHon: i % 2 ? 1 : "", tried: "雑音 集中 / noise concentration", p1Url: "https://www.jstage.jst.go.jp/article/example/a",
          p2Url: two ? "https://example.com/b" : "" } });
      if (s3 !== 3) continue;
      nt.push({ uid, lesson: "R03", step: 0, submitted: i % 3 !== 0, updatedAt: new Date(Date.now() - (i % 8) * 60000),
        data: { yomi1: i % 2 ? "全部読んだ" : "途中まで", yomi2: two ? (i % 3 ? "途中まで" : "全部読んだ") : "",
          wakatta: "（分かったことの例）大学生40人で、カフェ程度の音のときに作業が速かった", mada: "（まだ分かっていないことの例）高校生や、歌詞のある音楽の場合は調べていない", q1: "部活のあとでも同じ？", ...(two && i % 2 ? { wakatta2: "（論文②の例）小学生では差がなかった", mada2: "（論文②の例）中学生・高校生は調べていない" } : {}) } });
      if (i % 3 === 0) continue;
      const s4 = i % 4 === 2 ? 3 : 6;
      nt.push({ uid, lesson: "L04", step: s4, submitted: s4 === 6, updatedAt: new Date(Date.now() - (i % 8) * 60000),
        data: { qs: [{ t: "なんで雑音があると集中できるの？", k: "原因" }, { t: "高校生でも同じ？", k: "比較" }, { t: "どのくらいの音の大きさがいい？", k: "方法・関連性" },
            { t: "歌詞があるとなぜ気が散る？", k: "原因" }, ...Array.from({ length: i % 9 }, (_, j) => ({ t: `（問いの例${j + 1}）`, k: "影響" })), { t: "（AIの例）", k: "定義", a: 1 }], rounds: 1 + (i % 2),
          toi: s4 >= 3 ? "高校生でも、カフェ程度の音があると問題を速く解けるか？" : "", houhou: s4 === 6 ? ["実験・制作", "アンケート", "観察"][i % 3] : "",
          yosou: s4 === 6 ? "（予想の例）高校生も、カフェくらいの音があると速く解けると思う。" : "", kakame: s4 === 6 ? "条件で変わるか" : "", aite: s4 === 6 ? "人" : "", sudeni: s4 === 6 ? "わからない" : "",
          nani: s4 === 6 ? "（確かめることの例）" : "", yotei: s4 === 6 ? "（予定の例）冬休みに3日ずつ" : "", anzen: s4 === 6 ? "名前や連絡先は集めない。" : "" } });
    }
    return [st, nt];
  }

  renderShell(); watch();
  const tick = setInterval(renderTable, 30000); // 「止まってる？」表示を30秒ごとに更新
  return () => { unwatch?.(); clearInterval(tick); if (dlg.open) dlg.close(); };
}
