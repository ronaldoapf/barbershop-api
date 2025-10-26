# Barber Module - Manual Testing Guide

## Prerequisites
1. Server running: `pnpm dev`
2. Database running: `docker-compose up -d`
3. Base URL: `http://localhost:3333`

---

## Test Suite

### 1. Create First Barber (Admin creates barber account)

**Endpoint:** `POST /barbers`
**Auth:** Requires JWT token (We need to create the first barber directly in DB or without auth for now)

```bash
curl -X POST http://localhost:3333/barbers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Barber",
    "email": "john@barbershop.com",
    "password": "password123",
    "phoneNumber": "+1234567890",
    "bio": "Professional barber with 10 years experience",
    "role": "ADMIN"
  }'
```

**Expected:** 201 Created + Barber object (without password)

---

### 2. Barber Login (Authentication)

**Endpoint:** `POST /barbers/auth/login`

```bash
curl -X POST http://localhost:3333/barbers/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@barbershop.com",
    "password": "password123"
  }'
```

**Expected:** 200 OK + JWT token
**Save the token** for next requests!

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 3. List All Barbers (Public)

**Endpoint:** `GET /barbers`

```bash
curl http://localhost:3333/barbers
```

**Expected:** 200 OK + Array of barbers

---

### 4. Get Specific Barber (Public)

**Endpoint:** `GET /barbers/:id`

```bash
# Replace {BARBER_ID} with actual ID from previous response
curl http://localhost:3333/barbers/{BARBER_ID}
```

**Expected:** 200 OK + Barber object

---

### 5. Create Another Barber (Protected)

**Endpoint:** `POST /barbers`
**Auth:** Bearer token required

```bash
# Replace {TOKEN} with actual token from login
curl -X POST http://localhost:3333/barbers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {TOKEN}" \
  -d '{
    "name": "Jane Stylist",
    "email": "jane@barbershop.com",
    "password": "password123",
    "phoneNumber": "+1987654321",
    "bio": "Specialist in modern haircuts",
    "role": "BARBER"
  }'
```

**Expected:** 201 Created + Barber object

---

### 6. Update Barber (Protected)

**Endpoint:** `PUT /barbers/:id`
**Auth:** Bearer token required

```bash
# Replace {TOKEN} and {BARBER_ID}
curl -X PUT http://localhost:3333/barbers/{BARBER_ID} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {TOKEN}" \
  -d '{
    "bio": "Updated bio - 15 years of experience!",
    "phoneNumber": "+1111111111"
  }'
```

**Expected:** 200 OK + Updated barber object

---

### 7. Delete Barber (Protected)

**Endpoint:** `DELETE /barbers/:id`
**Auth:** Bearer token required

```bash
# Replace {TOKEN} and {BARBER_ID}
curl -X DELETE http://localhost:3333/barbers/{BARBER_ID} \
  -H "Authorization: Bearer {TOKEN}"
```

**Expected:** 204 No Content

---

## Test Scenarios

### ✅ Success Cases
- [x] Create barber with valid data
- [x] Login with correct credentials
- [x] List all barbers (public)
- [x] Get barber by ID (public)
- [x] Update barber with valid data (protected)
- [x] Delete barber (protected)

### ❌ Error Cases to Test

**1. Create barber with duplicate email:**
```bash
curl -X POST http://localhost:3333/barbers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {TOKEN}" \
  -d '{
    "name": "Duplicate",
    "email": "john@barbershop.com",
    "password": "password123"
  }'
```
**Expected:** 409 Conflict

**2. Login with wrong password:**
```bash
curl -X POST http://localhost:3333/barbers/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@barbershop.com",
    "password": "wrongpassword"
  }'
```
**Expected:** 401 Unauthorized

**3. Login with non-existent email:**
```bash
curl -X POST http://localhost:3333/barbers/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nonexistent@barbershop.com",
    "password": "password123"
  }'
```
**Expected:** 401 Unauthorized

**4. Access protected endpoint without token:**
```bash
curl -X POST http://localhost:3333/barbers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test",
    "email": "test@barbershop.com",
    "password": "password123"
  }'
```
**Expected:** 401 Unauthorized

**5. Get non-existent barber:**
```bash
curl http://localhost:3333/barbers/00000000-0000-0000-0000-000000000000
```
**Expected:** 404 Not Found

**6. Update non-existent barber:**
```bash
curl -X PUT http://localhost:3333/barbers/00000000-0000-0000-0000-000000000000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {TOKEN}" \
  -d '{"bio": "test"}'
```
**Expected:** 404 Not Found

---

## Quick Test Script

Run all tests in sequence:

```bash
#!/bin/bash

BASE_URL="http://localhost:3333"

echo "1. Creating first barber..."
RESPONSE=$(curl -s -X POST $BASE_URL/barbers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Barber",
    "email": "john@barbershop.com",
    "password": "password123",
    "phoneNumber": "+1234567890",
    "bio": "Professional barber",
    "role": "ADMIN"
  }')
echo $RESPONSE
BARBER_ID=$(echo $RESPONSE | jq -r '.id')

echo -e "\n2. Logging in..."
TOKEN_RESPONSE=$(curl -s -X POST $BASE_URL/barbers/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@barbershop.com",
    "password": "password123"
  }')
echo $TOKEN_RESPONSE
TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.token')

echo -e "\n3. Listing all barbers..."
curl -s $BASE_URL/barbers | jq

echo -e "\n4. Getting specific barber..."
curl -s $BASE_URL/barbers/$BARBER_ID | jq

echo -e "\n5. Updating barber..."
curl -s -X PUT $BASE_URL/barbers/$BARBER_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"bio": "Updated bio!"}' | jq

echo -e "\n✅ All tests completed!"
```

Save as `test-barber.sh`, make executable: `chmod +x test-barber.sh`, then run: `./test-barber.sh`
