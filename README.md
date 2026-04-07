## System Architecture

### REST API Routing Table

Below is the current routing table for our Express.js backend, separating our frontend views from our backend data endpoints.

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| **GET** | `/` | Renders the Landing/Login page |
| **GET** | `/signup` | Renders the Account Creation page |
| **GET** | `/choose-player` | Renders the Persona Selection screen |
| **GET** | `/chat` | Renders the main LLM Chat interface |
| **POST** | `/api/signup` | Accepts `{email, password}` to register a new user |
| **GET** | `/api/ollama-status` | Checks if Ollama is running |
| **POST** | `/api/login` | Validates `{email, password}` to authenticate users |

---

### Database Design



For the current development iteration, we are utilizing a File-Based JSON Storage so that the user data is persistent across server restarts. This allows login, logout, password reset, and conversations to persist even if the server restarts. The files in our data folder files are loaded and saved using Node’s fs module.

Located in /data/:
| File | Purpose |
| :--- | :--- |
| users.json | Stores registered users email and password |
| sessions.json | Stores active login sesssions |
| resetTokens.json | Stores password-reset tokens with expiration timestamps |
| conversations.json | Stores users conversations for conversation history |


**Entity: User**
* `email` (String) - acts as the unique identifier/username.
* `password` (String) - currently stored as plaintext for QA testing (Note: Password hashing via bcrypt will be implemented in future iterations).

---

### Local Ollama Chat Integration

This project can generate AI chat replies from a local Ollama instance (no API key required).

1. Install Ollama from the official site: https://ollama.com
2. Install a model (default used by this project):
	- `llama3.2:latest`
3. Pull the model
	- `ollama pull llama3.2:latest`
4. Start Ollama (default local server):
	- `ollama serve`

You can override the default environment variables using an .env in the project root. If no .env is provided, the app automatically defaults to: 

- `OLLAMA_BASE_URL = http://127.0.0.1:11434`
- `OLLAMA_MODEL = llama3.2:latest`

The frontend checks `/api/ollama-status` to determine whether Ollama is running. If Ollama is offline or unavailable, the chat UI displays a warning banner and disables message input. If this error check fails or, the backend falls back to a safe placeholder assistant response so chat flow still works.
