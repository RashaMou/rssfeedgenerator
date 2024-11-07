interface Config {
  baseUrl: string;
  port: number;
  openAiKey: string;
}

const development: Config = {
  baseUrl: "http://localhost:3000",
  port: 3000,
  openAiKey: process.env.OPENAI_API_KEY || "",
};

const production: Config = {
  baseUrl: "https://rasha.dev/feedatron",
  port: parseInt(process.env.PORT || "3000"),
  openAiKey: process.env.OPENAI_API_KEY || "",
};

const config: Config =
  process.env.NODE_ENV === "production" ? production : development;

export default config;
