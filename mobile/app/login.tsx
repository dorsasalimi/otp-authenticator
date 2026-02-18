import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, Keyboard, TouchableWithoutFeedback, Platform,
  Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

const API_URL = 'http://192.168.100.2:3000/api';

const toEnglishNumbers = (str) => {
  if (!str) return str;
  const persianNumbers = {
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '۷': '7', '٨': '8', '٩': '9'
  };
  return str.replace(/[۰-۹٠-٩]/g, (char) => persianNumbers[char] || char);
};

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState(['', '', '', '', '']);
  const [pin, setPin] = useState(['', '', '', '']);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinSetupStep, setPinSetupStep] = useState('create');
  const [tempPin, setTempPin] = useState('');
  const [loginMode, setLoginMode] = useState('otp');

  // Biometric state
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('');
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [showBiometricSetup, setShowBiometricSetup] = useState(false);
  const [biometricSetupLoading, setBiometricSetupLoading] = useState(false);
  const [autoPromptBiometric, setAutoPromptBiometric] = useState(false);

  const inputRefs = useRef([]);

  useEffect(() => {
    checkUserStatus();
    checkBiometrics();
    checkBiometricLoginAvailability();
  }, []);

  const checkBiometricLoginAvailability = async () => {
    try {
      const savedPhone = await SecureStore.getItemAsync('user_phone');
      const biometricEnabledFlag = await SecureStore.getItemAsync('biometric_enabled');
      const biometricToken = await SecureStore.getItemAsync('biometric_token');
      const deviceId = await SecureStore.getItemAsync('device_id');

      console.log('Checking biometric availability:', {
        savedPhone,
        biometricEnabledFlag,
        hasToken: !!biometricToken,
        hasDeviceId: !!deviceId
      });

      if (savedPhone && biometricEnabledFlag === 'true' && biometricToken && deviceId) {
        // Check if biometric credential is still active on server
        const response = await axios.post(`${API_URL}/biometric`, {
          phoneNumber: savedPhone,
          action: 'check-status'
        });

        console.log('Biometric status response:', response.data);

        if (response.data.success && response.data.data.biometricEnabled) {
          // Show biometric login option
          setPhone(savedPhone);
          setBiometricEnabled(true);
          setAutoPromptBiometric(true);
        }
      }
    } catch (error) {
      console.log('Biometric availability check failed:', error);
    }
  };

  useEffect(() => {
    // Auto-prompt for biometric after checking availability
    if (autoPromptBiometric && biometricsAvailable && biometricEnabled) {
      setAutoPromptBiometric(false);
      // Small delay to ensure UI is ready
      setTimeout(() => {
        handleBiometricAuth();
      }, 500);
    }
  }, [autoPromptBiometric, biometricsAvailable, biometricEnabled]);

  const checkBiometrics = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();

      if (!compatible || !enrolled) {
        setBiometricsAvailable(false);
        return;
      }

      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      setBiometricsAvailable(true);

      if (Platform.OS === 'ios') {
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('Face ID');
        } else {
          setBiometricType('Touch ID');
        }
      } else {
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('تشخیص چهره');
        } else {
          setBiometricType('اثر انگشت');
        }
      }
    } catch (error) {
      setBiometricsAvailable(false);
    }
  };

  const checkUserStatus = async () => {
    try {
      const savedPhone = await SecureStore.getItemAsync('user_phone');
      const biometricRegistered = await SecureStore.getItemAsync('biometric_enabled');

      if (savedPhone) {
        setPhone(savedPhone);
        if (biometricRegistered === 'true') {
          setBiometricEnabled(true);
        }

        const response = await axios.get(`${API_URL}/pin/status/${savedPhone}`);
        if (response.data.success && response.data.data.pinEnabled) {
          setPinEnabled(true);
          setLoginMode('pin');
          setStep(3);
        }
      }
    } catch (error) {
      console.log('Status check failed');
    }
  };

  const handleBiometricAuth = async () => {
    try {
      // Get the current phone number - either from state or from storage
      let currentPhone = phone;
      if (!currentPhone) {
        currentPhone = await SecureStore.getItemAsync('user_phone');
      }

      if (!currentPhone) {
        Alert.alert("خطا", "شماره موبایل یافت نشد. لطفا وارد شوید.");
        return;
      }

      const authOptions = {
        promptMessage: biometricType === 'Face ID' ? 'ورود با Face ID' : 'ورود با اثر انگشت',
        cancelLabel: 'انصراف',
        disableDeviceFallback: true,
        fallbackLabel: '',
      };

      const result = await LocalAuthentication.authenticateAsync(authOptions);

      if (result.success) {
        setLoading(true);
        const englishPhone = toEnglishNumbers(currentPhone);
        const biometricToken = await SecureStore.getItemAsync('biometric_token');
        let deviceId = await SecureStore.getItemAsync('device_id');

        if (!deviceId) {
          deviceId = await generateDeviceId();
        }

        if (biometricToken && deviceId) {
          console.log('Verifying biometric with:', { phone: englishPhone, deviceId });

          const response = await axios.post(`${API_URL}/biometric`, {
            phoneNumber: englishPhone,
            token: biometricToken,
            deviceId: deviceId,
            action: 'verify'
          });

          console.log('Biometric verification response:', response.data);

          if (response.data.authenticated || response.data.success) {
            if (response.data.token) {
              await SecureStore.setItemAsync('session_token', response.data.token);
            }
            router.replace('/(tabs)');
          } else {
            Alert.alert("خطا", response.data.error || "اعتبارسنجی بیومتریک ناموفق بود");
          }
        } else {
          Alert.alert("خطا", "اطلاعات بیومتریک یافت نشد");
          setShowBiometricSetup(true);
        }
      } else if (result.error === 'lockout') {
        Alert.alert("خطا", "بایومتریک به دلیل تلاش زیاد قفل شده است. لطفا گوشی را با رمز عبور باز کنید.");
      }
    } catch (error: any) {
      console.error('Biometric auth error:', error);
      Alert.alert("خطا", error.response?.data?.error || "مشکلی در تشخیص هویت رخ داد");
    } finally {
      setLoading(false);
    }
  };

  const generateDeviceId = async () => {
    const deviceId = 'device_' + Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    await SecureStore.setItemAsync('device_id', deviceId);
    return deviceId;
  };

  const handleBiometricSetup = async () => {
    try {
      // Get the current phone number - either from state or from storage
      let currentPhone = phone;
      if (!currentPhone) {
        currentPhone = await SecureStore.getItemAsync('user_phone');
      }

      if (!currentPhone) {
        Alert.alert("خطا", "شماره موبایل یافت نشد. لطفا ابتدا وارد شوید.");
        return;
      }

      setBiometricSetupLoading(true);
      console.log('Starting biometric setup for phone:', currentPhone);

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'تایید هویت برای فعال‌سازی',
        disableDeviceFallback: true,
        fallbackLabel: '',
        cancelLabel: 'انصراف',
      });

      console.log('Authentication result:', result);

      if (result.success) {
        const biometricToken = Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15);
        const englishPhone = toEnglishNumbers(currentPhone);

        console.log('Generated token:', biometricToken);

        // Get or generate device ID
        let deviceId = await SecureStore.getItemAsync('device_id');
        if (!deviceId) {
          deviceId = 'device_' + Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
          await SecureStore.setItemAsync('device_id', deviceId);
        }

        console.log('Device ID:', deviceId);

        // Register on server FIRST
        console.log('Sending registration request to server...');

        const response = await axios.post(`${API_URL}/biometric`, {
          phoneNumber: englishPhone,
          token: biometricToken,
          deviceId: deviceId,
          action: 'register',
          deviceType: Platform.OS === 'ios' ? 'ios' : 'android',
          deviceName: Platform.OS === 'ios' ? 'iPhone' : 'Android Device'
        });

        console.log('Server response:', response.data);

        if (response.data.success) {
          // Only store locally after successful server registration
          await SecureStore.setItemAsync('user_phone', englishPhone);
          await SecureStore.setItemAsync('biometric_token', biometricToken);
          await SecureStore.setItemAsync('biometric_enabled', 'true');

          setBiometricEnabled(true);
          setShowBiometricSetup(false);
          Alert.alert("موفق", `${biometricType} با موفقیت فعال شد`);
          router.replace('/(tabs)');
        } else {
          console.error('Registration failed:', response.data);
          Alert.alert("خطا", response.data.error || "ثبت بیومتریک در سرور ناموفق بود");
        }
      }
    } catch (error: any) {
      console.error('Biometric setup error:', error);
      console.error('Error response:', error.response?.data);

      // More specific error message
      let errorMessage = "فعال‌سازی ناموفق بود";
      if (error.response?.status === 404) {
        errorMessage = "کاربر یافت نشد. لطفا ابتدا ثبت نام کنید.";
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      Alert.alert("خطا", errorMessage);
    } finally {
      setBiometricSetupLoading(false);
    }
  };

  const handlePhoneSubmit = async (forceOTP = false) => {
    const englishPhone = toEnglishNumbers(phone);
    if (englishPhone.length < 11) {
      Alert.alert("خطا", "لطفاً شماره موبایل معتبر وارد کنید.");
      return;
    }

    setLoading(true);
    try {
      // Save phone number immediately
      await SecureStore.setItemAsync('user_phone', englishPhone);

      const pinStatus = await axios.get(`${API_URL}/pin/status/${englishPhone}`);
      if (!forceOTP && pinStatus.data.success && pinStatus.data.data.pinEnabled) {
        setPinEnabled(true);
        setLoginMode('pin');
        setStep(3);
      } else {
        await axios.post(`${API_URL}/recovery`, { phoneNumber: englishPhone, action: 'REQUEST_OTP' });
        setLoginMode('otp');
        setStep(2);
      }
    } catch (error) {
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    const englishCode = code.map(digit => toEnglishNumbers(digit)).join('');
    const englishPhone = toEnglishNumbers(phone);

    if (englishCode.length < 5) {
      Alert.alert("خطا", "لطفاً کد تایید را کامل وارد کنید.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/recovery`, {
        phoneNumber: englishPhone,
        code: englishCode,
        action: 'VERIFY_AND_SYNC'
      });

      if (response.data.success) {
        await SecureStore.setItemAsync('user_phone', englishPhone);
        const pinStatus = await axios.get(`${API_URL}/pin/status/${englishPhone}`);
        if (pinStatus.data.success && pinStatus.data.data.pinEnabled) {
          if (biometricsAvailable && !biometricEnabled) {
            setShowBiometricSetup(true);
          } else {
            router.replace('/(tabs)');
          }
        } else {
          setShowPinSetup(true);
        }
      }
    } catch (error) {
      Alert.alert("خطا", "کد وارد شده اشتباه است.");
    } finally {
      setLoading(false);
    }
  };

  const handlePINLogin = async () => {
    const englishPin = pin.map(digit => toEnglishNumbers(digit)).join('');
    const englishPhone = toEnglishNumbers(phone);

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/pin/verify`, {
        phoneNumber: englishPhone,
        pin: englishPin,
        action: 'verify'
      });

      if (response.data.authenticated) {
        await SecureStore.setItemAsync('user_phone', englishPhone);
        router.replace('/(tabs)');
      }
    } catch (error) {
      Alert.alert("خطا", "PIN وارد شده اشتباه است.");
      setPin(['', '', '', '']);
    } finally {
      setLoading(false);
    }
  };

  const handlePinSetup = async () => {
    const englishPin = pin.map(digit => toEnglishNumbers(digit)).join('');
    const englishPhone = toEnglishNumbers(phone);

    if (pinSetupStep === 'create') {
      setTempPin(englishPin);
      setPin(['', '', '', '']);
      setPinSetupStep('confirm');
    } else {
      if (englishPin === tempPin) {
        setLoading(true);
        try {
          await axios.post(`${API_URL}/pin/set`, {
            phoneNumber: englishPhone,
            pin: englishPin,
            action: 'set'
          });
          setShowPinSetup(false);
          if (biometricsAvailable) {
            setShowBiometricSetup(true);
          } else {
            router.replace('/(tabs)');
          }
        } catch (error) {
          Alert.alert("خطا", "مشکلی پیش آمد.");
        } finally {
          setLoading(false);
        }
      } else {
        Alert.alert("خطا", "PIN مطابقت ندارد.");
        setPin(['', '', '', '']);
        setPinSetupStep('create');
      }
    }
  };

  const handlePinChange = (text, index, setter, currentArray, maxLength) => {
    const digit = toEnglishNumbers(text).replace(/[^0-9]/g, '').slice(-1);
    const newArray = [...currentArray];
    newArray[index] = digit;
    setter(newArray);
    if (digit !== '' && index < maxLength - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyPress = (e, index, currentArray, setter) => {
    if (e.nativeEvent.key === 'Backspace' && currentArray[index] === '' && index > 0) {
      const newArray = [...currentArray];
      newArray[index - 1] = '';
      setter(newArray);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const getBiometricIcon = () => {
    if (biometricType === 'Face ID' || biometricType === 'تشخیص چهره') return '😊';
    return '👆';
  };

  const renderPinSetupModal = () => (
    <Modal visible={showPinSetup} transparent={true} animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {pinSetupStep === 'create' ? 'تنظیم PIN ورود سریع' : 'تکرار PIN'}
          </Text>
          <Text style={styles.modalSubtitle}>
            {pinSetupStep === 'create' ? 'یک PIN ۴ رقمی انتخاب کنید' : 'PIN را دوباره وارد کنید'}
          </Text>
          <View style={styles.pinContainer}>
            {pin.map((digit, index) => (
              <TextInput
                key={index}
                ref={ref => inputRefs.current[index] = ref}
                style={[styles.pinInput, digit ? styles.pinInputFilled : null]}
                keyboardType="number-pad"
                maxLength={1}
                value={digit}
                onChangeText={(text) => handlePinChange(text, index, setPin, pin, 4)}
                onKeyPress={(e) => handleKeyPress(e, index, pin, setPin)}
                secureTextEntry={true}
                textAlign="center"
              />
            ))}
          </View>
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowPinSetup(false)}
            >
              <Text style={styles.cancelButtonText}>رد کردن</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton]}
              onPress={handlePinSetup}
              disabled={pin.join('').length < 4}
            >
              <Text style={styles.confirmButtonText}>تایید</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderBiometricSetupModal = () => (
    <Modal visible={showBiometricSetup} transparent={true} animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>فعال‌سازی {biometricType}</Text>
          <Text style={styles.modalSubtitle}>
            برای ورود امن‌تر، {biometricType} را فعال کنید
          </Text>
          <View style={styles.biometricIconContainer}>
            <Text style={styles.biometricIcon}>{getBiometricIcon()}</Text>
          </View>
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => router.replace('/(tabs)')}
            >
              <Text style={styles.cancelButtonText}>رد کردن</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton]}
              onPress={handleBiometricSetup}
              disabled={biometricSetupLoading}
            >
              {biometricSetupLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmButtonText}>فعال‌سازی</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.fullcontainer}>
        <View style={styles.container}>
          <Text style={styles.title}>
            {step === 1 ? 'ورود' : step === 2 ? 'ورود با پیامک' : 'ورود با PIN'}
          </Text>

          {/* Biometric login button - shown when user has biometric enabled */}
          {step === 1 && phone && biometricEnabled && biometricsAvailable && (
            <TouchableOpacity
              style={styles.biometricButton}
              onPress={handleBiometricAuth}
              disabled={loading}
            >
              <Text style={styles.biometricIcon}>{getBiometricIcon()}</Text>
              <Text style={styles.biometricText}>ورود با {biometricType}</Text>
            </TouchableOpacity>
          )}

          {/* Biometric setup button - shown when biometric is available but not enabled */}
          {step === 1 && phone && biometricsAvailable && !biometricEnabled && (
            <TouchableOpacity
              style={[styles.biometricButton, styles.setupButton]}
              onPress={() => setShowBiometricSetup(true)}
            >
              <Text style={styles.biometricIcon}>{getBiometricIcon()}</Text>
              <Text style={styles.biometricText}>فعال‌سازی {biometricType}</Text>
            </TouchableOpacity>
          )}

          {step === 2 && (
            <Text style={styles.subtitle}>کد تایید ۵ رقمی برای شما ارسال شد</Text>
          )}
          {step === 3 && (
            <Text style={styles.subtitle}>PIN ۴ رقمی خود را وارد کنید</Text>
          )}

          {step === 1 && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>شماره موبایل</Text>
              <TextInput
                style={styles.input}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                maxLength={11}
                textAlign="right"
                placeholder="09123456789"
                editable={!loading}
              />
            </View>
          )}

          {(step === 2 || step === 3) && (
            <View style={styles.codeContainer}>
              <View style={styles.codeInputContainer}>
                {(step === 2 ? code : pin).map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={ref => inputRefs.current[index] = ref}
                    style={[
                      step === 2 ? styles.codeInput : styles.pinInput,
                      digit ? styles.codeInputFilled : null
                    ]}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={digit}
                    onChangeText={(text) => step === 2
                      ? handlePinChange(text, index, setCode, code, 5)
                      : handlePinChange(text, index, setPin, pin, 4)
                    }
                    onKeyPress={(e) => step === 2
                      ? handleKeyPress(e, index, code, setCode)
                      : handleKeyPress(e, index, pin, setPin)
                    }
                    secureTextEntry={step === 3}
                    textAlign="center"
                    editable={!loading}
                  />
                ))}
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, styles.buttonActive]}
            onPress={
              step === 1
                ? () => handlePhoneSubmit(false)
                : step === 2
                  ? verifyOTP
                  : handlePINLogin
            }
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {step === 1 ? 'ادامه' : step === 2 ? 'تایید کد' : 'ورود'}
              </Text>
            )}
          </TouchableOpacity>

          {step === 2 && (
            <TouchableOpacity onPress={() => setStep(1)} disabled={loading}>
              <Text style={styles.backTextnewcode}>تصحیح شماره</Text>
            </TouchableOpacity>
          )}
        </View>
        {renderPinSetupModal()}
        {renderBiometricSetupModal()}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  fullcontainer: {
    flex: 1,
    backgroundColor: '#EDF1F2',
    justifyContent: 'flex-end',
    alignItems: 'center'
  },
  container: {
    width: '100%',
    height: '75%',
    backgroundColor: '#fff',
    padding: 30,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    elevation: 5
  },
  title: {
    fontSize: 28,
    fontWeight: '500',
    textAlign: 'center',
    color: '#000000',
    marginBottom: 20
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20
  },
  inputContainer: {
    marginBottom: 30,
    width: '100%'
  },
  inputLabel: {
    fontSize: 16,
    textAlign: 'right',
    marginBottom: 8
  },
  input: {
    borderWidth: 2,
    borderColor: '#75C3D7',
    borderRadius: 10,
    padding: 15,
    fontSize: 18,
    textAlign: 'right'
  },
  codeContainer: {
    marginBottom: 10,
    width: '100%'
  },
  codeInputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10
  },
  codeInput: {
    borderWidth: 2,
    borderColor: '#75C3D7',
    borderRadius: 10,
    width: 55,
    height: 55,
    fontSize: 24,
    textAlign: 'center'
  },
  pinInput: {
    borderWidth: 2,
    borderColor: '#75C3D7',
    borderRadius: 10,
    width: 65,
    height: 65,
    fontSize: 28,
    textAlign: 'center'
  },
  codeInputFilled: {
    borderColor: '#168CA9',
    backgroundColor: '#f0f9ff'
  },
  pinInputFilled: {
    borderColor: '#168CA9',
    backgroundColor: '#f0f9ff'
  },
  button: {
    backgroundColor: '#168CA9',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  backTextnewcode: {
    color: '#168CA9',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 15
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 10
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 25,
    textAlign: 'center'
  },
  pinContainer: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 30
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center'
  },
  cancelButton: {
    backgroundColor: '#f0f0f0'
  },
  confirmButton: {
    backgroundColor: '#168CA9'
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '500'
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '500'
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#75C3D7'
  },
  biometricIcon: {
    fontSize: 24,
    marginRight: 10
  },
  biometricText: {
    fontSize: 16,
    color: '#333'
  },
  setupButton: {
    backgroundColor: '#E8F4F8',
    borderColor: '#168CA9'
  },
  biometricIconContainer: {
    marginBottom: 20,
    marginTop: 10
  }
});