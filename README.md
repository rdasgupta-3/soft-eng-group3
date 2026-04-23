## System Architecture

### REST API Routing Table

Below is the current routing table for our Express.js backend, separating our frontend page routes from our backend API endpoints.

---
## Frontend Page Routes
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

---

### Database Design



For the current development iteration, we are utilizing a **File-Based JSON Storage** so that the user data is persistent across server restarts. This allows login, logout, password reset, and conversations to persist even if the server restarts. These files are loaded and saved using Node’s fs module into our `/data` directory.

| File | Purpose |
| :--- | :--- |
| users.json | Stores registered users email and password |
| sessions.json | Stores active login sesssions |
| resetTokens.json | Stores password reset tokens with expiration timestamps |
| conversations.json | Stores all users conversations |


## Entity: User
* `email` (String) - acts as the unique identifier/username.
* `password` (String) - currently stored as plaintext for QA testing (Note: Password hashing via bcrypt will be implemented in future iterations).

## Entity: Conversation
* `id` - unique conversation ID
* `email` - owner of the conversation
* `messages[]` - array of `{type, text, at}`
* `pinned` - boolean
* `updatedAt` - timestamp

---

### Local Ollama Chat Integration

For this iteration, the base ollama model has now been replaced by three different local ollama models. Users now recieve 3 reponses to their first chat input, where they can then pick one of the responses and continue the chat talk to the model the chosen response corrresponds to.

## Installing Required Models

This project uses three local models:

- Phi 3.8B (Microsoft)
- Gemma 2B (Google)
- DeepSeek R1 1.5B (DeepSeek)

All these models can be found and installed at https://ollama.com/search
Alternatively, to install them all at once you may run the command:

`npm run setup`

This command will run a script that downloads all models necessary for the LLM.

## Default Environment Variables 

You can override the default environment variables using an .env in the project root. If no `.env` is provided, the backend defaults to: 

- `OLLAMA_BASE_URL = http://127.0.0.1:11434`
- `OLLAMA_MODEL = llama3.2:latest`

The frontend checks `/api/ollama-status` to determine whether Ollama is running. If Ollama is offline or unavailable, the chat UI displays a warning banner and disables message input. `/api/conversations/:id/ai-reply` also throws an error: `503 { "error": "ollama-failed" }`.

## Ollama Timeout

If Ollama takes more than 30 seconds to respond, `/api/conversations/:id/ai-reply` will throw an error: `503 { "error": "ollama-failed" }`. The front end will then display a fallback message, which is still saved into conversation history:
> “Sorry, I'm having trouble responding right now. Please try again.”
