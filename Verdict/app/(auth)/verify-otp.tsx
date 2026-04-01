import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function VerifyOtpScreen() {
  const { email, _dev_otp } = useLocalSearchParams();
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const router = useRouter();

  const handleVerifyAndReset = () => {
    if (!otp || !newPassword) {
      Alert.alert('Error', 'Please enter the OTP and a new password.');
      return;
    }

    // MOCK VERIFICATION for demo purposes.
    if (otp === _dev_otp) {
      Alert.alert('Success', 'Your password has been reset successfully!', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') }
      ]);
    } else {
      Alert.alert('Invalid OTP', 'The OTP you entered is incorrect.');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.formContainer}>
        <Text style={styles.title}>Verify OTP</Text>
        <Text style={styles.subtitle}>Enter the 6-digit code sent to {email}</Text>

        <TextInput
          style={styles.input}
          placeholder="6-Digit OTP"
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={6}
          placeholderTextColor="#999"
        />

        <TextInput
          style={styles.input}
          placeholder="New Password"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          placeholderTextColor="#999"
        />

        <TouchableOpacity style={styles.button} onPress={handleVerifyAndReset}>
          <Text style={styles.buttonText}>Reset Password</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  formContainer: {
    paddingHorizontal: 30,
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
    color: '#000',
  },
  button: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    alignItems: 'center',
    padding: 16,
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
  },
});
