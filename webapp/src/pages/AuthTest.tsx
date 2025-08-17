import React, { useState } from 'react';
import { useSendVerification, useVerifyCode, useRegister, useLogin, useCompleteLogin } from '@/hooks/useAuth';

const AuthTest: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('+61401091789');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [registrationData, setRegistrationData] = useState({
    firstName: 'Test',
    lastName: 'User',
    dateOfBirth: '1990-01-01',
    medicareNumber: '1234567890',
    email: 'test@example.com'
  });

  const sendVerification = useSendVerification();
  const verifyCode = useVerifyCode();
  const register = useRegister();
  const login = useLogin();
  const completeLogin = useCompleteLogin();

  const handleSendVerification = async () => {
    try {
      const result = await sendVerification.mutateAsync(phoneNumber);
      console.log('Send verification result:', result);
    } catch (error) {
      console.error('Send verification error:', error);
    }
  };

  const handleVerifyCode = async () => {
    try {
      const result = await verifyCode.mutateAsync({ phoneNumber, code: verificationCode });
      console.log('Verify code result:', result);
      if (result.success && result.token) {
        setVerificationToken(result.token);
      }
    } catch (error) {
      console.error('Verify code error:', error);
    }
  };

  const handleRegister = async () => {
    if (!verificationToken) {
      alert('Please verify your phone number first');
      return;
    }
    
    try {
      const result = await register.mutateAsync({
        phoneNumber,
        verificationToken,
        ...registrationData
      });
      console.log('Register result:', result);
    } catch (error) {
      console.error('Register error:', error);
    }
  };

  const handleLogin = async () => {
    try {
      const result = await login.mutateAsync(phoneNumber);
      console.log('Login result:', result);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleCompleteLogin = async () => {
    try {
      const result = await completeLogin.mutateAsync({ phoneNumber, code: verificationCode });
      console.log('Complete login result:', result);
    } catch (error) {
      console.error('Complete login error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Authentication Test</h1>
          
          {/* Phone Number Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="0412345678"
            />
          </div>

          {/* Send Verification */}
          <div className="mb-6">
            <button
              onClick={handleSendVerification}
              disabled={sendVerification.isPending}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {sendVerification.isPending ? 'Sending...' : 'Send Verification Code'}
            </button>
            {sendVerification.isSuccess && (
              <p className="text-green-600 text-sm mt-2">✓ Verification code sent!</p>
            )}
            {sendVerification.isError && (
              <p className="text-red-600 text-sm mt-2">✗ Failed to send verification code</p>
            )}
          </div>

          {/* Verification Code Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Verification Code
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="123456"
              maxLength={6}
            />
          </div>

          {/* Verify Code */}
          <div className="mb-6">
            <button
              onClick={handleVerifyCode}
              disabled={verifyCode.isPending || !verificationCode}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {verifyCode.isPending ? 'Verifying...' : 'Verify Code'}
            </button>
            {verifyCode.isSuccess && (
              <p className="text-green-600 text-sm mt-2">✓ Code verified! Token received.</p>
            )}
            {verifyCode.isError && (
              <p className="text-red-600 text-sm mt-2">✗ Invalid verification code</p>
            )}
          </div>

          {/* Registration Section */}
          {verificationToken && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Registration Data</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  value={registrationData.firstName}
                  onChange={(e) => setRegistrationData({ ...registrationData, firstName: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="First Name"
                />
                <input
                  type="text"
                  value={registrationData.lastName}
                  onChange={(e) => setRegistrationData({ ...registrationData, lastName: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Last Name"
                />
              </div>

              <div className="mb-4">
                <input
                  type="date"
                  value={registrationData.dateOfBirth}
                  onChange={(e) => setRegistrationData({ ...registrationData, dateOfBirth: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <button
                onClick={handleRegister}
                disabled={register.isPending}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {register.isPending ? 'Registering...' : 'Register Patient'}
              </button>
              {register.isSuccess && (
                <p className="text-green-600 text-sm mt-2">✓ Registration successful!</p>
              )}
              {register.isError && (
                <p className="text-red-600 text-sm mt-2">✗ Registration failed</p>
              )}
            </div>
          )}

          {/* Login Section */}
          <div className="border-t pt-6 mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Login Test</h3>
            
            <div className="space-y-4">
              <button
                onClick={handleLogin}
                disabled={login.isPending}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {login.isPending ? 'Sending Login Code...' : 'Send Login Code'}
              </button>
              
              <button
                onClick={handleCompleteLogin}
                disabled={completeLogin.isPending || !verificationCode}
                className="w-full bg-indigo-800 text-white py-2 px-4 rounded-md hover:bg-indigo-900 disabled:opacity-50"
              >
                {completeLogin.isPending ? 'Logging In...' : 'Complete Login'}
              </button>
              
              {completeLogin.isSuccess && (
                <p className="text-green-600 text-sm">✓ Login successful!</p>
              )}
              {completeLogin.isError && (
                <p className="text-red-600 text-sm">✗ Login failed</p>
              )}
            </div>
          </div>

          {/* Debug Info */}
          <div className="border-t pt-6 mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Debug Info</h3>
            <div className="bg-gray-100 p-4 rounded-md">
              <p className="text-sm text-gray-600">Backend: http://localhost:3001</p>
              <p className="text-sm text-gray-600">Verification Token: {verificationToken ? '✓ Present' : '✗ Missing'}</p>
              <p className="text-sm text-gray-600">Auth Token: {localStorage.getItem('auth_token') ? '✓ Present' : '✗ Missing'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthTest;