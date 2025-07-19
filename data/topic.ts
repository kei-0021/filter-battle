export type TopicWithFilters = {
  id: number;
  title: string;
  filters: string[];
};

export const topics: TopicWithFilters[] = [
  { id: 1, title: "家あるある", filters: ["掃除好き", "節約重視", "ペット中心"] },
  { id: 2, title: "学校あるある", filters: ["勉強熱心", "部活一筋", "給食批判"] },
  { id: 3, title: "職場あるある", filters: ["残業多め", "上司厳しい", "休憩は大事"] },
  { id: 4, title: "コンビニあるある", filters: ["深夜営業", "限定商品", "店員笑顔"] },
  { id: 5, title: "電車あるある", filters: ["遅延常習", "満員電車", "優先席争奪戦"] },
  { id: 6, title: "リモート授業 / ワークあるある", filters: ["回線切断", "背景気になる", "音声ミュート"] },
  { id: 7, title: "兄弟姉妹あるある", filters: ["おもちゃ取り合い", "秘密共有", "ケンカ多め"] },
  { id: 8, title: "料理あるある", filters: ["焦がす", "味見しない", "レシピ見ながら"] },
  { id: 9, title: "SNSあるある", filters: ["炎上", "いいね欲しい", "フォロワー増やし"] },
  { id: 10, title: "旅行あるある", filters: ["荷物多すぎ", "写真撮りすぎ", "迷子必至"] },
];
