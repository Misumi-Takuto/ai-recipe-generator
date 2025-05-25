import { defineBackend } from "@aws-amplify/backend";
import { data } from "./data/resource";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { auth } from "./auth/resource";

const backend = defineBackend({
  auth,
  data,
});

const bedrockDataSource = backend.data.resources.graphqlApi.addHttpDataSource(
  "bedrockDS",
  // 1. エンドポイントURLをus-east-1からap-northeast-1に変更
  "https://bedrock-runtime.ap-northeast-1.amazonaws.com",
  {
    authorizationConfig: {
      // 2. signingRegionをap-northeast-1に変更
      signingRegion: "ap-northeast-1",
      signingServiceName: "bedrock",
    },
  }
);

bedrockDataSource.grantPrincipal.addToPrincipalPolicy(
  new PolicyStatement({
    resources: [
      // 3. resourcesのARNもus-east-1からap-northeast-1に変更
      "arn:aws:bedrock:ap-northeast-1::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0",
    ],
    actions: ["bedrock:InvokeModel"],
    
  })
);