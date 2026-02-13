#!/bin/bash

# Environment Variable Validation Script
# Checks .env.local for required and optional environment variables
#
# Usage: ./scripts/validate-env.sh

set -e

ENV_FILE=".env.local"
ERRORS=0
WARNINGS=0

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Environment Variable Validation"
echo "=========================================="
echo ""

# Check if .env.local exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}ERROR: $ENV_FILE not found${NC}"
    echo "Please create $ENV_FILE with the required environment variables."
    exit 1
fi

echo "Checking $ENV_FILE..."
echo ""

# Function to check if variable exists in .env.local
check_var() {
    local var_name=$1
    local var_type=$2  # "required" or "optional"
    
    if grep -q "^${var_name}=" "$ENV_FILE" 2>/dev/null; then
        local value=$(grep "^${var_name}=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
        if [ -n "$value" ] && [ "$value" != "your_${var_name,,}_here" ] && [ "$value" != "placeholder" ]; then
            if [ "$var_type" == "required" ]; then
                echo -e "${GREEN}✓${NC} $var_name is set"
            fi
            return 0
        else
            if [ "$var_type" == "required" ]; then
                echo -e "${RED}✗${NC} $var_name is set but empty or has placeholder value"
                ((ERRORS++))
                return 1
            fi
        fi
    else
        if [ "$var_type" == "required" ]; then
            echo -e "${RED}✗${NC} $var_name is missing (REQUIRED)"
            ((ERRORS++))
            return 1
        else
            return 0
        fi
    fi
}

# ============================================
# REQUIRED VARIABLES (Supabase)
# ============================================
echo "--- Required Variables (Supabase) ---"
REQUIRED_SUPABASE_VARS=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
)

for var in "${REQUIRED_SUPABASE_VARS[@]}"; do
    check_var "$var" "required"
done

echo ""

# ============================================
# OPTIONAL VARIABLES (PostHog & Sentry)
# ============================================
echo "--- Optional Variables (Telemetry) ---"
OPTIONAL_VARS=(
    "NEXT_PUBLIC_POSTHOG_KEY"
    "NEXT_PUBLIC_POSTHOG_HOST"
    "NEXT_PUBLIC_SENTRY_DSN"
)

for var in "${OPTIONAL_VARS[@]}"; do
    if check_var "$var" "optional"; then
        echo -e "${GREEN}✓${NC} $var is set"
    else
        echo -e "${YELLOW}⚠${NC} $var is not set (optional)"
        ((WARNINGS++))
    fi
done

# Additional warning for telemetry
if ! grep -q "^NEXT_PUBLIC_POSTHOG_KEY=" "$ENV_FILE" 2>/dev/null; then
    echo -e "${YELLOW}  Note: PostHog analytics will be disabled without NEXT_PUBLIC_POSTHOG_KEY${NC}"
fi

if ! grep -q "^NEXT_PUBLIC_SENTRY_DSN=" "$ENV_FILE" 2>/dev/null; then
    echo -e "${YELLOW}  Note: Sentry error tracking will be disabled without NEXT_PUBLIC_SENTRY_DSN${NC}"
fi

echo ""

# ============================================
# Summary
# ============================================
echo "=========================================="
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All environment variables are properly configured${NC}"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All required variables are set${NC}"
    echo -e "${YELLOW}⚠ $WARNINGS optional variable(s) not configured${NC}"
    echo ""
    echo "The application will run, but some features may be disabled:"
    echo "  - PostHog analytics (NEXT_PUBLIC_POSTHOG_KEY)"
    echo "  - Sentry error tracking (NEXT_PUBLIC_SENTRY_DSN)"
else
    echo -e "${RED}✗ Validation failed with $ERRORS error(s)${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}  and $WARNINGS warning(s)${NC}"
    fi
    echo ""
    echo "Please fix the required variables above before running the application."
    exit 1
fi
echo "=========================================="

exit 0
