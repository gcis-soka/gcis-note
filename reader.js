// 論文を読みながらメモ（第3回「読みはじめる」・Quest 3）11/7 試作
// 論文のページをアプリの中に出し、横（狭い画面では下）にメモ欄を置く。
// 多くの論文サイトは、ほかのサイトの中での表示を許していない（白い画面・「接続が拒否されました」）。
// アプリ側ではかわせない（かわすには論文を学校のサーバーから配り直すことになるので、しない）。
// → そのときのために「この論文を右半分に開く」を必ず出す（Gemini と同じ開き方）。PDF の保存はさせない
const safeUrl = u => /^https?:\/\//i.test(String(u || "").trim()) ? String(u).trim() : "";
const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };

let pick = 0; // いま開いている論文（0＝①、1＝②）。保存しない

// ps：[{ no: "①", url }]、memo：右（下）に置く欄の HTML
export function readerHtml(c, ps, memo) {
  const esc = c.esc;
  const list = ps.filter(p => safeUrl(p.url));
  if (!list.length) return `<div class="reader-memo solo">${memo}</div>`;
  if (pick >= list.length) pick = 0;
  const p = list.at(pick), url = safeUrl(p.url);
  return `
    <div class="reader">
      <div class="reader-bar">
        ${list.length > 1 ? `<span class="reader-tabs">${list.map((x, j) => `<button type="button" class="choice-btn ${j === pick ? "on" : ""}" data-reader-pick="${j}">論文${x.no}</button>`).join("")}</span>` : `<b>論文${p.no}</b>`}
        <span class="hint">${esc(hostOf(url))}</span>
        <button type="button" class="btn small" data-reader-split="${esc(url)}">この論文を右半分に開く ↗</button>
      </div>
      <p class="hint">白い画面や「接続が拒否されました」と出たら、その論文のサイトはアプリの中での表示を許していません。<b>「この論文を右半分に開く」</b>で読もう。</p>
      <div class="reader-grid">
        <iframe class="reader-frame" src="${esc(url)}" title="論文${p.no}" referrerpolicy="no-referrer-when-downgrade"></iframe>
        <div class="reader-memo">${memo}</div>
      </div>
    </div>`;
}

export function handleReader(t, c) {
  const b = t.closest("[data-reader-pick]");
  if (b) { pick = Number(b.dataset.readerPick) || 0; c.rerender(); return true; }
  const s = t.closest("[data-reader-split]");
  if (s) {
    const W = screen.availWidth || 1366, H = screen.availHeight || 768;
    const feat = `popup=yes,left=${Math.round(W / 2)},top=0,width=${Math.round(W / 2)},height=${H}`;
    const w = window.open(s.dataset.readerSplit, "gcis_paper", feat) || window.open(s.dataset.readerSplit, "_blank");
    try { w?.focus(); } catch { /* なし */ }
    return true;
  }
  return false;
}
