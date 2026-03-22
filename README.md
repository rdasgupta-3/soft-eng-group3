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
| **POST** | `/api/login` | Validates `{email, password}` to authenticate users |

---

### Database Design



For the current development iteration, we are utilizing an in-memory data store (a server-side array) to rapidly prototype the login and sign-up flows before integrating a formal database (like MongoDB or PostgreSQL). 

**Entity: User**
* `email` (String) - acts as the unique identifier/username.
* `password` (String) - currently stored as plaintext for QA testing (Note: Password hashing via bcrypt will be implemented in future iterations).
