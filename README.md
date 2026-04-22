# Triad.AI by Rishita Dasgupta

Triad.AI is the completed Individual Iteration-1 project.

The finished app includes:

- increase/decrease text-size controls for prompts and responses
- bold-text and high-contrast accessibility controls
- three side-by-side model responses per prompt
- persona switching that updates the active chat workspace correctly
- login, signup, forgot-password, and reset-password flows
- persona selection before chat
- saved conversation history with search, star, continue, and delete
- starred conversation persistence across logout and login
- Ollama status detection, warm-up, timeout handling, and a thinking/typewriter experience

## Pages

- `/` login
- `/signup`
- `/forgot-password`
- `/reset-password`
- `/choose-player`
- `/chat`

## Install And Run

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

## Tests

Unit test suites with Jasmine:

```bash
npm run test:unit:pages
npm run test:unit:logic
npm run test:unit
```

Browser acceptance suites with Cucumber.js and Puppeteer:

```bash
npm run test:acceptance:auth
npm run test:acceptance:accessibility
npm run test:acceptance:ollama
npm run test:acceptance:persona
npm run test:acceptance:comparison
npm run test:acceptance:recovery
npm run test:acceptance:history
npm run test:acceptance
npm run test:acceptance:visible
npm run test:acceptance:headless
```

`npm run test:acceptance` launches a visible browser window by default so you can watch the automation. Puppeteer will prefer installed Google Chrome when available and fall back to its bundled Chromium if Chrome is not installed.

Run both:

```bash
npm test
```

## Project Structure

- [public/chat.html]
- [public/style.css]
- [routes/chatRoutes.js]
- [utils/ollamaClient.js]
- [spec/chatPage.spec.js]
- [spec/preferencesStore.spec.js]
- [spec/ollamaClient.spec.js]
- [spec/support/jasmine-pages.mjs]
- [spec/support/jasmine-logic.mjs]
- [features/individual/authentication.feature]
- [features/individual/ollama-behavior.feature]
- [features/individual/multi-model.feature]
- [features/individual/persona-switching.feature]
- [features/individual/conversation-history.feature]
- [docs/individual-iteration-1-report.md]
