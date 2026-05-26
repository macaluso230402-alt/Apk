## Auth Test Agent Playbook

### MongoDB Verification
```
mongosh
use test_database
db.users.find({role: "admin"}).pretty()
db.users.findOne({role: "admin"}, {password_hash: 1})
```
Verify: bcrypt hash starts with `$2b$`, indexes exist on:
- users.email (unique)
- login_attempts.identifier
- password_reset_tokens.expires_at (TTL)

### API Testing
```
# Login as admin
curl -c cookies.txt -X POST $BACKEND_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@plantcare.com","password":"admin123"}'

# Check cookies
cat cookies.txt

# Get current user
curl -b cookies.txt $BACKEND_URL/api/auth/me
```

### Brute Force Protection
- 5 failed login attempts = 15 min lockout per (ip+email)
- Verify with 6 consecutive failed POSTs, then expect 429 on the 6th

### Endpoints
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- POST /api/auth/refresh
- GET  /api/auth/me
- POST /api/auth/forgot-password
- POST /api/auth/reset-password
