export type Filter =
  | '教育重視'
  | '地元主義'
  | '陰謀論'
  | 'SNS炎上';

export type IncidentCard = {
  id: string;
  theme: string;
  category: string;
  truth: string;
  views: Record<Filter, string>;
};
