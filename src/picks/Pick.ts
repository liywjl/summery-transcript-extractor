export type PickKind = "youtube" | "article";

export type Pick = {
  url: string;
  title: string;
  kind: PickKind;
  source?: string;
};
