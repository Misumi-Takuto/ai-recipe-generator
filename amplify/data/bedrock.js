// util モジュールをインポートする必要があるかもしれません。
// チュートリアルの指示や、他のリゾルバーコードで util がどのように扱われているか確認してください。
// ここでは仮にインポート不要、またはAppSyncが提供するグローバルな util オブジェクトがあるとして記述。
// もしエラーが続く場合は、この util のインポート方法も確認が必要です。
// const util = require('util'); // ← この形式もAppSyncリゾルバーでは使えない可能性があります。
// したがって、AppSyncのコンソールで「ランタイム」セクションを見て、どのようなユーティリティ関数が提供されているか確認するのがベストです。

/**
 * Amazon Bedrock で Claude 3 Sonnet 基礎モデルを呼び出すための HTTP リクエストを構築する関数。
 *
 * @param {AppSyncContext} ctx - AppSync リゾルバーのコンテキストオブジェクト。
 * @returns {object} HTTP リクエストの設定。
 */
export function request(ctx) {
  const { ingredients = [] } = ctx.args;

  const promptIngredients = Array.isArray(ingredients) ? ingredients.join(", ") : String(ingredients);
  const prompt = `Suggest a recipe idea using these ingredients: ${promptIngredients}.`;

  // console.log を util.log に変更
  util.log("Constructed prompt for Bedrock:", prompt); // ★ここを修正★

  return {
    resourcePath: `/model/anthropic.claude-3-sonnet-20240229-v1:0/invoke`,
    method: "POST",
    params: {
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `\n\nHuman: ${prompt}\n\nAssistant:`,
              },
            ],
          },
        ],
      }),
    },
  };
}

/**
 * Amazon Bedrock からのレスポンスを解析し、生成されたレシピを返す関数。
 *
 * @param {AppSyncContext} ctx - AppSync リゾルバーのコンテキストオブジェクト。
 * @returns {object} レスポンスオブジェクト。
 */
export function response(ctx) {
  // console.log を util.log に変更
  util.log("Raw Bedrock response body:", ctx.result.body); // ★ここを修正★

  if (ctx.error) {
    // console.error を util.error または util.log に変更
    util.log("Bedrock invocation error:", JSON.stringify(ctx.error, null, 2)); // ★ここを修正★
    return { body: "レシピの生成中にエラーが発生しました。詳細はログをご確認ください。" };
  }

  let parsedBody;
  try {
    parsedBody = JSON.parse(ctx.result.body);
  } catch (parseError) {
    // console.error を util.log に変更
    util.log("レスポンスボディのJSONパースに失敗しました:", parseError); // ★ここを修正★
    util.log("不正なボディの内容:", ctx.result.body); // ★ここを修正★
    return { body: "レシピの解析中にエラーが発生しました: 無効なレスポンス形式。" };
  }

  if (
    parsedBody &&
    Array.isArray(parsedBody.content) &&
    parsedBody.content.length > 0 &&
    parsedBody.content[0].type === "text" &&
    typeof parsedBody.content[0].text === "string"
  ) {
    const res = {
      body: parsedBody.content[0].text,
    };
    // console.log を util.log に変更
    util.log("Successfully parsed Bedrock response:", res.body.substring(0, 100) + "..."); // ★ここを修正★
    return res;
  } else {
    // console.error を util.log に変更
    util.log("Bedrockからのレスポンス形式が予期せぬ形式です。"); // ★ここを修正★
    util.log("受信したレスポンス:", JSON.stringify(parsedBody, null, 2)); // ★ここを修正★
    return { body: "レシピの解析中にエラーが発生しました: 予期せぬレスポンス構造。" };
  }
}