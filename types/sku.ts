export type NextActionType =
  | "image"
  | "title"
  | "condition"
  | "price"
  | "profit"
  | "ai_title"
  | "ai_description"
  | "listing"
  | "done";

export type NextAction = {
  type: NextActionType;
  label: string;
  description: string;
};
