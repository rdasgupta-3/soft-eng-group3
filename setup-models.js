const { execSync } = require("child_process");

const models = [
  "phi3:3.8b",
  "gemma2:2b",
  "deepseek-r1:1.5b"
];

console.log("Pulling Ollama models...");

for (const model of models) {
  try {
    console.log(`\n Pulling ${model}...`);
    execSync(`ollama pull ${model}`, { stdio: "inherit" });
  } catch (err) {
    console.error(`Failed to pull ${model}`);
  }
}

console.log("\n All models processed.");