# GitHub初期設定手順: `github-login` で接続できるようにする

この手順書は、**Git、GitHub CLI、SSH鍵、GitHub接続設定がまだ無い人**向けです。  
WindowsのWSL/Ubuntuで作業する前提です。

レッスン全体の入口は `index.md` です。  
この手順書は、体験開発へ進む前のGitHub接続確認として使います。

最後は、Ubuntuで次を実行するだけでGitHub接続を確認できるようにします。

```bash
github-login
```

---

## エージェント用プロトコル

エージェントがこの手順書を読む場合は、以下のルールで進めてください。

1. 全手順を一度読んでから開始する。
2. 一度に全部進めず、**1ステップずつ**実行する。
3. ユーザーは非エンジニア前提。専門用語を使う場合は、短く意味を添える。
4. ユーザーへの質問は、**必ず1回につき1つだけ**にする。
5. 質問は、できるだけ「はい/いいえ」または「この値でよいですか」の形にする。
6. 各ステップで、次の順番を守る。

```text
説明する
-> 質問を1つだけする
-> ユーザーの回答を待つ
-> 必要ならコマンドを実行する
-> 結果を確認する
-> 次のステップへ進む
```

7. 最初にユーザーへ確認する項目は次の3つ。ただし、一度に聞かず、1つずつ聞く。

```text
GitHubユーザー名
Gitで使う表示名
GitHubに登録しているメールアドレス
```

8. 次の値は、ユーザーの回答からエージェントが提案してよい。

```text
SSH_HOST
SSH_KEY_FILE
```

例:

```text
GitHubユーザー名: taro-yamada
SSH_HOST: github-taro-yamada
SSH_KEY_FILE: github_taro_yamada_key
```

9. パスワード、SSH鍵のパスフレーズ、GitHubの2段階認証コードは、ユーザー本人に入力してもらう。エージェントは聞き出さない。
10. `sudo`、ブラウザ認証、パスフレーズ入力、2段階認証が必要な場面では、「Ubuntu/WSLを新規に開いて、そこに入力してください」と案内し、必ずユーザーの操作完了を待つ。
11. 既存のSSH鍵、`~/.ssh/config`、`~/.bashrc` がある場合は、上書きしない。追記・再利用・別名作成のどれにするか確認する。
12. GitHubへの公開鍵登録は、原則として `gh ssh-key add` を使う。
13. 最終確認で `github-login` が成功するまで完了扱いにしない。
14. 何かをインストール・作成・追記する前に、必ず現在の環境を確認する。
15. すでに入っているもの、すでに設定済みのものは、再インストールや再設定を促さない。
16. 既存設定が見つかった場合は、「この設定を使うか」「新しく作るか」を短く質問してから進める。
17. `~/.ssh/config` や `~/.bashrc` へ追記するときは、同じ設定が既に無いか確認してから追記する。
18. ユーザーの目的が「実際の開発ワークフロー」なら、最後に `clone`、`pull`、`push` のどこまで確認したいか質問する。

### 一問一答の進め方

エージェントは、次の質問例を上から順番に使ってください。  
各質問のあと、必ずユーザーの返答または操作完了を待ちます。

```text
Q1. GitHub初期設定を始めます。まず現在の環境を確認してよいですか？
Q2. GitHubユーザー名を教えてください。
Q3. Gitで使う表示名を教えてください。
Q4. GitHubに登録しているメールアドレスを教えてください。
Q5. SSH接続名と鍵ファイル名は、こちらの提案で進めてよいですか？
Q6. 不足しているツールがある場合、インストールしてよいですか？
Q7. 既存のGit設定がある場合、この設定を使いますか？
Q8. 既存のSSH鍵がある場合、この鍵を使いますか？
Q9. SSH鍵を新しく作る場合、作成してよいですか？
Q10. GitHub CLIでブラウザ認証を開始してよいですか？
Q11. 公開鍵をGitHubへ登録してよいですか？
Q12. SSH接続設定を作成または追記してよいですか？
Q13. github-login コマンドを作成または更新してよいですか？
Q14. github-login で接続確認してよいですか？
Q15. clone / pull / push の動作確認まで行いますか？
```

ユーザーパスワードやパスフレーズ入力が必要な場面では、次のように案内します。

```text
Ubuntu/WSLを新規に開いて、表示された画面に直接入力してください。
入力内容はエージェントに送らないでください。
入力が終わったら「完了」と教えてください。
```

質問するときは、必要なら選択肢を2つだけ示します。

```text
例: 既存のSSH鍵があります。この鍵を使いますか？
選択肢: 使う / 新しく作る
```

ユーザーが迷った場合は、安全な選択肢を短く勧めます。

```text
例: よく分からない場合は、新しく作るより既存設定を確認してから進めるのが安全です。
```

### エージェントの最初の確認コマンド

エージェントは、最初に次を実行して環境を確認してください。

```bash
command -v git >/dev/null && git --version || echo "git: not installed"
command -v ssh >/dev/null && ssh -V || echo "ssh: not installed"
command -v gh >/dev/null && gh --version || echo "gh: not installed"
git config --global --get user.name 2>/dev/null || echo "git user.name: not set"
git config --global --get user.email 2>/dev/null || echo "git user.email: not set"
ls -la ~/.ssh 2>/dev/null || echo "~/.ssh: not found"
sed -n '1,200p' ~/.ssh/config 2>/dev/null || echo "~/.ssh/config: not found"
gh auth status 2>&1 || true
ssh-add -l 2>&1 || true
```

### エージェントの判断ルール

- `git --version` が成功したら、Gitのインストールは案内しない。
- `ssh -V` が成功したら、SSHクライアントのインストールは案内しない。
- `gh --version` が成功したら、GitHub CLIのインストールは案内しない。
- Gitの `user.name` と `user.email` が設定済みなら、その値を使うか確認する。
- `~/.ssh` に既存の秘密鍵と公開鍵がある場合は、新規作成せず、使う鍵を確認する。
- `~/.ssh/config` にGitHub用の `Host` がある場合は、その設定を使うか確認する。
- `gh auth status` が成功したら、`gh auth login` は案内しない。
- `gh ssh-key list` で公開鍵が登録済みと判断できる場合は、重複登録を促さない。
- `gh ssh-key add` が権限不足で失敗した場合は、`gh auth refresh -h github.com -s write:public_key` を案内する。
- 不明な場合は、勝手に変更せず、ユーザーへ1つだけ質問する。

---

## 人間向けの全体像

やることはこの順番です。

```text
1. Ubuntuを開く
2. 現在の環境を確認する
3. 不足しているものだけ入れる
4. Gitの名前とメールを確認・設定する
5. SSH鍵が無ければ作る
6. ghでGitHubにログインする
7. ghで公開鍵をGitHubに登録する
8. SSH接続設定を確認・作成する
9. github-loginコマンドを確認・作成する
10. github-loginで接続確認する
```

## 1. Ubuntuを開く

Windowsのスタートメニューから `Ubuntu` を開きます。  
以降のコマンドは、すべてUbuntuのターミナルで実行します。

パスワード、SSH鍵のパスフレーズ、GitHub認証が必要な場面では、Ubuntu/WSLを新規に開いて、その画面に直接入力してください。  
入力内容をエージェントに送る必要はありません。

## 2. 現在の環境を確認する

まず、すでに何が入っているか確認します。

```bash
git --version
ssh -V
gh --version
git config --global --get user.name
git config --global --get user.email
ls -la ~/.ssh
```

バージョンや設定値が表示されたものは、すでに準備済みです。  
エラーになったものだけ、次の手順で設定します。

## 3. 不足しているものだけインストールする

GitやSSHが無い場合だけ、次を実行します。

```bash
sudo apt update
sudo apt install -y git openssh-client curl wget ca-certificates
```

確認します。

```bash
git --version
ssh -V
```

バージョンが表示されればOKです。

途中でパスワードを聞かれたら、Ubuntuのユーザーパスワードを入力します。  
入力中は画面に文字が出ませんが、そのまま入力してEnterを押します。

このパスワード入力が出た場合は、Ubuntu/WSLを新規に開いて、その画面に直接入力してください。  
入力が終わったら、エージェントには「完了」とだけ伝えてください。

## 4. GitHub CLI、ghを確認・インストールする

まず確認します。

```bash
gh --version
```

バージョンが表示された場合、このインストール手順は不要です。

`gh: command not found` の場合だけ、次の長いコマンドを**丸ごとコピーして実行**します。

```bash
(type -p wget >/dev/null || (sudo apt update && sudo apt install wget -y)) \
  && sudo mkdir -p -m 755 /etc/apt/keyrings \
  && out=$(mktemp) && wget -nv -O"$out" https://cli.github.com/packages/githubcli-archive-keyring.gpg \
  && cat "$out" | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null \
  && sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
  && sudo mkdir -p -m 755 /etc/apt/sources.list.d \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
  && sudo apt update \
  && sudo apt install gh -y
```

確認します。

```bash
gh --version
```

バージョンが表示されればOKです。

## 5. この手順で使う名前を決める

次の5つを自分用に置き換えて実行します。

```bash
GITHUB_USER="あなたのGitHubユーザー名"
GIT_NAME="あなたの名前"
GIT_EMAIL="GitHubに登録しているメールアドレス"
SSH_HOST="github-あなたのGitHubユーザー名"
SSH_KEY_FILE="github_あなたのGitHubユーザー名_key"
```

例:

```bash
GITHUB_USER="taro-yamada"
GIT_NAME="Taro Yamada"
GIT_EMAIL="taro@example.com"
SSH_HOST="github-taro-yamada"
SSH_KEY_FILE="github_taro_yamada_key"
```

確認します。

```bash
echo "$GITHUB_USER"
echo "$GIT_NAME"
echo "$GIT_EMAIL"
echo "$SSH_HOST"
echo "$SSH_KEY_FILE"
```

`SSH_KEY_FILE` は好きな名前で大丈夫です。  
`id_ed25519` 固定ではありません。

このあとの手順では、ここで設定した値を使います。  
設定が終わるまで、このUbuntuターミナルは閉じないでください。

## 6. Gitの名前とメールを確認・設定する

まず、今の設定を確認します。

```bash
git config --global --get user.name
git config --global --get user.email
```

正しい名前とメールが表示された場合は、この設定手順は不要です。

未設定、または修正したい場合だけ、次を実行します。

```bash
git config --global user.name "$GIT_NAME"
git config --global user.email "$GIT_EMAIL"
git config --global --list
```

`user.name` と `user.email` が表示されればOKです。

## 7. SSH鍵を確認・作成する

まず、既存のSSH鍵を確認します。

```bash
ls -la ~/.ssh
```

すでに使う鍵が決まっている場合は、新しく作らず、その鍵ファイル名を `SSH_KEY_FILE` に設定してください。

例:

```bash
SSH_KEY_FILE="既存の秘密鍵ファイル名"
```

既存の秘密鍵に対応する `.pub` ファイルが無い場合は、次で公開鍵を作れます。

```bash
ssh-keygen -y -f "$HOME/.ssh/$SSH_KEY_FILE" > "$HOME/.ssh/$SSH_KEY_FILE.pub"
chmod 644 "$HOME/.ssh/$SSH_KEY_FILE.pub"
```

このとき秘密鍵のパスフレーズを聞かれたら、ユーザー本人が入力します。

秘密鍵と公開鍵の例:

```text
秘密鍵: ~/.ssh/github_taro_yamada_key
公開鍵: ~/.ssh/github_taro_yamada_key.pub
```

まだSSH鍵が無い場合だけ、次へ進みます。

SSH鍵を入れるフォルダを作ります。

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
```

秘密鍵と公開鍵を作ります。

```bash
ssh-keygen -t ed25519 -C "$GIT_EMAIL" -f "$HOME/.ssh/$SSH_KEY_FILE"
```

途中で次のように聞かれます。

```text
Enter passphrase:
```

これはSSH鍵用のパスワードです。  
忘れないパスフレーズを入力してください。

このパスフレーズは、Ubuntu/WSLの画面に直接入力してください。  
エージェントには教えないでください。

もう一度同じものを聞かれます。

```text
Enter same passphrase again:
```

同じパスフレーズを入力します。

作られるファイルはこの2つです。

```text
秘密鍵: ~/.ssh/$SSH_KEY_FILE
公開鍵: ~/.ssh/$SSH_KEY_FILE.pub
```

権限を整えます。

```bash
chmod 600 "$HOME/.ssh/$SSH_KEY_FILE"
chmod 644 "$HOME/.ssh/$SSH_KEY_FILE.pub"
```

## 8. ghでGitHubにログインする

まず、ログイン済みか確認します。

```bash
gh auth status
```

ログイン済みと表示された場合、このログイン手順は不要です。

未ログイン、またはトークン無効の場合だけ、次を実行します。

次を実行します。

```bash
gh auth login -h github.com -p ssh --skip-ssh-key -s write:public_key -w
```

ブラウザが開いたら、GitHubにログインして認証します。  
2段階認証を求められた場合は、画面の案内に従ってください。

この認証はユーザー本人が行います。  
エージェントにはパスワードや2段階認証コードを送らず、終わったら「完了」と伝えてください。

完了後、確認します。

```bash
gh auth status
```

ログイン済みと表示されればOKです。

もしすでにログイン済みだが、後の公開鍵登録で権限不足になった場合は次を実行します。

```bash
gh auth refresh -h github.com -s write:public_key
```

## 9. ghで公開鍵をGitHubに登録する

まず、登録済みのSSH鍵を確認します。

```bash
gh ssh-key list
ssh-keygen -lf "$HOME/.ssh/$SSH_KEY_FILE.pub"
```

すでに今回使う公開鍵が登録済みなら、この登録手順は不要です。

未登録の場合だけ、次を実行します。

次を実行します。

```bash
gh ssh-key add "$HOME/.ssh/$SSH_KEY_FILE.pub" \
  --title "WSL Ubuntu $SSH_HOST" \
  --type authentication
```

登録できたか確認します。

```bash
gh ssh-key list
```

今登録したTitleが表示されればOKです。

もし「already in use」のような表示が出た場合は、同じ公開鍵がすでにGitHubに登録されています。  
その場合も問題ありません。

もし権限不足のエラーが出た場合は、次を実行してから、もう一度 `gh ssh-key add` を実行します。

```bash
gh auth refresh -h github.com -s write:public_key
```

## 10. SSH接続設定を確認・作成する

まず、既存設定を確認します。

```bash
cat ~/.ssh/config
```

GitHub用の `Host` がすでにあり、それを使う場合は、この作成手順は不要です。

未設定の場合だけ、次を実行します。

次を実行します。

```bash
touch ~/.ssh/config

if grep -qE "^[[:space:]]*Host[[:space:]].*(^|[[:space:]])$SSH_HOST($|[[:space:]])" ~/.ssh/config; then
  echo "SSH設定はすでにあります: $SSH_HOST"
else
  cat >> ~/.ssh/config <<EOF
Host $SSH_HOST
  HostName github.com
  User git
  IdentityFile ~/.ssh/$SSH_KEY_FILE
  IdentitiesOnly yes
  AddKeysToAgent yes
EOF
fi

chmod 600 ~/.ssh/config
```

確認します。

```bash
cat ~/.ssh/config
```

`Host` の右側に、自分で決めた `SSH_HOST` が表示されればOKです。

## 11. `github-login` コマンドを確認・作成する

まず、すでに `github-login` があるか確認します。

```bash
type github-login
```

関数やコマンドとして表示された場合は、既存のものを使うか、修正するか確認してください。

未設定の場合だけ、次を実行します。

次を実行します。

```bash
if grep -qE '^[[:space:]]*github-login[[:space:]]*\(\)' ~/.bashrc; then
  echo "github-login はすでに ~/.bashrc にあります"
else
  cat >> ~/.bashrc <<EOF

# GitHub setup values.
export GITHUB_USER="$GITHUB_USER"
export SSH_HOST="$SSH_HOST"
export SSH_KEY_FILE="$SSH_KEY_FILE"

# GitHub SSH login helper.
github-login() {
  local key_path="\$HOME/.ssh/\$SSH_KEY_FILE"
  local key_fingerprint

  ssh-add -l >/dev/null 2>&1
  case \$? in
    0|1) ;;
    *) eval "\$(ssh-agent -s)" ;;
  esac

  key_fingerprint="\$(ssh-keygen -lf "\$key_path.pub" | awk '{print \$2}')"
  if ! ssh-add -l 2>/dev/null | grep -q "\$key_fingerprint"; then
    ssh-add "\$key_path"
  fi

  ssh -T "git@\$SSH_HOST"
}
EOF
fi
```

設定を反映します。

```bash
source ~/.bashrc
```

## 12. GitHub接続を確認する

次を実行します。

```bash
github-login
```

初回はSSH鍵のパスフレーズを聞かれます。

```text
Enter passphrase for /home/ユーザー名/.ssh/SSH_KEY_FILE:
```

SSH鍵を作ったときに決めたパスフレーズを入力します。

このパスフレーズは、Ubuntu/WSLの画面に直接入力してください。  
エージェントには送らないでください。

初回だけ、次のように聞かれることがあります。

```text
Are you sure you want to continue connecting?
```

その場合は `yes` と入力してEnterを押します。

成功すると次のように表示されます。

```text
Hi GitHubユーザー名! You've successfully authenticated, but GitHub does not provide shell access.
```

これは成功です。  
`GitHub does not provide shell access` はエラーではありません。

## 13. リポジトリをcloneする

```bash
git clone "git@$SSH_HOST:$GITHUB_USER/リポジトリ名.git"
```

例:

```bash
git clone "git@$SSH_HOST:$GITHUB_USER/sample-repository.git"
```

## 14. 次回以降の使い方

Ubuntuを開いたら、まず次を実行します。

```bash
github-login
```

成功したら、同じターミナルで開発作業をします。

```bash
git pull
git push
git clone "git@$SSH_HOST:$GITHUB_USER/リポジトリ名.git"
```

Codexなどの開発エージェントを使う場合も、`github-login` を実行した同じターミナルから起動します。

## よくあるエラー

### `git: command not found`

Gitが入っていません。

```bash
sudo apt update
sudo apt install -y git
```

### `gh: command not found`

GitHub CLIが入っていません。  
手順3をもう一度実行してください。

### `Permission denied (publickey)`

公開鍵がGitHubに登録されていないか、SSH agentに鍵が登録されていません。

確認:

```bash
gh ssh-key list
ssh-add -l
github-login
```

### `Bad passphrase`

SSH鍵のパスフレーズが違います。  
SSH鍵を作ったときに決めたパスフレーズを入力してください。

### `Could not resolve hostname`

`~/.ssh/config` の設定が間違っている可能性があります。

確認:

```bash
cat ~/.ssh/config
echo "$SSH_HOST"
```

### `Repository not found`

GitHub認証はできていますが、リポジトリにアクセスできていません。

次を確認してください。

- GitHubユーザー名が正しいか
- リポジトリ名が正しいか
- privateリポジトリの場合、自分にアクセス権限があるか

## 最終確認

次が成功すれば完了です。

```bash
github-login
```

成功メッセージ:

```text
Hi GitHubユーザー名! You've successfully authenticated, but GitHub does not provide shell access.
```

## 参考

- GitHub CLI Linux install: https://github.com/cli/cli/blob/trunk/docs/install_linux.md
- GitHub CLI manual: https://cli.github.com/manual
