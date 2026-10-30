// 教員画面：期・クラス・回ごとの進み具合（リアルタイム）
import {
  escapeHtml, classLabel, kiLabel, firstYearKi, methodOf, lsGet, lsSet, MISSION,
  CLASSES, MAX_NUMBER, TEST_CLASS, METHODS
} from "./common.js";

const STALL_MIN = 5; // この分数以上更新がなく未提出なら「止まってる？」
const esc = escapeHtml;
const safeUrl = u => /^https:\/\//i.test(String(u || "").trim()) ? String(u).trim() : "";
const linkCell = u => safeUrl(u) ? `<a href="${esc(safeUrl(u))}" target="_blank" rel="noopener">開く ↗</a>` : esc(u || "—");
const item = (d, k, label) => `<div class="tc-row"><span>${label}</span><b>${esc(d[k] || "—")}</b></div>`;
const didChip = x => x === "やった" ? `<span class="mchip">やった</span>` : x === "まだ" ? `<span class="mchip zero">まだ</span>` : "";
function resultRows(d) {
  return d.did === "まだ"
    ? `<div class="tc-row"><span>${MISSION}</span><b>まだ</b></div>${item(d, "yarunara", "やるとしたら")}`
    : `<div class="tc-row"><span>${MISSION}</span><b>${esc(d.did || "—")}</b></div>${item(d, "yatta", "やったこと")}${item(d, "mita", "見たこと・数字")}${item(d, "kanji", "感じたこと")}${item(d, "iikire", "これだけでは言い切れないこと")}`;
}
const qsOf = d => ["q1", "q2", "q3"].map(k => String(d[k] || "").trim()).filter(Boolean);

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
    stepNames: ["班", "AI", "気になったこと", "提出"],
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
        <div class="tc-row"><span>Geminiのチャット</span><b>${linkCell(d.geminiLink)}</b></div>`;
    },
    csvHead: ["説（第1回）", "やった／まだ", "友だちに言われたこと", "気になったこと1", "気になったこと2", "気になったこと3", "Geminiのリンク"],
    csvRow: r => {
      const d = r.note?.data || {}, s = r.l01?.data || {};
      return [s.setsu, r.r01?.data?.did, d.tomo, d.q1, d.q2, d.q3, d.geminiLink];
    }
  }
};
const LESSON_IDS = Object.keys(VIEWS);
function lessonForToday() {
  const today = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD（端末の日付）
  return [...LESSON_IDS].reverse().find(id => VIEWS[id].date <= today) || LESSON_IDS[0];
}

export function mountTeacher({ be, app, dlg }) {
  const k1 = firstYearKi();
  const KIS = [k1, String(k1 - 1), String(k1 - 2), ""]; // 1年・2年・3年・期なし
  let ki = KIS.includes(lsGet("gcis_t_ki") ?? "x") ? lsGet("gcis_t_ki") : k1;
  let cls = Number(lsGet("gcis_t_cls") ?? 1);
  if (![...CLASSES, TEST_CLASS].includes(cls)) cls = 1;
  let lesson = lessonForToday(); // 回は保存しない（授業日に合わせて開く）
  let unwatch = null, students = [], notes = [];
  const view = () => VIEWS[lesson];

  function renderShell() {
    const tabs = [...CLASSES, TEST_CLASS].map(c =>
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
        <div id="summary" class="summary"></div>
        <div id="methods" class="methods"></div>
        <div id="table"></div>
        <div id="missing" class="missing"></div>
      </section>`;
    app.querySelectorAll("[data-cls]").forEach(b => b.onclick = () => {
      cls = Number(b.dataset.cls); lsSet("gcis_t_cls", String(cls)); renderShell(); watch();
    });
    app.querySelectorAll("[data-lesson]").forEach(b => b.onclick = () => { lesson = b.dataset.lesson; renderShell(); renderTable(); });
    document.getElementById("ki").onchange = e => { ki = e.target.value; lsSet("gcis_t_ki", ki); watch(); };
    document.getElementById("csv").onclick = downloadCsv;
  }

  function rows() {
    const by = id => Object.fromEntries(notes.filter(n => n.lesson === id).map(n => [n.uid, n]));
    const cur = by(lesson), l01 = by("L01"), r01 = by("R01");
    const rs = students.map(s => ({ ...s, note: cur[s.uid] || null, l01: l01[s.uid] || null, r01: r01[s.uid] || null }));
    return cls === TEST_CLASS
      ? rs.sort((a, b) => String(a.email).localeCompare(String(b.email)))
      : rs.sort((a, b) => a.number - b.number);
  }

  function status(r) {
    const n = r.note;
    if (!n) {
      if (lesson === "L01") return { label: "ログインのみ", cls: "st-none", stall: false };
      const before = { R01: r.l01, L02: r.r01 }[lesson];
      return { label: before?.submitted ? "未着手" : "前が未提出", cls: "st-none", stall: false };
    }
    if (n.submitted) return { label: "提出済み", cls: "st-done", stall: false };
    const mins = n.updatedAt ? (Date.now() - n.updatedAt.getTime()) / 60000 : 0;
    return { label: `${(n.step ?? 0) + 1}. ${view().stepNames[n.step ?? 0]}`, cls: "st-work", stall: !view().noStall && mins >= STALL_MIN };
  }

  const fmtTime = d => d ? d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) : "—";
  const numCell = r => cls === TEST_CLASS ? escapeHtml(r.number ? `${r.number}番` : "教員") : r.number;

  function renderTable() {
    if (!document.getElementById("table")) return;
    const rs = rows();
    const submitted = rs.filter(r => r.note?.submitted).length;
    const stalled = rs.filter(r => status(r).stall).length;
    document.getElementById("summary").innerHTML = `
      <div class="sum"><b>${rs.length}</b><span>ログイン${cls === TEST_CLASS ? "" : ` / ${MAX_NUMBER}`}</span></div>
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
    const miss = Array.from({ length: MAX_NUMBER }, (_, i) => i + 1).filter(n => !have.has(n));
    box.innerHTML = miss.length ? `<b>まだログインしていない番号：</b>${miss.join("、")}` : `<b>全員ログインしています ✓</b>`;
    const dup = rs.map(r => r.number).filter((n, i, a) => a.indexOf(n) !== i);
    if (dup.length) box.innerHTML += `<p class="error">番号が重なっています：${[...new Set(dup)].join("、")}番（入力ミスの可能性）</p>`;
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
    const head = ["期", "クラス", "番号", "アドレス", "進み具合", ...V.csvHead, "更新"];
    const lines = rows().map(r =>
      [kiLabel(r.ki), classLabel(r.class), r.number || "", r.email, status(r).label, ...V.csvRow(r),
        r.note?.updatedAt?.toLocaleString("ja-JP") || ""].map(csvCell).join(","));
    const blob = new Blob(["\ufeff" + [head.map(csvCell).join(","), ...lines].join("\r\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = cls === TEST_CLASS ? `${lesson}_テスト.csv` : `${lesson}_${kiLabel(ki)}_${classLabel(cls)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function watch() {
    unwatch?.();
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
  function demoData() {
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
      const s2 = i % 4;
      nt.push({ uid, lesson: "L02", step: s2, submitted: s2 === 3 && i % 2 === 0, updatedAt: new Date(Date.now() - (i % 8) * 60000),
        data: { tomo: s2 >= 1 ? "部活のあとでも同じ？" : "",
          q1: s2 >= 2 ? "なんで歌詞があると気が散るの？" : "", q2: s2 >= 2 && i % 2 ? "研究では、雑音の大きさはどこまで分かっている？" : "" } });
    }
    return [st, nt];
  }

  renderShell(); watch();
  const tick = setInterval(renderTable, 30000); // 「止まってる？」表示を30秒ごとに更新
  return () => { unwatch?.(); clearInterval(tick); if (dlg.open) dlg.close(); };
}
