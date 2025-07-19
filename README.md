# Filter-buttle
## 本番ビルドと起動
1. ビルド
まずクライアントをビルドします：
```
npm run build
```
2. Expressサーバーのみ起動
ビルド済みの静的ファイルをExpressで配信します：
※ npm start は node dist/server.js を呼び出す想定です。
```
npm run start
```

## 開発用サーバー起動

開発時は以下のコマンドで、ViteとExpressサーバーを同時に立ち上げます。

```bash
npm run start:dev
