// bedrock.js ファイルの内容

// AppSync JavaScript リゾルバー環境では、`util` オブジェクトがグローバルに提供されます。
// `util.log` は通常のログ出力に、`util.error` はエラーログ出力に使用できます。
// これらのメソッドは、CloudWatch Logs に出力されます。
// ただし、JavaScriptの `console.log` や `console.error` は利用できません。

/**
 * Amazon Bedrock で Claude 3 Sonnet 基礎モデルを呼び出すための HTTP リクエストを構築する関数。
 *
 * @param {object} ctx - AppSync リゾルバーのコンテキストオブジェクト。
 * @returns {object} HTTP リクエストの設定。
 */
export function request(ctx) { // ★export を維持★
    const { ingredients = [] } = ctx.args;
  
    // ingredients が配列であることを保証し、安全に結合する
    const promptIngredients = Array.isArray(ingredients) ? ingredients.join(", ") : String(ingredients);
    
    const prompt = `Suggest a recipe idea using these ingredients: ${promptIngredients}.`;
  
    // --- エラー特定のためのログ（request フェーズ） ---
    // ここでBedrockに送られるプロンプトをログ出力します。
    // AppSyncのロググループ（CloudWatch Logs）で確認できます。
    util.log("DEBUG_REQUEST: Constructed prompt for Bedrock:", prompt);
    // --- エラー特定のためのログ ---

    return {
      resourcePath: `/model/anthropic.claude-3-sonnet-20240229-v1:0/invoke`, // モデルIDはチュートリアルと一致しているか最終確認
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
   * @param {object} ctx - AppSync リゾルバーのコンテキストオブジェクト。
   * @returns {object} レスポンスオブジェクト。
   */
export function response(ctx) { // ★export を維持★
    // --- エラー特定のためのログ（response フェーズ） ---
    // Bedrockからの生のレスポンスボディをログ出力します。
    // これにより、もしBedrockからのレスポンスが期待と異なる形式であっても確認できます。
    util.log("DEBUG_RESPONSE: Raw Bedrock response body:", ctx.result.body);
    // --- エラー特定のためのログ ---

    // リゾルバーレベルでエラーが発生した場合のハンドリング
    // 例えば、Bedrockへのリクエストが権限不足やタイムアウトで失敗した場合など。
    if (ctx.error) {
        // --- エラー特定のためのログ ---
        util.error("ERROR_RESOLVER: AppSync Resolver encountered an error:", JSON.stringify(ctx.error, null, 2));
        // --- エラー特定のためのログ ---
        // エラーが発生したことを示すメッセージを返す
        return { body: "レシピの生成中にエラーが発生しました。詳細についてはバックエンドログを確認してください。" };
    }

    let parsedBody;
    try {
        // レスポンスボディをJSONとしてパース
        parsedBody = JSON.parse(ctx.result.body);
    } catch (parseError) {
        // --- エラー特定のためのログ ---
        // JSONパースに失敗した場合のログ出力。
        // BedrockからJSONではないエラーメッセージが返ってきた場合などに発生します。
        util.error("ERROR_PARSE: Failed to parse Bedrock response body as JSON:", parseError);
        util.error("ERROR_PARSE: Invalid body content:", ctx.result.body);
        // --- エラー特定のためのログ ---
        return { body: "レシピの解析中にエラーが発生しました: 無効なレスポンス形式。" };
    }

    // `TypeError: Cannot read property '0' of undefined` を防ぐための防御策
    // Bedrockのレスポンスが常に期待する形式（parsedBody.content[0].text）であることを確認
    if (
        parsedBody &&
        Array.isArray(parsedBody.content) && // `content` プロパティが配列であるか
        parsedBody.content.length > 0 &&     // `content` 配列が空ではないか
        parsedBody.content[0] &&             // 配列の最初の要素が存在するか
        typeof parsedBody.content[0] === 'object' && // 最初の要素がオブジェクトであるか（念のため）
        parsedBody.content[0].type === "text" && // 最初の要素の `type` が 'text' であるか
        typeof parsedBody.content[0].text === "string" // `text` プロパティが文字列であるか
    ) {
        // レスポンスからテキストコンテンツを抽出
        const res = {
            body: parsedBody.content[0].text,
        };
        // --- エラー特定のためのログ ---
        // 正常にパースされたことをログ出力します。
        util.log("INFO_SUCCESS: Successfully parsed Bedrock response. Content preview:", res.body.substring(0, Math.min(res.body.length, 200)) + (res.body.length > 200 ? "..." : ""));
        // --- エラー特定のためのログ ---
        return res;
    } else {
        // --- エラー特定のためのログ ---
        // 期待するBedrockのレスポンス構造と異なっていた場合のログ出力。
        // これが `TypeError: Cannot read property '0' of undefined` の直接の原因である可能性が高いです。
        util.error("ERROR_STRUCTURE: Unexpected Bedrock response structure.");
        util.error("ERROR_STRUCTURE: Received parsed response:", JSON.stringify(parsedBody, null, 2));
        // --- エラー特定のためのログ ---
        return { body: "レシピの解析中にエラーが発生しました: 予期せぬレスポンス構造。" };
    }
}