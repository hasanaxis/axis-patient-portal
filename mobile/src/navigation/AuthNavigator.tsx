import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { OnboardingScreen } from '../screens/OnboardingScreen'
import { LoginScreen } from '../screens/auth/LoginScreen'
import { ClinicalLoginScreen } from '../screens/auth/ClinicalLoginScreen'
import { RegisterScreen } from '../screens/auth/RegisterScreen'
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen'
import { OTPVerificationScreen } from '../screens/auth/OTPVerificationScreen'
import { BiometricSetupScreen } from '../screens/auth/BiometricSetupScreen'

export type AuthStackParamList = {
  Onboarding: undefined
  Login: undefined
  ClinicalLogin: undefined
  Register: undefined
  ForgotPassword: undefined
  OTPVerification: { email: string; type: 'registration' | 'password-reset' }
  BiometricSetup: undefined
}

const Stack = createNativeStackNavigator<AuthStackParamList>()

export const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animation: 'slide_from_right',
      }}
      initialRouteName="Onboarding"
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ClinicalLogin" component={ClinicalLoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
      <Stack.Screen name="BiometricSetup" component={BiometricSetupScreen} />
    </Stack.Navigator>
  )
}