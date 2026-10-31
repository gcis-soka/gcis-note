# 探究ノート（GCIS 個人探究）

GCIS（Global Citizenship Inquiry Studies）の個人探究で使う、生徒用の探究ノートアプリです。

- 入口は1つ：`index.html`。ログインしたアドレスで振り分けます（@tokyo.soka.ed.jp → 生徒画面、@soka.ed.jp → 教員画面）
- 教員は右上の「生徒画面へ／教員画面へ」で切り替え。生徒画面での入力は「テスト」として保存されます
- `teacher.html` はトップへ移動するだけのページです（古いブックマーク用）
- 開発版の帯だけ見る：`?demo&devmark`
- 動きだけ見る：URLの最後に `?demo` をつける（保存されません。生徒役・教員役を選べます。教員画面のデータは架空）

## ファイルの役割
| ファイル | 役割 |
|---|---|
| `index.html` / `app.js` | 入口（ログインと振り分け） |
| `student.js` | 生徒画面の枠（ホーム・クラスと番号・保存・画面の切り替え） |
| `l01.js` / `r01.js` / `l02.js` / `r02.js` / `l03.js` / `r03.js` / `l04.js` | 各ステージの中身（画面・プロンプト・次へ進める条件）。L＝授業の回、R＝Quest の結果。足すときはファイルを作り、student.js の LESSONS・teacher.js の VIEWS・firestore.rules の lesson に足す |
| `teacher.js` | 教員画面 |
| `teacher.html` | トップへ移動するだけ |
| `common.js` | 共通（ログイン・保存・ドメインの設定） |
| `themes.js` | テーマの例（入口B）。年度が変わったら差し替える |
| `style.css` | 見た目 |
| `firebase-config.js` | Firebase の設定の見本（配信のときに自動で書き換わる。本物の値は書かない） |
| `firestore.rules` | アクセスのルール（配信のときに自動で Firebase に反映） |
| `firebase.json` | 配信の設定（キャッシュなど）。本番・開発版のプロジェクトIDは deploy.yml に書く |
| `.github/workflows/deploy.yml` | 自動配信（main → 本番、develop → 開発版） |
| `tools/setup-ci.sh` | 自動配信の初期設定（一度だけ Cloud Shell で実行） |
| `RELEASE.md` | 配信・確認・戻し方の手順 |

アプリのファイルはフォルダを使わず、すべてこの階層に置く（.github・tools は配信用の補助）。
`firestore.rules` は配信のたびに Firebase に反映されるので、コンソールで直接書き換えない。

## 使うURL
- 本番：https://gcis-note.web.app/
- 開発版：https://gcis-note-dev.web.app/（画面上部に縞の帯。生徒には案内しない）

## 更新・初回設定
`RELEASE.md` を見る。授業のある月曜日は本番に出さない（自動で止まる）。

## データ（Firestore）
- `students/{uid}`：email・ki（期＝アドレスの頭2桁、数字でなければ空）・class（0〜8、0はテスト）・number（教員のテストは0）・createdAt・updatedAt
- `notes/{uid}_L01`・`_R01`・`_L02`・`_R02`・`_L03`・`_R03`・`_L04`：uid・lesson・ki・class・number・step（0〜4）・submitted・data（入力内容）・updatedAt・submittedAt
- data（L01）：route（A＝3つの質問／B＝テーマの例／C＝やりたいことから。Cはキーワードの画面をとばす）・odai1〜3・theme・themeWhere・yaritai・yaritaiWhy（入口C）・kw1〜3・setsu（説）・hikkakari（ひっかかり）・ippo・ippoDate・yosou・geminiLink
- data（R01＝Quest 1 の結果）：did（やった／まだ）・yatta・mita（見たこと・数字）・kanji（感じたこと）・iikire（言い切れないこと）・yarunara（まだの人：やるとしたら）
- data（L02）：tomo（友だちに言われたこと）・geminiLink・q1〜q3（気になったこと）
- data（R02＝Quest 2：「？」の手がかりになりそうな本か動画）：mono（見たもの・読んだもの。動画はリンク、本は題名とページ）・kokoro（いちばん心に残った所と、ひとこと）
- data（L03＝第3回：先行研究に出会う）：hanMemo（班で出たこと）・kensaku（検索語）・tried（試した検索語、新しい順10個）・p1Title・p1Url・p2Title・p2Url（論文2本）・yomiMemo・geminiLink
- data（R03＝Quest 3：論文を読んだ結果）：yomi1・yomi2（全部読んだ／途中まで／まだ）・wakatta（分かったこと）・mada（まだ分かっていないこと）・q1〜q3
- data（L04＝第4回：問いを立てて、確かめる計画を作る）：toiList（出した問い、1行に1つ）・toi（選んだ問い）・toiWhy・houhou（調べ方：文献・データ／アンケート／インタビュー／観察／実験・制作）・nani・yotei・hitsuyou・kuraberu・anzen・geminiLink
- 教科書 p.44「問いの種類」7分類は l04.js の Q_TYPES に並べると、第4回の「しぼる」プロンプトに1列足される（空のあいだは使わない）
- ステージは L01 → R01 → L02 → R02 → L03 → R03 → L04 の順。前を提出すると次がホームに出る（それまでは出ない）。先生の「テスト」では全部出る。提出後も直せる
- 授業の外でやってくることは「Quest 1, 2 …」と呼ぶ（common.js の quest）
- 生徒は自分のデータだけ、教員は全員のデータを読める。教員が書けるのは自分の「テスト」だけ。

生徒の個人データはこのリポジトリには置きません（Firebase にだけ保存されます）。
