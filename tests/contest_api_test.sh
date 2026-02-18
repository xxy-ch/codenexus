#!/bin/bash

# Contest System API Test Script
# This script tests the Phase 2 Contest system functionality

set -e

API_BASE="http://localhost:3000"
JWT_TOKEN=""

echo "======================================"
echo "Contest System API Test"
echo "======================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test helper functions
test_pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
}

test_fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    exit 1
}

# Step 1: Login to get JWT token
echo ""
echo "Step 1: Login as admin..."
LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE}/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@example.com","password":"Admin123!"}')

JWT_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')

if [ -z "$JWT_TOKEN" ] || [ "$JWT_TOKEN" = "null" ]; then
    test_fail "Login failed - no token received"
fi

test_pass "Login successful, token received"

# Step 2: Create a new contest
echo ""
echo "Step 2: Create a new contest..."
CONTEST_RESPONSE=$(curl -s -X POST "${API_BASE}/contests" \
    -H "Authorization: Bearer ${JWT_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
        "organization_id": 1,
        "name": "Test ACM Contest",
        "description": "A test contest for API verification",
        "rules": "acm",
        "start_time": "2024-01-01T10:00:00Z",
        "end_time": "2024-01-01T12:00:00Z",
        "freeze_minutes": 30
    }')

CONTEST_ID=$(echo $CONTEST_RESPONSE | jq -r '.id')

if [ -z "$CONTEST_ID" ] || [ "$CONTEST_ID" = "null" ]; then
    test_fail "Failed to create contest"
fi

test_pass "Contest created with ID: $CONTEST_ID"

# Step 3: Get contest details
echo ""
echo "Step 3: Get contest details..."
DETAILS_RESPONSE=$(curl -s -X GET "${API_BASE}/contests/${CONTEST_ID}" \
    -H "Authorization: Bearer ${JWT_TOKEN}")

CONTEST_NAME=$(echo $DETAILS_RESPONSE | jq -r '.name')

if [ "$CONTEST_NAME" != "Test ACM Contest" ]; then
    test_fail "Contest details mismatch"
fi

test_pass "Contest details retrieved: $CONTEST_NAME"

# Step 4: Get contest status
echo ""
echo "Step 4: Get contest status..."
STATUS_RESPONSE=$(curl -s -X GET "${API_BASE}/contests/${CONTEST_ID}/status")

CONTEST_STATUS=$(echo $STATUS_RESPONSE | jq -r '.status')
IS_FROZEN=$(echo $STATUS_RESPONSE | jq -r '.is_frozen')

test_pass "Contest status: $CONTEST_STATUS, is_frozen: $IS_FROZEN"

# Step 5: List all contests
echo ""
echo "Step 5: List all contests..."
LIST_RESPONSE=$(curl -s -X GET "${API_BASE}/contests" \
    -H "Authorization: Bearer ${JWT_TOKEN}")

TOTAL_COUNT=$(echo $LIST_RESPONSE | jq -r '.total')

if [ "$TOTAL_COUNT" -lt 1 ]; then
    test_fail "No contests found in list"
fi

test_pass "List contests returned $TOTAL_COUNT contest(s)"

# Step 6: Get contest rankings (should be empty initially)
echo ""
echo "Step 6: Get contest rankings..."
RANKINGS_RESPONSE=$(curl -s -X GET "${API_BASE}/contests/${CONTEST_ID}/rankings" \
    -H "Authorization: Bearer ${JWT_TOKEN}")

test_pass "Rankings retrieved (empty initially)"

# Step 7: Register for contest
echo ""
echo "Step 7: Register for contest..."
REGISTER_RESPONSE=$(curl -s -X POST "${API_BASE}/contests/${CONTEST_ID}/register" \
    -H "Authorization: Bearer ${JWT_TOKEN}")

REGISTERED_AT=$(echo $REGISTER_RESPONSE | jq -r '.registered_at')

if [ -z "$REGISTERED_AT" ] || [ "$REGISTERED_AT" = "null" ]; then
    test_fail "Failed to register for contest"
fi

test_pass "Successfully registered for contest"

# Step 8: Get contest participants
echo ""
echo "Step 8: Get contest participants..."
PARTICIPANTS_RESPONSE=$(curl -s -X GET "${API_BASE}/contests/${CONTEST_ID}/participants" \
    -H "Authorization: Bearer ${JWT_TOKEN}")

PARTICIPANT_COUNT=$(echo $PARTICIPANTS_RESPONSE | jq 'length')

test_pass "Contest has $PARTICIPANT_COUNT participant(s)"

# Step 9: Try to register again (should fail)
echo ""
echo "Step 9: Try duplicate registration (should fail)..."
DUPLICATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_BASE}/contests/${CONTEST_ID}/register" \
    -H "Authorization: Bearer ${JWT_TOKEN}")

HTTP_CODE=$(echo "$DUPLICATE_RESPONSE" | tail -n1)

if [ "$HTTP_CODE" != "409" ]; then
    test_fail "Duplicate registration should return 409 Conflict, got $HTTP_CODE"
fi

test_pass "Duplicate registration correctly rejected with 409"

# Step 10: Update contest
echo ""
echo "Step 10: Update contest..."
UPDATE_RESPONSE=$(curl -s -X PUT "${API_BASE}/contests/${CONTEST_ID}" \
    -H "Authorization: Bearer ${JWT_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
        "description": "Updated contest description"
    }')

UPDATED_DESC=$(echo $UPDATE_RESPONSE | jq -r '.description')

if [ "$UPDATED_DESC" != "Updated contest description" ]; then
    test_fail "Contest update failed"
fi

test_pass "Contest updated successfully"

# Step 11: Delete contest
echo ""
echo "Step 11: Delete contest..."
DELETE_RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "${API_BASE}/contests/${CONTEST_ID}" \
    -H "Authorization: Bearer ${JWT_TOKEN}")

HTTP_CODE=$(echo "$DELETE_RESPONSE" | tail -n1)

if [ "$HTTP_CODE" != "204" ]; then
    test_fail "Failed to delete contest, got HTTP $HTTP_CODE"
fi

test_pass "Contest deleted successfully"

# Step 12: Verify contest is deleted
echo ""
echo "Step 12: Verify contest deletion..."
VERIFY_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${API_BASE}/contests/${CONTEST_ID}" \
    -H "Authorization: Bearer ${JWT_TOKEN}")

HTTP_CODE=$(echo "$VERIFY_RESPONSE" | tail -n1)

if [ "$HTTP_CODE" != "404" ]; then
    test_fail "Deleted contest should return 404, got $HTTP_CODE"
fi

test_pass "Contest correctly returns 404 after deletion"

echo ""
echo "======================================"
echo -e "${GREEN}All tests passed!${NC}"
echo "======================================"
