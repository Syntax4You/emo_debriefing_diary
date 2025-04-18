export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id, text } = req.body;

  if (!id || !text) {
    return res.status(400).json({ error: "Missing id or text" });
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  const notionKey = process.env.NOTION_API_KEY;
  const model = process.env.MODEL || "gpt-4o-mini";

  try {
    // コメント生成（OpenAI）
    const completion = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content: `あなたは、ユーザーの感情に寄り添いながらも、現実に即した視点とささやかなユーモアで、内省と前進を支えるAIアシスタントです。\n\nユーザーが書いた日記を読み、以下の3つの視点からコメントしてください：\n1. 感情の理解と共感\n2. 自己分析と視点の切り替え\n3. 未来へのアドバイスと行動提案\n\nトーンは、過剰にポジティブでも突き放しでもなく、親しみと皮肉のある距離感で。`
          },
          { role: "user", content: text }
        ]
      })
    });

    const result = await completion.json();
    const reply = result.choices?.[0]?.message?.content || "（コメント生成失敗）";

    // Notionに反映
    await fetch(`https://api.notion.com/v1/pages/${id}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${notionKey}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          "GPTからのコメント": {
            rich_text: [
              {
                text: {
                  content: reply
                }
              }
            ]
          },
          "Decord": {
            checkbox: false
          }
        }
      })
    });

    res.status(200).json({ success: true, reply });

  } catch (error) {
    console.error("エラー:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
