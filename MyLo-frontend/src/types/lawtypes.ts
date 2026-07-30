export interface LawArticle {
  title: string;
  content: string;
}

export interface LawDetails {
  id: string;
  lawNumber: string;
  title: string;
  description: string;
  articles: LawArticle[];
  aiSummary: string;
}
