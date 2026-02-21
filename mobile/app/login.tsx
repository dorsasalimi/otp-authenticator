import React, { useState, useRef, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  I18nManager,
} from "react-native";
import { useRouter } from "expo-router";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import CustomText from "@/components/CustomText"; 

const API_URL = "http://192.168.100.59:3000/api";

const toEnglishNumbers = (str: string): string => {
  if (!str) return str;
  const persianNumbers: { [key: string]: string } = {
    "۰": "0",
    "۱": "1",
    "۲": "2",
    "۳": "3",
    "۴": "4",
    "۵": "5",
    "۶": "6",
    "۷": "7",
    "۸": "8",
    "۹": "9",
  };
  return str.replace(
    /[۰-۹٠-٩]/g,
    (char: string) => persianNumbers[char] || char,
  );
};

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState(["", "", "", "", ""]);
  const [pin, setPin] = useState(["", "", "", ""]);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pinSetupStep, setPinSetupStep] = useState("create");
  const [tempPin, setTempPin] = useState("");
  const [setupPin, setSetupPin] = useState(["", "", "", ""]);
  const [loginMode, setLoginMode] = useState("otp");
  const [showPinLogin, setShowPinLogin] = useState(false);
  const [verificationToken, setVerificationToken] = useState("");
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const englishPhone = toEnglishNumbers(phone);

  useEffect(() => {
    checkUserStatus();
  }, []);

  useEffect(() => {
    if (step === 4) {
      setSetupPin(["", "", "", ""]);
      setPinSetupStep("create");
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 300);
    }
  }, [step]);

  const checkUserStatus = async () => {
    try {
      const savedPhone = await SecureStore.getItemAsync("user_phone");
      if (savedPhone) {
        setPhone(savedPhone);
      }
    } catch (error) {
      console.log("Status check failed");
    }
  };

  const handlePhoneSubmit = async (forceOTP = false) => {
    if (englishPhone.length < 11) {
      Alert.alert("خطا", "لطفاً شماره موبایل معتبر وارد کنید.");
      return;
    }

    setLoading(true);
    try {
      await SecureStore.setItemAsync("user_phone", englishPhone);

      const userStatus = await axios.get(
        `${API_URL}/pin/status/${englishPhone}`,
      );

      if (
        !forceOTP &&
        userStatus.data.success &&
        userStatus.data.data.userExists &&
        userStatus.data.data.pinEnabled
      ) {
        setPinEnabled(true);
        setShowPinLogin(true);
        setLoginMode("pin");
        setStep(3);
      } else {
        await axios.post(`${API_URL}/recovery`, {
          phoneNumber: englishPhone,
          action: "REQUEST_OTP",
        });
        setLoginMode("otp");
        setStep(2);
        setShowPinLogin(false);
      }
    } catch (error: any) {
      console.log(
        "OTP request failed:",
        error?.response?.data || error.message,
      );
      Alert.alert("خطا", error?.response?.data?.error || "ارسال کد ناموفق بود");
    } finally {
      setLoading(false);
    }
  };

const verifyOTP = async () => {
  const englishCode = code.map((digit) => toEnglishNumbers(digit)).join("");

  if (englishCode.length < 5) {
    Alert.alert("خطا", "لطفاً کد تایید را کامل وارد کنید.");
    return;
  }

  setLoading(true);

  try {
    const response = await axios.post(`${API_URL}/recovery`, {
      phoneNumber: englishPhone,
      code: englishCode,
      action: "VERIFY_OTP_ONLY",
    });

    if (!response.data.success) {
      Alert.alert("خطا", "کد وارد شده اشتباه است.");
      return;
    }

    setVerificationToken(response.data.token);

    const userStatus = await axios.get(
      `${API_URL}/pin/status/${englishPhone}`,
    );

    const userExists = userStatus.data?.data?.userExists;
    const hasPin = userStatus.data?.data?.pinEnabled;

    if (userExists) {
      await SecureStore.setItemAsync("user_phone", englishPhone);
      router.replace("/(tabs)");
    } else {
      setStep(4);
    }
  } catch (error) {
    Alert.alert("خطا", "کد وارد شده اشتباه است.");
  } finally {
    setLoading(false);
  }
};

  const handlePINLogin = async () => {
    const englishPin = pin.map((digit) => toEnglishNumbers(digit)).join("");

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/pin/verify`, {
        phoneNumber: englishPhone,
        pin: englishPin,
        action: "verify",
      });

      if (response.data.authenticated) {
        await SecureStore.setItemAsync("user_phone", englishPhone);
        router.replace("/(tabs)");
      }
    } catch (error) {
      Alert.alert("خطا", "PIN وارد شده اشتباه است.");
      setPin(["", "", "", ""]);
    } finally {
      setLoading(false);
    }
  };

  const switchToOTPLogin = async () => {
    setPin(["", "", "", ""]);
    setShowPinLogin(false);
    await handlePhoneSubmit(true);
  };

  const handlePinSetup = async () => {
    const englishPin = setupPin
      .map((digit) => toEnglishNumbers(digit))
      .join("");

    if (pinSetupStep === "create") {
      if (englishPin.length === 4) {
        setTempPin(englishPin);
        setSetupPin(["", "", "", ""]);
        setPinSetupStep("confirm");
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 100);
      }
    } else {
      if (englishPin === tempPin && englishPin.length === 4) {
        setLoading(true);
        try {
          const response = await axios.post(`${API_URL}/recovery`, {
            phoneNumber: englishPhone,
            pin: englishPin,
            verificationToken: verificationToken,
            action: "CREATE_USER_WITH_PIN",
          });

          if (response.data.success) {
            await SecureStore.setItemAsync("user_phone", englishPhone);
            router.replace("/(tabs)");
          } else {
            Alert.alert("خطا", "مشکلی در ایجاد حساب پیش آمد.");
          }
        } catch (error) {
          Alert.alert("خطا", "مشکلی پیش آمد.");
        } finally {
          setLoading(false);
        }
      } else {
        Alert.alert("خطا", "PIN مطابقت ندارد. لطفاً دوباره تلاش کنید.");
        setPinSetupStep("create");
        setSetupPin(["", "", "", ""]);
        setTempPin("");
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 100);
      }
    }
  };

  const handlePinChange = (
    text: string,
    index: number,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    currentArray: string[],
    maxLength: number,
    refs: React.MutableRefObject<(TextInput | null)[]>,
  ): void => {
    const digit = toEnglishNumbers(text)
      .replace(/[^0-9]/g, "")
      .slice(-1);
    const newArray = [...currentArray];
    newArray[index] = digit;
    setter(newArray);

    if (digit !== "" && index < maxLength - 1) {
      const nextInput = refs.current[index + 1];
      if (nextInput) {
        nextInput.focus();
      }
    }
  };

  const handleKeyPress = (
    e: any,
    index: number,
    currentArray: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.MutableRefObject<(TextInput | null)[]>,
  ): void => {
    if (
      e.nativeEvent.key === "Backspace" &&
      currentArray[index] === "" &&
      index > 0
    ) {
      const newArray = [...currentArray];
      newArray[index - 1] = "";
      setter(newArray);
      const prevInput = refs.current[index - 1];
      if (prevInput) {
        prevInput.focus();
      }
    }
  };

  const renderPinSetup = () => (
    <View style={styles.container}>
      <CustomText style={styles.title}>تنظیم PIN ورود سریع</CustomText>
      <CustomText style={styles.subtitle}>
        {pinSetupStep === "create"
          ? "یک PIN ۴ رقمی انتخاب کنید"
          : "PIN را دوباره وارد کنید"}
      </CustomText>

      <View style={styles.codeContainer}>
        <View
          style={styles.pinInputContainer}
          onLayout={() => I18nManager.forceRTL(false)}
        >
          {" "}
          {setupPin.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[
                styles.pinInput,
                digit ? styles.pinInputFilled : null,
                pinSetupStep === "confirm" && styles.confirmPinInput,
              ]}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onChangeText={(text) =>
                handlePinChange(
                  text,
                  index,
                  setSetupPin,
                  setupPin,
                  4,
                  inputRefs,
                )
              }
              onKeyPress={(e) =>
                handleKeyPress(e, index, setupPin, setSetupPin, inputRefs)
              }
              secureTextEntry={true}
              textAlign="center"
              autoFocus={index === 0}
              editable={!loading}
            />
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.mainButton,
          setupPin.join("").length < 4 && styles.buttonDisabled,
        ]}
        onPress={handlePinSetup}
        disabled={setupPin.join("").length < 4 || loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <CustomText style={styles.buttonText}>
            {pinSetupStep === "create" ? "ادامه" : "تایید"}
          </CustomText>
        )}
      </TouchableOpacity>

      {pinSetupStep === "confirm" && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            setPinSetupStep("create");
            setSetupPin(["", "", "", ""]);
            setTempPin("");
          }}
          disabled={loading}
        >
          <CustomText style={styles.backButtonText}>
            بازگشت به مرحله قبل
          </CustomText>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.fullcontainer}>
        {step === 4 ? (
          renderPinSetup()
        ) : (
          <View style={styles.container}>
            <CustomText style={styles.title}>
              {step === 1
                ? "ورود"
                : step === 2
                  ? "ورود با پیامک"
                  : "پین را وارد کنید"}
            </CustomText>

            {step === 2 && (
              <>
                <CustomText style={styles.subtitle}>
                  کدی که برایتان ارسال کردیم را وارد کنید
                </CustomText>
                <View style={styles.numberBox}>
                  <CustomText style={styles.numberText}>
                    {englishPhone}
                  </CustomText>
                </View>
              </>
            )}
            {step === 3 && (
              <View style={styles.numberBox}>
                <CustomText style={styles.numberText}>
                  {englishPhone}
                </CustomText>
              </View>
            )}

            {step === 1 && (
              <View style={styles.inputContainer}>
                <CustomText style={styles.inputLabel}>شماره موبایل</CustomText>
                <TextInput
                  style={styles.input}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  maxLength={11}
                  placeholder="09123456789"
                  placeholderTextColor="#999"
                  editable={!loading}
                  textAlign="right"
                />
              </View>
            )}

            {(step === 2 || step === 3) && (
              <View style={styles.codeContainer}>
                <View style={styles.pinInputContainer}>
                  {(step === 2 ? code : pin).map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => (inputRefs.current[index] = ref)}
                      style={[
                        step === 2 ? styles.codeInput : styles.pinInput,
                        digit ? styles.codeInputFilled : null,
                      ]}
                      keyboardType="number-pad"
                      maxLength={1}
                      value={digit}
                      onChangeText={(text) =>
                        step === 2
                          ? handlePinChange(
                              text,
                              index,
                              setCode,
                              code,
                              5,
                              inputRefs,
                            )
                          : handlePinChange(
                              text,
                              index,
                              setPin,
                              pin,
                              4,
                              inputRefs,
                            )
                      }
                      onKeyPress={(e) =>
                        step === 2
                          ? handleKeyPress(e, index, code, setCode, inputRefs)
                          : handleKeyPress(e, index, pin, setPin, inputRefs)
                      }
                      secureTextEntry={step === 3}
                      textAlign="center"
                      editable={!loading}
                      autoFocus={step === 3 && index === 0}
                    />
                  ))}
                </View>
              </View>
            )}

            {step === 2 && (
              <View>
                <CustomText style={styles.backTextnewcodefirst}>
                  پیامک را دریافت نکردید؟
                </CustomText>

                <View style={styles.newcode}>
                  <CustomText style={styles.backTextnewcodefirst}>
                    یا اسپم خود را بررسی کنید
                  </CustomText>

                  <TouchableOpacity
                    onPress={() => setStep(1)}
                    disabled={loading}
                  >
                    <CustomText
                      style={[styles.backTextnewcode, styles.linkText]}
                    >
                      کد جدید دریافت کنید
                    </CustomText>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.mainButton}
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
                <CustomText style={styles.buttonText}>
                  {step === 1 ? "ادامه" : step === 2 ? "تایید کد" : "ورود"}
                </CustomText>
              )}
            </TouchableOpacity>

            {/* Toggle buttons for login methods */}
            {step === 2 && pinEnabled && (
              <TouchableOpacity
                style={styles.methodToggleButton}
                onPress={() => {
                  setStep(3);
                  setShowPinLogin(true);
                }}
                disabled={loading}
              >
                <CustomText style={styles.methodToggleText}>
                  ورود با پین
                </CustomText>
              </TouchableOpacity>
            )}

            {step === 3 && showPinLogin && (
              <TouchableOpacity
                style={styles.methodToggleButton}
                onPress={switchToOTPLogin}
                disabled={loading}
              >
                <CustomText style={styles.methodToggleText}>
                  ورود با کد پیامکی
                </CustomText>
              </TouchableOpacity>
            )}

            {step === 3 && !showPinLogin && (
              <TouchableOpacity onPress={() => setStep(1)} disabled={loading}>
                <CustomText style={styles.backTextnewcode}>بازگشت</CustomText>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  fullcontainer: {
    flex: 1,
    backgroundColor: "#EDF1F2",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  container: {
    width: "100%",
    height: "75%",
    backgroundColor: "#fff",
    padding: 30,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: "500",
    textAlign: "center",
    color: "#000000",
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  numberBox: {
    backgroundColor: "#EDF1F2",
    borderRadius: 10,
    paddingVertical: 7,
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  numberText: {
    color: "#000",
    fontSize: 18,
  },
  inputContainer: {
    marginBottom: 30,
    width: "100%",
  },
  inputLabel: {
    fontSize: 16,
    textAlign: "right",
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: "#75C3D7",
    borderRadius: 10,
    padding: 15,
    fontSize: 18,
    textAlign: "right",
    fontFamily: "YekanBakh",
  },
  codeContainer: {
    marginBottom: 10,
    width: "100%",
    alignItems: "center",
  },
  pinInputContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  codeInput: {
    borderWidth: 2,
    borderColor: "#75C3D7",
    borderRadius: 10,
    width: 55,
    height: 55,
    fontSize: 24,
    textAlign: "center",
    writingDirection: "ltr",
    fontFamily: "YekanBakh",
  },
  pinInput: {
    borderWidth: 2,
    borderColor: "#75C3D7",
    borderRadius: 10,
    width: 65,
    height: 65,
    fontSize: 28,
    textAlign: "center",
    writingDirection: "ltr",
    fontFamily: "YekanBakh",
  },
  confirmPinInput: {
    borderColor: "#FFA500",
  },
  codeInputFilled: {
    borderColor: "#168CA9",
    backgroundColor: "#f0f9ff",
  },
  pinInputFilled: {
    borderColor: "#168CA9",
    backgroundColor: "#f0f9ff",
  },
  mainButton: {
    backgroundColor: "#168CA9",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 18,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  backTextnewcode: {
    color: "#168CA9",
    fontFamily: "YekanBakh",
    fontSize: 16,
    textAlign: "center",
  },
  backTextnewcodefirst: {
    color: "#666",
    fontSize: 16,
    textAlign: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  backButton: {
    marginTop: 15,
    padding: 10,
    alignItems: "center",
  },
  backButtonText: {
    color: "#168CA9",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  methodToggleButton: {
    marginBottom: 10,
    padding: 10,
    alignItems: "center",
  },
  methodToggleText: {
    color: "#168CA9",
    fontSize: 16,
    fontWeight: "500",
  },
  newcode: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
  },
  linkText: {
    fontWeight: "bold",
    fontFamily: "YekanBakh",
  },
});
