/**
 * Downloads all recommended Ollama models.
 * Run once before starting the app:  npm run setup
 */
const { execSync } = require('child_process');
const { RECOMMENDED_MODELS } = require('../utils/ollamaClient');

console.log('=== Ollama model setup ===');
console.log(`Will pull ${RECOMMENDED_MODELS.length} models. This may take several minutes on first run.\n`);

for (const model of RECOMMENDED_MODELS) {
    console.log(`\n--- Pulling ${model} ---`);
    try {
        execSync(`ollama pull ${model}`, { stdio: 'inherit' });
        console.log(`✓ ${model} ready`);
    } catch {
        console.error(`✗ Failed to pull ${model}. Is Ollama running? (ollama serve)`);
    }
}

console.log('\n=== Setup complete. Run "npm start" to start the server. ===\n');
