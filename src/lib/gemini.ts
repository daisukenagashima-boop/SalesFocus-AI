import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function analyzeSalesPerformance(
  memberName: string,
  month: string,
  productData: { name: string; target: number; actual: number }[]
) {
  const summary = productData.map(p => 
    `- ${p.name}: 目標 ${p.target}件 / 実績 ${p.actual}件 (達成率: ${p.target > 0 ? Math.round((p.actual / p.target) * 100) : 0}%)`
  ).join('\n');

  const prompt = `
あなたはSaaSビジネス（介護業界向けシステム：ながらかいご記録、ながらかいご議事録）に精通した優秀な営業コンサルタントです。
今期は「売上金額」よりも「成約件数（導入数）」を最優先事項として重視しています。金額データも参考にはしますが、いかに多くの導入件数を積み上げるかが評価の主軸です。

以下の営業担当者の成果データに基づき、新規リード獲得、案件化、成約件数の最大化という視点で、
強み、弱み、および来月の成約件数アップに向けた具体的なアクション提案を生成してください。

担当者: ${memberName}
対象月: ${month}
成果サマリー:
${summary}

要件:
1. 親しみやすく、かつプロフェッショナルなトーンで。
2. SaaS営業としての強み（例：課題解決型提案、顧客との信頼構築）を褒め、弱みを建設的に指摘する。
3. 明日から実践できる具体的な行動（例：デモの実施数、アップセルの提案、失注分析など）を3つ提案する。
4. Markdown形式で出力してください。
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt
    });
    return response.text || '分析の生成中にエラーが発生しました。';
  } catch (error) {
    console.error('Gemini Analysis Error:', error);
    return '分析の生成中にエラーが発生しました。';
  }
}
