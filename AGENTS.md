# GreenSlot Mobile - Expo APK Deployment Configuration

## Updated Configuration for Render Backend

### API Configuration Changes
- **Backend URL**: Updated to use `https://greenslot-backend-test.onrender.com/api`
- **Files Modified**:
  - `src/api/client.ts` - Updated default API URL
  - `app.json` - Updated extra.apiUrl configuration
  - `.env.example` - Added example environment variable

### Payment Flow for Emulator Testing
- **IPN Endpoint Disabled**: The VNPay IPN (Instant Payment Notification) endpoint has been disabled in `src/api/paymentApi.ts` since it's not needed for emulator/demo testing
- **Payment Flow**: The app now uses direct payment URL opening via `expo-linking` and app state detection to handle payment results
- **No Real Transactions**: Payments are handled through VNPay sandbox/emulator mode for testing purposes

### Login Flow for Expo APK
- **Authentication**: Uses JWT tokens stored in `expo-secure-store`
- **Network Requests**: All API calls go through the configured axios client with proper authentication headers
- **Error Handling**: Includes 401 error handling with automatic token clearing and logout

## Build Commands for Expo APK

### Development Build
```bash
npx expo start --android
```

### Production APK Build
```bash
# Build APK (requires EAS Build)
eas build --platform android

# Or for development build
eas build --platform android --profile development
```

### Environment Setup
1. Copy `.env.example` to `.env` (local development)
2. For production builds, configure environment variables in EAS dashboard
3. Current default: `https://greenslot-backend-test.onrender.com/api`

## Verification Steps

### 1. API Connection
- Login should successfully authenticate against the Render backend
- Token storage and retrieval should work with expo-secure-store
- All API endpoints should be accessible via the configured URL

### 2. Payment Flow
- Booking should generate payment URL
- Payment URL should open in external browser
- App should detect return from payment and update status
- Payment result screen should show appropriate status

### 3. Type Safety
- TypeScript compilation should pass without errors
- All API types should be properly defined

## Key Files for Deployment
- `src/api/client.ts` - API client configuration
- `src/api/authApi.ts` - Authentication endpoints
- `src/api/bookingApi.ts` - Booking and payment endpoints
- `src/api/paymentApi.ts` - Payment utilities (IPN disabled)
- `src/context/AuthContext.tsx` - Authentication state management
- `app.json` - Expo configuration

## Testing Checklist
- [ ] Login with valid credentials
- [ ] Token persistence across app restarts
- [ ] Booking flow generates payment URL
- [ ] Payment URL opens successfully
- [ ] Payment result detection works
- [ ] Logout functionality
- [ ] Network error handling