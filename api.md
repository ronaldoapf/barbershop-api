# API Endpoints Documentation

## Auth Endpoints

### 1. Authenticate with Password
- **POST** `/auth/password`
- **Description:** Authenticate a user with email and password.
- **Request Body:** See `authWithPasswordSchema`
- **Response:** 200 OK

### 2. Send Auth Code
- **POST** `/auth/code/send`
- **Description:** Send an authentication code to the user's email.
- **Request Body:** See `sendAuthCodeSchema`
- **Response:** 200 OK

### 3. Authenticate with Code
- **POST** `/auth/code`
- **Description:** Authenticate a user with a code.
- **Request Body:** See `authenticateWithCodeSchema`
- **Response:** 200 OK

---

## User Endpoints

### 4. Create User
- **POST** `/users`
- **Description:** Create a new user in the system.
- **Request Body:** See `createUserSchema`
- **Response:** 201 Created

### 5. Forgot Passwor
- **POST** `/users/password/forgot`
- **Description:** Request password recovery for a user.
- **Request Body:** See `recoveryPasswordSchema`
- **Response:** 201 Created

### 6. Reset Password
- **POST** `/users/password/reset`
- **Description:** Reset a user's password using a token.
- **Request Body:** See `resetPasswordSchema`
- **Response:** 200 OK

---

## Notes for AI/Frontend Integration

- All endpoints use JSON request/response.
- Request body schemas are defined in the corresponding DTO files (e.g., `src/modules/auth/dtos/` and `src/modules/users/dtos/`).
- The API is documented with OpenAPI/Swagger at `/docs` (auto-generated).
