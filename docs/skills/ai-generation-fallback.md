# AI Generation Fallback Order

優先順固定：

1. OpenAI
2. Claude
3. Gemini（将来）

ルール：
- preferred指定がある場合は尊重
- エラー時のみ次へフォールバック
- 同一リクエストで複数AI同時呼び出しは禁止