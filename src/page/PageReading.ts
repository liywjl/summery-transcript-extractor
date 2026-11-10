import type { Pick } from "../picks/Pick";
import type { PageExtract } from "./extractDocument";

export type ArticleReading = {
  shape: "article";
  extract: PageExtract;
};

export type ListingReading = {
  shape: "listing";
  title: string;
  url: string;
  links: Pick[];
};

export type PageReading = ArticleReading | ListingReading;
