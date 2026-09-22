import business from "./questions/business.json";
import tech from "./questions/tech.json";
import international from "./questions/international.json";
import slang from "./questions/slang.json";

export const QUESTIONS_BY_CATEGORY = {
  business,
  tech,
  international,
  slang,
};

export const ALL_QUESTIONS = [
  ...business,
  ...tech,
  ...international,
  ...slang,
];
