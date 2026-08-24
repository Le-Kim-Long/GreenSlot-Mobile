# GreenSlot Mobile - Expo APK Deployment Configuration

## Current Configuration for Render Backend

### API Configuration
- **Backend URL**: `https://greenslot-backend.onrender.com/api`
- **Files Modified**:
  - `src/api/client.ts` - API client with proper URL configuration
  - `app.json` - Updated with network security and permissions
  - `eas.json` - Environment variables for builds
  - `.env.example` - Example environment configuration

### Network Security Configuration
- **Android Permissions**: Added `INTERNET` and `ACCESS_NETWORK_STATE`
- **Network Security Config**: Configured for Render backend domains
- **HTTPS Support**: Full HTTPS support for secure connections
- **Timeout**: Increased to 30 seconds for better reliability

### Payment Flow for Emulator Testing
- **IPN Endpoint Disabled**: The VNPay IPN (Instant Payment Notification) endpoint has been disabled in `src/api/paymentApi.ts` since it's not needed for emulator/demo testing
- **Payment Flow**: The app now uses direct payment URL opening via `expo-linking` and app state detection to handle payment results
- **No Real Transactions**: Payments are handled through VNPay sandbox/emulator mode for testing purposes

### Login Flow for Expo APK
- **Authentication**: Uses JWT tokens stored in `expo-secure-store`
- **Network Requests**: All API calls go through the configured axios client with proper authentication headers
- **Error Handling**: Includes 401 error handling with automatic token clearing and logout
- **Enhanced Logging**: Better error messages for debugging connection issues

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

# Preview build (APK for testing)
eas build --platform android --profile preview
```

### Environment Setup
1. Copy `.env.example` to `.env` (local development)
2. For production builds, environment variables are configured in `eas.json`
3. Current default: `https://greenslot-backend.onrender.com/api`

## Troubleshooting Connection Issues

### Common Problems and Solutions

#### 1. Network Connection Issues
- **Symptom**: "Không thể kết nối máy chủ" error
- **Solutions**:
  - Check internet connection on device/emulator
  - Verify Render backend is running (https://greenslot-backend.onrender.com)
  - Check firewall/network restrictions
  - Try with VPN if local network blocks certain domains

#### 2. SSL/TLS Certificate Issues
- **Symptom**: Connection timeouts or SSL errors
- **Solutions**:
  - Ensure using HTTPS (configured in app.json)
  - Check device/emulator has correct time (SSL certificates depend on system time)
  - Network security config allows Render backend domains

#### 3. Build Configuration Issues
- **Symptom**: Works in development but not in APK
- **Solutions**:
  - Ensure environment variables are set in `eas.json`
  - Rebuild APK after configuration changes
  - Check EAS build logs for any build errors

#### 4. Backend Availability
- **Symptom**: Intermittent connection failures
- **Solutions**:
  - Render free tier may have cold starts (first request slower)
  - Check Render dashboard for backend status
  - Consider using Render test environment: `https://greenslot-backend-test.onrender.com/api`

## Verification Steps

### 1. API Connection
- Login should successfully authenticate against the Render backend
- Token storage and retrieval should work with expo-secure-store
- All API endpoints should be accessible via the configured URL
- Network errors should show meaningful messages

### 2. Payment Flow
- Booking should generate payment URL
- Payment URL should open in external browser
- App should detect return from payment and update status
- Payment result screen should show appropriate status

### 3. Type Safety
- TypeScript compilation should pass without errors
- All API types should be properly defined

### 4. Build Verification
- APK builds successfully with EAS
- Environment variables are properly embedded
- Network permissions are configured

## Key Files for Deployment
- `src/api/client.ts` - API client configuration with error handling
- `src/api/authApi.ts` - Authentication endpoints
- `src/api/bookingApi.ts` - Booking and payment endpoints
- `src/api/paymentApi.ts` - Payment utilities (IPN disabled)
- `src/context/AuthContext.tsx` - Authentication state management
- `app.json` - Expo configuration with network security
- `eas.json` - Build configuration with environment variables

## Testing Checklist
- [ ] Login with valid credentials
- [ ] Token persistence across app restarts
- [ ] Booking flow generates payment URL
- [ ] Payment URL opens successfully
- [ ] Payment result detection works
- [ ] Logout functionality
- [ ] Network error handling
- [ ] APK build succeeds
- [ ] Environment variables work in production build
- [ ] Connection works on physical device
- [ ] Connection works on emulator