import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="signup" options={{ headerShown: false }} />
      <Stack.Screen name="forgot-password" options={{ presentation: 'modal', title: 'Reset Password' }} />
      <Stack.Screen name="verify-otp" options={{ presentation: 'modal', title: 'Verify OTP' }} />
    </Stack>
  );
}
