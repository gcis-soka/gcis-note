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
| `l01.js` / `l02.js` | 各回の中身（画面・プロンプト・次へ進める条件）。回を足すときは `l03.js` を作り、student.js の LESSONS・teacher.js の VIEWS・firestore.rules の lesson に足す |
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
- `notes/{uid}_L01`・`notes/{uid}_L02`：uid・lesson・ki・class・number・step（0〜4）・submitted・data（入力内容）・updatedAt・submittedAt
- data（L01）：route（A＝3つの質問／B＝テーマの例）・odai1〜3・theme・themeWhere・kw1〜3・setsu（説）・hikkakari（ひっかかり）・ippo・ippoDate・yosou・geminiLink
- data（L02）：did（やった／まだ）・yatta・mita（見たこと・数字）・kanji（感じたこと）・iikire（言い切れないこと）・yarunara（まだの人：やるとしたら）・tomo（友だちに言われたこと）・geminiLink・q1〜q3（気になったこと）
- 第2回は第1回を提出すると開く（先生の「テスト」とデモでは最初から開く）。提出後も直せる
- 生徒は自分のデータだけ、教員は全員のデータを読める。教員が書けるのは自分の「テスト」だけ。

生徒の個人データはこのリポジトリには置きません（Firebase にだけ保存されます）。
