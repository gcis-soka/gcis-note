#!/usr/bin/env bash
# 自動配信の初期設定（一度だけ・Google Cloud Shell で実行）
#   使い方：bash setup-ci.sh <GitHubのリポジトリ（持ち主/名前）>
#   例　　：bash setup-ci.sh gcis-soka/gcis-note
#   本番・開発版のプロジェクトIDは、この下の PROD / DEV（ふつうは変えない）
# すること：
#   1) 配信専用のアカウント deploy@… を本番・開発版に1つずつ作る（Hosting とルールの配信だけ。生徒データは読めない）
#   2) 指定した GitHub のリポジトリからだけ、鍵ファイルなしでログインできるようにする（Workload Identity）
#      main ブランチ → 本番だけ／develop ブランチ → 開発版だけ
#   3) 最後に GitHub に貼る値（秘密ではない）を1行表示する
# 何度実行しても同じ結果になる（作成済みのものは飛ばす）
set -euo pipefail

PROD="gcis-note"
DEV="gcis-note-dev"
REPO="${1:-}"
POOL="github"
PROVIDER="gcis-note-repo"
ROLES="roles/firebasehosting.admin roles/firebaserules.admin roles/datastore.indexAdmin roles/serviceusage.serviceUsageConsumer"
# datastore.indexAdmin：配信時に「DBがあるか」を確かめるため（データの中身は読めない）

case "$REPO" in */*) ;; *) echo "GitHubのリポジトリを付けて実行してください（例：bash setup-ci.sh gcis-soka/gcis-note）"; exit 1;; esac
say() { printf '\n== %s\n' "$*"; }

say "プロジェクトの確認"
NUM=$(gcloud projects describe "$PROD" --format='value(projectNumber)')
gcloud projects describe "$DEV" --format='value(projectId)' >/dev/null
echo "本番 $PROD（番号 $NUM）／開発版 $DEV"

say "必要な機能（API）を有効にする"
gcloud services enable iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com \
  firebasehosting.googleapis.com firebaserules.googleapis.com firestore.googleapis.com --project "$PROD"
gcloud services enable iam.googleapis.com iamcredentials.googleapis.com \
  firebasehosting.googleapis.com firebaserules.googleapis.com firestore.googleapis.com --project "$DEV"

say "GitHub からのログイン窓口（Workload Identity）"
if ! gcloud iam workload-identity-pools describe "$POOL" --location=global --project="$PROD" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "$POOL" --location=global --project="$PROD" --display-name="GitHub Actions"
fi
COND="assertion.repository=='${REPO}' && (assertion.ref=='refs/heads/main' || assertion.ref=='refs/heads/develop')"
if ! gcloud iam workload-identity-pools providers describe "$PROVIDER" --workload-identity-pool="$POOL" --location=global --project="$PROD" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" \
    --workload-identity-pool="$POOL" --location=global --project="$PROD" \
    --display-name="${REPO#*/}" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
    --attribute-condition="$COND"
fi
POOL_ID="projects/${NUM}/locations/global/workloadIdentityPools/${POOL}"

setup_sa() { # $1=プロジェクト $2=許可するブランチ
  local P="$1" BR="$2" SA="deploy@$1.iam.gserviceaccount.com"
  say "配信用アカウント $SA（$BR からだけ使える）"
  if ! gcloud iam service-accounts describe "$SA" --project="$P" >/dev/null 2>&1; then
    gcloud iam service-accounts create deploy --project="$P" --display-name="GitHub Actions deploy ($BR)"
    sleep 10
  fi
  for R in $ROLES; do
    gcloud projects add-iam-policy-binding "$P" --member="serviceAccount:$SA" --role="$R" --condition=None --quiet >/dev/null
    echo "  付与：$R"
  done
  gcloud iam service-accounts add-iam-policy-binding "$SA" --project="$P" \
    --role="roles/iam.workloadIdentityUser" \
    --member="principalSet://iam.googleapis.com/${POOL_ID}/attribute.ref/refs/heads/${BR}" --quiet >/dev/null
  echo "  許可：${BR} ブランチ"
}
setup_sa "$PROD" main
setup_sa "$DEV" develop

say "完了。GitHub → Settings → Secrets and variables → Actions → Variables に次の1つを登録してください"
echo
echo "  名前：GCP_WIF_PROVIDER"
echo "  値　：${POOL_ID}/providers/${PROVIDER}"
echo
echo "（秘密の値ではありません。Claude に伝えても大丈夫です）"
