// bedrock.js ファイルの内容

// AppSync JavaScript リゾルバー環境では、`util` オブジェクトがグローバルに提供され、
// ログ出力などに使用できます。通常、import/require は不要です。
// もし、`util` が未定義エラーになる場合は、チュートリアルの他の AppSync JS リゾルバーの例を
// 確認し、`util` の取得方法（もしあれば）を参照してください。

/**
 * Amazon Bedrock で Claude 3 Sonnet 基礎モデルを呼び出すための HTTP リクエストを構築する関数。
 *
 * @param {object} ctx - AppSync リゾルバーのコンテキストオブジェクト。
 * @param {object} ctx.args - リゾルバーに渡された引数。
 * @param {Array<string>} ctx.args.ingredients - 材料の配列。
 * @returns {object} HTTP リクエストの設定。
 */
function request(ctx) { // ★`export` キーワードを削除しました★
    // ctx.args から ingredients を取得。もし undefined なら空の配列をデフォルトとする。
    const { ingredients = [] } = ctx.args;
  
    // ingredients が配列であることを保証し、安全に結合する
    const promptIngredients = Array.isArray(ingredients) ? ingredients.join(", ") : String(ingredients);
    
    // プロンプトを構築
    const prompt = `Suggest a recipe idea using these ingredients: ${promptIngredients}.`;
  
    // --- エラー特定のためのログ ---
    // ここでBedrockに送られるプロンプトをログ出力します。
    // AppSyncのロググループ（CloudWatch Logs）で確認できます。
    util.log("DEBUG: Constructed prompt for Bedrock:", prompt);
    // --- エラー特定のためのログ ---

    // HTTP リクエストの設定を返す
    return {
      resourcePath: `/model/anthropic.claude-3-sonnet-20240229-v1:0/invoke`, // モデルIDはチュートリアルと一致しているか確認
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
   * @param {object} ctx - AppSync リゾルバーのコンテキストオブジェクト。
   * @param {object} ctx.result - データソースからの結果。
   * @param {string} ctx.result.body - データソースからのレスポンスボディ（文字列）。
   * @param {object} [ctx.error] - リクエストが失敗した場合のエラー詳細。
   * @returns {object} レスポンスオブジェクト（bodyプロパティに生成されたレシピテキストを含む）。
   */
function response(ctx) { // ★`export` キーワードを削除しました★
    // --- エラー特定のためのログ ---
    // Bedrockからの生のレスポンスボディをログ出力します。
    // これにより、もしBedrockからのレスポンスが期待と異なる形式であっても確認できます。
    util.log("DEBUG: Raw Bedrock response body:", ctx.result.body);
    // --- エラー特定のためのログ ---

    // AppSyncのリゾルバーレベルでエラーが発生した場合のハンドリング
    if (ctx.error) {
        // --- エラー特定のためのログ ---
        // リゾルバーの実行中にエラーが発生した場合の情報をログ出力します。
        // 例: 権限不足、タイムアウトなど。
        util.error("ERROR: AppSync Resolver encountered an error:", JSON.stringify(ctx.error, null, 2));
        // --- エラー特定のためのログ ---
        return { body: "レシピの生成中にエラーが発生しました。詳細についてはバックエンドログを確認してください。" };
    }

    let parsedBody;
    try {
        // レスポンスボディをJSONとしてパース
        parsedBody = JSON.parse(ctx.result.body);
    } catch (parseError) {
        // --- エラー特定のためのログ ---
        // JSONパースに失敗した場合のログ出力。Bedrockが不正なJSONを返した場合に発生します。
        util.error("ERROR: Failed to parse Bedrock response body as JSON:", parseError);
        util.error("ERROR: Invalid body content:", ctx.result.body);
        // --- エラー特定のためのログ ---
        return { body: "レシピの解析中にエラーが発生しました: 無効なレスポンス形式。" };
    }

    // レスポンス構造の検証とテキストコンテンツの抽出
    // `TypeError: Cannot read property '0' of undefined` を防ぐための主要な防御策です。
    if (
        parsedBody &&
        Array.isArray(parsedBody.content) && // `content` プロパティが配列であるか
        parsedBody.content.length > 0 &&     // `content` 配列が空ではないか
        parsedBody.content[0] &&             // 配列の最初の要素が存在するか
        parsedBody.content[0].type === "text" && // 最初の要素の `type` が 'text' であるか
        typeof parsedBody.content[0].text === "string" // `text` プロパティが文字列であるか
    ) {
        // レスポンスからテキストコンテンツを抽出
        const res = {
            body: parsedBody.content[0].text,
        };
        // --- エラー特定のためのログ ---
        // 正常にパースされたことをログ出力します。
        util.log("INFO: Successfully parsed Bedrock response. Generated content preview:", res.body.substring(0, Math.min(res.body.length, 200)) + (res.body.length > 200 ? "..." : ""));
        // --- エラー特定のためのログ ---
        return res;
    } else {
        // --- エラー特定のためのログ ---
        // 期待するBedrockのレスポンス構造と異なっていた場合のログ出力。
        // これにより、 Bedrock から予期せぬ形式の応答が来たことを確認できます。
        util.error("ERROR: Unexpected Bedrock response structure.");
        util.error("ERROR: Received response:", JSON.stringify(parsedBody, null, 2));
        // --- エラー特定のためのログ ---
        return { body: "レシピの解析中にエラーが発生しました: 予期せぬレスポンス構造。" };
    }
}