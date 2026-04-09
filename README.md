## System Architecture

### REST API Routing Table

Below is the current routing table for our Express.js backend, separating our frontend page routes from our backend API endpoints.

---
### Frontend Page Routes
| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| **GET** | `/` | Renders the Landing/Login page |
| **GET** | `/signup` | Renders the Account Creation page |
| **GET** | `/choose-player` | Renders the Persona Selection screen |
| **GET** | `/chat` | Renders the main LLM Chat interface |
| **GET** | `/forgot-password` | Renders the Forgot Password Page |
| **GET** | `/reset-password` | Renders the Reset Password page |

---
## Authentication API Routes
| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| **POST** | `/api/signup` | Accepts `{email, password}` to register a new user |
| **POST** | `/api/login` | Validates `{email, password}` to authenticate users |
| **POST** | `/api/logout` | Logs out the current user and clears the session |
| **POST** | `/api/forgot-password` | Generates a password reset token and logs a reset link |
| **POST** | `/api/reset-password` | Validates a reset token and updates the user's password |

---

## Chat + System API Routes
| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| **GET** | `/api/ollama-status` | Checks if Ollama is running |
| **GET** | `/api/warmup` | Warms up the Ollama model to reduce first‑reply latency |
| **GET** | `/api/conversations` | Returns all conversations for the logged‑in user |
| **POST** | `/api/conversations` | Creates a new conversation |
| **PATCH** | `/api/conversations/:conversationId` | Updates conversation metadata for favoriting |
| **DELETE** | `/api/conversations/:conversationId` | Deletes a conversation |
| **POST** | `/api/conversations/:conversationId/messages` | Adds user input or AI responses into chat |
| **POST** | `/api/conversations/:conversationId/ai-reply` | Generates an AI reply using Ollama |


### Database Design



For the current development iteration, we are utilizing a **File-Based JSON Storage** so that the user data is persistent across server restarts. This allows login, logout, password reset, and conversations to persist even if the server restarts. These files are loaded and saved using Node’s fs module into our `/data` directory.

| File | Purpose |
| :--- | :--- |
| users.json | Stores registered users email and password |
| sessions.json | Stores active login sesssions |
| resetTokens.json | Stores password reset tokens with expiration timestamps |
| conversations.json | Stores all users conversations |


### Entity: User
* `email` (String) - acts as the unique identifier/username.
* `password` (String) - currently stored as plaintext for QA testing (Note: Password hashing via bcrypt will be implemented in future iterations).

### Entity: Conversation
* `id` - unique conversation ID
* `email` - owner of the conversation
* `messages[]` - array of `{type, text, at}`
* `pinned` - boolean
* `updatedAt` - timestamp

---

### Local Ollama Chat Integration

This project can generate AI chat replies from a local Ollama instance (no API key required).

## Setup
1. Install Ollama from the official site: https://ollama.com
2. Install a model (default used by this project):
	- `llama3.2:latest`
3. Pull the model
	- `ollama pull llama3.2:latest`
4. Start Ollama (default local server):
	- `ollama serve`

## Default Environment Variables 

You can override the default environment variables using an .env in the project root. If no `.env` is provided, the backend defaults to: 

- `OLLAMA_BASE_URL = http://127.0.0.1:11434`
- `OLLAMA_MODEL = llama3.2:latest`

The frontend checks `/api/ollama-status` to determine whether Ollama is running. If Ollama is offline or unavailable, the chat UI displays a warning banner and disables message input. `/api/conversations/:id/ai-reply` also throws an error: `503 { "error": "ollama-failed" }`.

## Ollama Warm-Up Behavior

To reduce slow first responses, the backend performs **two warm-ups**. The first is an automatic warm-up on server start, performed in `server.js` after a short delay. The second is a Frontend-triggered warmup, which calls `/api/warmup` to perform a warmup when ollama is detected by `/api/ollama-status`.

## Ollama Timeout

If Ollama takes more than 30 seconds to respond, `/api/conversations/:id/ai-reply` will throw an error: `503 { "error": "ollama-failed" }`. The front end will then display a fallback message, which is still saved into conversation history:
> “Sorry, I'm having trouble responding right now. Please try again.”
