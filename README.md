## System Architecture

### REST API Routing Table

Below is the current routing table for our Express.js backend, separating our frontend views from our backend data endpoints.

**Page routes**

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| **GET** | `/` | Renders the Login page |
| **GET** | `/signup` | Renders the Account Creation page |
| **GET** | `/forgot-password` | Renders the Forgot Password page |
| **GET** | `/reset-password` | Renders the Reset Password page |
| **GET** | `/choose-player` | Renders the Persona Selection screen |
| **GET** | `/chat` | Renders the main LLM Chat interface |

**Auth API endpoints (`/api/...`)**

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| **POST** | `/api/signup` | Accepts `{email, password}` to register a new user |
| **POST** | `/api/login` | Validates `{email, password}`, sets session cookie |
| **POST** | `/api/logout` | Destroys session and clears session cookie |
| **POST** | `/api/forgot-password` | Generates a password reset token (printed to server console) |
| **POST** | `/api/reset-password` | Accepts `{token, newPassword}` to apply a new password |

**Chat API endpoints (`/api/...`, require login)**

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| **GET** | `/api/ollama-status` | Returns `{ ok: true/false }` indicating whether Ollama is reachable |
| **GET** | `/api/ollama-models` | Returns sorted list of installed Ollama models |
| **GET** | `/api/conversations` | List all conversations for the logged-in user |
| **POST** | `/api/conversations` | Create a new conversation |
| **PATCH** | `/api/conversations/:id` | Update conversation title or pinned status |
| **DELETE** | `/api/conversations/:id` | Delete a conversation |
| **POST** | `/api/conversations/:id/messages` | Append a message to a conversation |
| **POST** | `/api/conversations/:id/ai-reply` | Generate and save AI response(s) via Ollama |

---

### Data Storage

All data is stored **in-memory** (server-side JavaScript objects). No database is required. Data is cleared when the server restarts. This is intentional for this project scope.

**Entity: User**
* `email` (String) — acts as the unique identifier/username.
* `password` (String) — stored as a salted **scrypt** hash (Node.js built-in `crypto` module). Passwords are never stored as plaintext.

**Entity: Conversation**
* `id` (String) — unique ID generated at creation time.
* `title` (String) — auto-set from the first user message.
* `pinned` (Boolean) — whether the conversation is starred/pinned.
* `persona` (String|null) — the AI persona active when the conversation was started.
* `messages` (Array) — list of `{ type, text, at, model }` message objects.

---

### Local Ollama Chat Integration

This project generates AI chat replies from a local Ollama instance (no API key required).

1. Install Ollama from [ollama.com](https://ollama.com).
2. Start the Ollama daemon:
   - `ollama serve`
3. Pull the recommended models (or use the included setup script):
   - `npm run setup` — pulls all four recommended models automatically
   - Or manually: `ollama pull llama3.2:latest`

Recommended models:

| Model | Publisher | Size |
| :--- | :--- | :--- |
| `llama3.2:latest` | Meta (default) | ~2.0 GB |
| `gemma3:1b` | Google | ~0.8 GB |
| `phi3:mini` | Microsoft | ~2.3 GB |
| `qwen2.5:3b` | Alibaba | ~1.9 GB |

Optional environment variables:

- `OLLAMA_BASE_URL` (default: `http://127.0.0.1:11434`)
- `OLLAMA_MODEL` (default: `llama3.2:latest`)

If Ollama is unavailable, the chat page displays a warning banner and disables the message input until Ollama is reachable.
