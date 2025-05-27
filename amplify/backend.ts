import { defineBackend } from "@aws-amplify/backend";
import { data } from "./data/resource";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { auth } from "./auth/resource";

// ---
// ★重要★ ここでAWSデプロイ先のリージョンを設定します。
// あなたのAmplifyプロジェクトがデプロイされているリージョンに合わせて変更してください。
// 例: 日本から使うなら "ap-northeast-1" (東京)
// チュートリアル通りに進めるなら "us-east-1" (バージニア北部)
//
// 注意: Bedrockモデルへのアクセスリクエストはリージョンごとに行う必要があります。
// ここで設定したリージョンで、Claude 3 Sonnetへのアクセスが許可されていることを確認してください。
// ---
const AWS_REGION = "ap-northeast-1"; // ★ここに設定したいリージョンを記述★

const backend = defineBackend({
  auth,
  data,
});

// ---
// AppSync APIにAmazon Bedrockを呼び出すためのHTTPデータソースを追加します。
// ここで指定するエンドポイントと署名リージョンは、上記の AWS_REGION と一致させる必要があります。
//
// エラーが出た場合:
// - AWS_REGION が正しいか確認してください。
// - `amplify push` 実行時にエラーがないか、ターミナル出力を確認してください。
// ---
const bedrockDataSource = backend.data.resources.graphqlApi.addHttpDataSource(
  "bedrockDS", // データソースの論理名
  `https://bedrock-runtime.${AWS_REGION}.amazonaws.com`, // Bedrock Runtime APIのエンドポイント
  {
    authorizationConfig: {
      signingRegion: AWS_REGION, // リクエスト署名に使用するリージョン
      signingServiceName: "bedrock", // 署名するAWSサービス名
    },
  }
);

// ---
// AppSync (またはデータソースが引き受けるIAMロール) が、
// 指定されたBedrockモデルを呼び出すためのIAM権限を付与します。
//
// エラーが出た場合:
// - `resources` の ARN が正しいか確認してください。モデルID (例: anthropic.claude-3-sonnet-20240229-v1:0) が最新か、
//   または使用したいものと一致しているか確認してください。
// - AWS_REGION と ARN 内のリージョンが一致しているか確認してください。
// - このコードのデプロイ後に `amplify push` が成功しているか確認してください。
// ---
bedrockDataSource.grantPrincipal.addToPrincipalPolicy(
  new PolicyStatement({
    resources: [
      // Bedrockの基盤モデルのARNを指定。リージョンとモデルIDが重要です。
      `arn:aws:bedrock:${AWS_REGION}::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0`,
      // 特定のモデルIDではなく、全ての基盤モデルへのアクセスを許可する場合は以下を使用 (非推奨、最小権限の原則に反するため)
      // `arn:aws:bedrock:${AWS_REGION}::foundation-model/*`,
    ],
    actions: ["bedrock:InvokeModel"], // Bedrockモデルの呼び出しを許可するアクション
  })
);

// ---
// その他のAmplifyバックエンドリソース定義（例: auth, dataなど）はここに記述されます。
//
// エラーが出た場合:
// - 他のファイル (data/resource.ts, auth/resource.tsなど) に構文エラーがないか確認してください。
// ---
// backend.auth.resources.userPool.addUserPoolClient("my-client", {}); // 例

// ---
// GraphQL スキーマに Bedrock データソースを紐付けるためのリゾルバー定義
// チュートリアルによって、この部分が自動生成されることもあれば、
// data/resource.ts や schema.graphql 内で定義することもあります。
//
// ここでエラーが出た場合:
// - GraphQL スキーマで 'askBedrock' のようなフィールドが正しく定義されているか確認してください。
// - `data.resources.graphqlApi` が利用可能か確認してください。
// - チュートリアルのリゾルバー設定手順を見直してください。
// ---
// 例:
// backend.data.resources.graphqlApi.addResolver("Query", "askBedrock", {
//   dataSource: bedrockDataSource,
//   requestMappingTemplate: PathTo.custom("mapping-templates/askBedrock-request.vtl"), // VTLリゾルバーの場合
//   responseMappingTemplate: PathTo.custom("mapping-templates/askBedrock-response.vtl"), // VTLリゾルバーの場合
// });
// あるいは、@aws_api ディレクティブなどを使用している場合もあります。