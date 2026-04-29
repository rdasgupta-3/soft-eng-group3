# Triad.ai - Iteration 3 Practical Personality Assistant

Triad.ai is a Node.js + Express chatbot application for Iteration 3. The app supports account login, personality selection, up to three selected backend LLMs, conversation history, and practical AI queries backed by deterministic tools.

Current practical assistant capabilities:

- Select backend LLMs from local Ollama models and public model slots for GPT, Gemini, and Claude.
- Choose an AI personality: Mr. Professional, Miss Sweetheart, or Lord Silly the Ninth.
- Ask math, date/time, weather, or general questions.
- Use API-backed tools for factual math, date/time, and weather answers.
- Apply personality as tone only; the selected personality should not change the factual content.
- Render three model responses from the same shared factual tool result.
- Customize the user's display name and profile picture in the chat UI.

---

## System Architecture

### REST API Routing Table

Below is the current routing table for our Express.js backend, separating our frontend views from our backend data endpoints.

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| **GET** | `/` | Renders the Landing/Login page |
| **GET** | `/signup` | Renders the Account Creation page |
| **GET** | `/forgot-password` | Renders the Forgot Password page |
| **GET** | `/reset-password` | Renders the Reset Password page |
| **GET** | `/choose-player` | Renders the Persona Selection screen |
| **GET** | `/chat` | Renders the main LLM Chat interface |
| **POST** | `/api/signup` | Accepts `{email, password}` to register a new user |
| **POST** | `/api/login` | Validates `{email, password}` to authenticate users |
| **POST** | `/api/logout` | Clears the active login session |
| **GET** | `/api/me` | Returns the logged-in user's email |
| **GET** | `/api/models` | Returns available local/public backend model choices |
| **GET** | `/api/conversations` | Lists saved conversations for the logged-in user |
| **POST** | `/api/conversations` | Creates a new conversation with selected model IDs |
| **PATCH** | `/api/conversations/:conversationId` | Updates conversation metadata such as pinning or selected models |
| **DELETE** | `/api/conversations/:conversationId` | Deletes a conversation |
| **POST** | `/api/conversations/:conversationId/messages` | Saves a user or assistant message |
| **POST** | `/api/conversations/:conversationId/ai-reply` | Generates replies from the selected backend models |

---

### Database Design



For the current development iteration, the application uses lightweight JSON-backed stores for local development and testing rather than a production database. This keeps the project easy to run while preserving persistent users, sessions, and conversation history during local QA.

**Entity: User**
* `email` (String) - acts as the unique identifier/username.
* `password` (String) - currently stored as plaintext for QA testing (Note: Password hashing via bcrypt will be implemented in future iterations).

**Entity: Conversation**
* `id` (String) - unique conversation identifier.
* `selectedModelIds` (Array) - up to three backend models selected for comparison.
* `messages` (Array) - saved user and assistant messages, including model metadata, persona metadata, tool-call metadata, retrieved context, in-context examples, and reasoning summaries.
* `pinned` (Boolean) - supports chat history management.

---

### Practical Assistant Backend

The main assistant implementation lives in `utils/practicalAssistant.js`; model orchestration lives in `utils/llmService.js`; available models are defined in `utils/modelCatalog.js`.

The backend combines four required AI techniques:

- **Tool calling:** `TOOL_REGISTRY` dispatches math, date/time, and weather requests to API-backed tools.
- **Retrieval-augmented generation:** `retrieveContext` scores local guidance entries and includes relevant context in metadata and prompts.
- **In-context learning:** `selectInContextExamples` selects few-shot examples by intent and personality.
- **Chain-of-thought planning summary:** `buildReasoningPlan` stores a concise audit summary without exposing hidden chain-of-thought to users.

External factual sources:

- Math: math.js API at `https://api.mathjs.org/v4/`
- Date/time: TimeAPI at `https://timeapi.io/api/Time/current/zone`
- Weather: Open-Meteo geocoding and forecast APIs

General non-tool queries use a separate prompt path through `handleGeneralQuery`, with a quality validator in `utils/responseQuality.js` to retry low-quality, echo-like, or meta-reasoning responses.

---

### Backend Model Selection

The app supports up to three active backend models per chat. Current model slots:

- `ollama-llama3.2-1b` - local Ollama model
- `ollama-qwen2.5-1.5b` - local Ollama model
- `openai-gpt-4o-mini` - public OpenAI slot
- `google-gemini-2.0-flash` - public Gemini slot
- `anthropic-claude-3-5-haiku` - public Claude slot

Public providers require API keys. If a provider key is unavailable, the app keeps the chat flow alive with a local fallback response.

Optional environment variables:

- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `ANTHROPIC_API_KEY`
- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`

---

### Local Ollama Chat Integration

This project can generate AI chat replies from a local Ollama instance (no API key required).

1. Install Ollama from the official site.
2. Pull a model (default used by this project):
	- `ollama pull llama3.2:1b`
3. Start Ollama (default local server):
	- `ollama serve`

Optional environment variables:

- `OLLAMA_BASE_URL` (default: `http://127.0.0.1:11434`)
- `OLLAMA_MODEL` (default: `llama3.2:1b`)

If Ollama is unavailable, the backend falls back to a safe placeholder assistant response so chat flow still works.

---

### Confidence-Aware Weather Signal Reconstruction

The Practical Personality Assistant extends the weather tool with confidence-aware fallback behavior. When a weather request is too precise or uncertain, the assistant invokes an INR/MLP-based signal reconstruction module (inspired by Rishita's current research topic) that approximates a continuous temperature trend from discrete hourly forecast samples.

Implementation files:

- `utils/confidenceEvaluator.js`
- `utils/weatherSignalReconstruction.js`
- `utils/queryParser.js`
- `utils/locationResolver.js`
- `utils/responseQuality.js`
- `utils/practicalAssistant.js`

---

### Testing

Unit tests:

```bash
npm run test:unit
```

Acceptance tests:

```bash
npm test
```

The main Iteration 3 unit coverage is in `spec/practicalAssistant.spec.js`. Cucumber coverage for the practical assistant is in `features/practical-assistant.feature`.

---

### Running The App

Install dependencies:

```bash
npm install
```

Start the server:

```bash
npm start
```

Open:

```text
http://localhost:3000
```

---

### Pupeteer Demo: 

https://youtu.be/_1y57lcVm14
