import { defineBackend } from "@aws-amplify/backend";
import { data } from "./data/resource";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { auth } from "./auth/resource";

// あなたのリージョン
const AWS_REGION = "ap-northeast-1";

const backend = defineBackend({
  auth,
  data,
});

const bedrockDataSource = backend.data.resources.graphqlApi.addHttpDataSource(
  "bedrockDS",
  `https://bedrock-runtime.${AWS_REGION}.amazonaws.com`,
  {
    authorizationConfig: {
      signingRegion: AWS_REGION,
      signingServiceName: "bedrock",
    },
  }
);

// ★★★ ここを修正します ★★★
bedrockDataSource.grantPrincipal.addToPrincipalPolicy(
  new PolicyStatement({
    resources: [
      // 以前は Claude 3 Sonnet の ARN があったはずです。
      // これを Claude 3.5 Sonnet の ARN に変更（または追加）します。
      `arn:aws:bedrock:${AWS_REGION}::foundation-model/anthropic.claude-3-5-sonnet-20240620-v1:0`, // ★この行に修正！★
      // もし、将来的に他のClaude 3.5シリーズも使う可能性があるなら、
      // `arn:aws:bedrock:${AWS_REGION}::foundation-model/anthropic.claude-3-5-*` のようにワイルドカードを使うこともできますが、
      // 最小権限の原則からは外れます。
      // あるいは、全ての基盤モデルへのアクセスを許可する場合（非推奨、デバッグ用）
      // `arn:aws:bedrock:${AWS_REGION}::foundation-model/*`,
    ],
    actions: ["bedrock:InvokeModel"], // Bedrockモデルの呼び出しを許可するアクション
  })
);
// ★★★ 修正終わり ★★★