/**
 * @typedef {object} AppSyncContext
 * @property {object} args - The arguments passed to the resolver.
 * @property {object} args.ingredients - An array of ingredients.
 * @property {object} info - Information about the GraphQL operation.
 * @property {object} source - The parent object from which the current field is resolved.
 * @property {object} stash - A mutable object for storing arbitrary data during resolution.
 * @property {object} error - An object containing error details if the request failed.
 * @property {object} result - The result of the previous resolver or data source.
 * @property {object} result.body - The response body from the data source, as a string.
 */

/**
 * Amazon Bedrock で Claude 3 Sonnet 基礎モデルを呼び出すための HTTP リクエストを構築する関数。
 *
 * @param {AppSyncContext} ctx - AppSync リゾルバーのコンテキストオブジェクト。
 * @returns {object} HTTP リクエストの設定。
 */
export function request(ctx) {
  // `ctx.args` から `ingredients` を取得。もし `ingredients` がない場合は空の配列をデフォルト値とする。
  const { ingredients = [] } = ctx.args;

  // 提供された材料を使ってプロンプトを構築
  // `ingredients` が配列であることを保証し、安全に `join` を使用
  const promptIngredients = Array.isArray(ingredients) ? ingredients.join(", ") : String(ingredients);
  const prompt = `Suggest a recipe idea using these ingredients: ${promptIngredients}.`;

  // デバッグ用にプロンプトをログ出力
  console.log("Constructed prompt for Bedrock:", prompt);

  // リクエスト設定を返す
  return {
    resourcePath: `/model/anthropic.claude-3-sonnet-20240229-v1:0/invoke`, // モデルIDは必要に応じて最新のものか、チュートリアル指定のものか確認
    method: "POST",
    params: {
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31", // APIバージョンはBedrockのドキュメントで確認
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
  // Bedrockからの生レスポンスボディをデバッグ用にログ出力
  console.log("Raw Bedrock response body:", ctx.result.body);

  // エラーが発生している場合は、エラー情報をログ出力して空のボディを返す
  if (ctx.error) {
    console.error("Bedrock invocation error:", JSON.stringify(ctx.error, null, 2));
    return { body: "レシピの生成中にエラーが発生しました。詳細はログをご確認ください。" };
  }

  let parsedBody;
  try {
    // レスポンスボディをパース
    parsedBody = JSON.parse(ctx.result.body);
  } catch (parseError) {
    console.error("レスポンスボディのJSONパースに失敗しました:", parseError);
    console.error("不正なボディの内容:", ctx.result.body);
    return { body: "レシピの解析中にエラーが発生しました: 無効なレスポンス形式。" };
  }

  // Claude 3 Sonnet のレスポンス構造が期待通りかチェック
  // `parsedBody.content` が配列であり、かつ少なくとも1つの要素を持つことを確認
  if (
    parsedBody &&
    Array.isArray(parsedBody.content) &&
    parsedBody.content.length > 0 &&
    parsedBody.content[0].type === "text" && // typeが'text'であることを確認
    typeof parsedBody.content[0].text === "string" // textプロパティが文字列であることを確認
  ) {
    // レスポンスからテキストコンテンツを抽出
    const res = {
      body: parsedBody.content[0].text,
    };
    console.log("Successfully parsed Bedrock response:", res.body.substring(0, 100) + "..."); // 長いレスポンスの場合のログ
    return res;
  } else {
    // 期待するレスポンス構造ではない場合の処理
    console.error("Bedrockからのレスポンス形式が予期せぬ形式です。");
    console.error("受信したレスポンス:", JSON.stringify(parsedBody, null, 2));
    return { body: "レシピの解析中にエラーが発生しました: 予期せぬレスポンス構造。" };
  }
}