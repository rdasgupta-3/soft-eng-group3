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
| **GET** | `/api/conversations` | Returns all conversations for the logged‑in user |
| **POST** | `/api/conversations` | Creates a new conversation |
| **PATCH** | `/api/conversations/:conversationId` | Updates conversation metadata for favoriting, titling, and selecting an LLM model |
| **DELETE** | `/api/conversations/:conversationId` | Deletes a conversation |
| **POST** | `/api/conversations/:conversationId/messages` | Adds user input or AI responses into chat |
| **POST** | `/api/conversations/:conversationId/multi-reply` | Sends the same user input prompt to the 3 local LLM models simultaneously and returns three responses |
| **POST** | `/api/conversations/:conversationId/select-model` | Saves the user's chosen model (phi, gemma, or deepseek) |
| **POST** | `/api/conversations/:conversationId/ai-reply` | Generates an AI reply using only the selected model |

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
* `title` - auto-generated from first user message
* `messages[]` - array of `{type, text, at}`
* `pinned` - boolean
* `updatedAt` - timestamp
* `selectedModel` - `"phi"`, `"gemma"`, `"deepseek"`, or `null`

---

### Local Ollama Chat Integration

For this iteration, the base ollama model has now been replaced by three different local ollama models. Users now recieve 3 responses to their first chat input, where they can then pick one of the responses and continue the chat talk to the model the chosen response corrresponds to.

## Installing Required Local Models

In this iteration, the previous Ollama model has been replaces with 3 specific differing local LLM models. They were chosen to get a wider range of LLM responses while still not having a demanding download size:

| Model | Size |
| :--- | :--- |
| phi3:3.8b (Microsoft) | 2.2 GB |
| gemma2:2b (Google) | 1.6 GB |
| deepseek-r1:1.5b (DeepSeek) | 1.1 GB |

All these models can be found and installed at https://ollama.com/search
Alternatively, to install them all at once you may run the command:

`npm run setup`

This command will run a script that pulls all models necessary for the LLM.

## Ollama Status 

The frontend checks `/api/ollama-status` to determine whether Ollama is running. If Ollama is offline or unavailable, the chat UI displays a warning banner and disables message input. `/api/conversations/:id/ai-reply` also throws an error: `503 { "error": "ollama-failed" }`.

## Ollama Timeout

If any model takes more than 60 seconds to respond, `/api/conversations/:id/multi-reply` will hide the model that failed to respond, and send a fallback message to the frontend when all three models fail to respond:
> "Sorry, all models failed to respond. Please try again."

If one model has already been selected but the model timesout, `/api/conversations/:id/ai-reply` will throw an error: `503 { "error": "ollama-failed" }`. The front end will then display a fallback message, which is still saved into conversation history:
> “Sorry, I'm having trouble responding right now. Please try again.”
