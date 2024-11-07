interface Config {
  baseUrl: string;
  port: number;
  openAiKey: string;
  env: string;
}

const development: Config = {
  baseUrl: "http://localhost",
  port: 8080,
  openAiKey: process.env.OPENAI_API_KEY || "",
  env: "development",
};

const production: Config = {
  baseUrl: process.env.BASEURL || "",
  port: parseInt(process.env.PORT || "3000"),
  openAiKey: process.env.OPENAI_API_KEY || "",
  env: "production",
};

const config: Config =
  process.env.NODE_ENV === "production" ? production : development;

export default config;
