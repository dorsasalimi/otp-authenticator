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

export default function ChangePinScreen() {
  const router = useRouter();
  const [currentPin, setCurrentPin] = useState(["", "", "", ""]);
  const [newPin, setNewPin] = useState(["", "", "", ""]);
  const [confirmPin, setConfirmPin] = useState(["", "", "", ""]);
  const [step, setStep] = useState<"current" | "new" | "confirm">("current");
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verifiedCurrentPin, setVerifiedCurrentPin] = useState("");

  const currentPinRefs = useRef<(TextInput | null)[]>([]);
  const newPinRefs = useRef<(TextInput | null)[]>([]);
  const confirmPinRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    loadUserPhone();
  }, []);

  useEffect(() => {
    // Clear sensitive data when component unmounts
    return () => {
      setCurrentPin(["", "", "", ""]);
      setNewPin(["", "", "", ""]);
      setConfirmPin(["", "", "", ""]);
      setVerifiedCurrentPin("");
    };
  }, []);

  useEffect(() => {
    // Focus first input when step changes
    setTimeout(() => {
      if (step === "current" && currentPinRefs.current[0]) {
        currentPinRefs.current[0].focus();
      } else if (step === "new" && newPinRefs.current[0]) {
        newPinRefs.current[0].focus();
      } else if (step === "confirm" && confirmPinRefs.current[0]) {
        confirmPinRefs.current[0].focus();
      }
    }, 300);
  }, [step]);

  const loadUserPhone = async () => {
    try {
      const phone = await SecureStore.getItemAsync("user_phone");
      if (phone) {
        setPhoneNumber(phone);
      } else {
        Alert.alert("خطا", "لطفاً ابتدا وارد شوید");
        router.replace("/");
      }
    } catch (error) {
      console.log("Failed to load user phone");
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

  const handleCurrentPinSubmit = async () => {
    const englishPin = currentPin
      .map((digit) => toEnglishNumbers(digit))
      .join("");

    if (englishPin.length < 4) {
      Alert.alert("خطا", "لطفاً پین فعلی را کامل وارد کنید.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/pin/verify`, {
        phoneNumber,
        pin: englishPin,
        action: "verify",
      });

      if (response.data.authenticated) {
        // Store the verified PIN before clearing
        setVerifiedCurrentPin(englishPin);
        setStep("new");
        setCurrentPin(["", "", "", ""]); // Clear for security
      }
    } catch (error: any) {
      console.error("PIN verification error:", error.response?.data || error);
      const errorMessage =
        error?.response?.data?.error ||
        "پین وارد شده اشتباه است. لطفاً دوباره تلاش کنید.";

      Alert.alert("خطا", errorMessage);
      setCurrentPin(["", "", "", ""]);
      // Focus on first input
      setTimeout(() => {
        currentPinRefs.current[0]?.focus();
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  const handleNewPinSubmit = () => {
    const englishNewPin = newPin
      .map((digit) => toEnglishNumbers(digit))
      .join("");

    if (englishNewPin.length < 4) {
      Alert.alert("خطا", "لطفاً پین جدید را کامل وارد کنید.");
      return;
    }

    setStep("confirm");
  };

  const handleConfirmPinSubmit = async () => {
    const englishNewPin = newPin
      .map((digit) => toEnglishNumbers(digit))
      .join("");
    const englishConfirmPin = confirmPin
      .map((digit) => toEnglishNumbers(digit))
      .join("");

    if (englishConfirmPin.length < 4) {
      Alert.alert("خطا", "لطفاً تایید پین را کامل وارد کنید.");
      return;
    }

    if (englishNewPin !== englishConfirmPin) {
      Alert.alert("خطا", "پین جدید و تایید آن مطابقت ندارند.");
      setConfirmPin(["", "", "", ""]);
      // Focus on first input of confirm
      setTimeout(() => {
        confirmPinRefs.current[0]?.focus();
      }, 100);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/pin/change`, {
        phoneNumber,
        oldPin: verifiedCurrentPin, // Use the stored verified PIN
        pin: englishNewPin,
        action: "change",
      });

      if (response.data.success) {
        Alert.alert("موفق", "پین شما با موفقیت تغییر کرد.", [
          {
            text: "باشه",
            onPress: () => router.back(),
          },
        ]);
      }
    } catch (error: any) {
      console.error("Change PIN error:", error.response?.data || error);
      const errorMessage =
        error?.response?.data?.error ||
        "تغییر پین ناموفق بود. لطفاً دوباره تلاش کنید.";

      Alert.alert("خطا", errorMessage); // Reset to current PIN step on failure
      setStep("current");
      setCurrentPin(["", "", "", ""]);
      setNewPin(["", "", "", ""]);
      setConfirmPin(["", "", "", ""]);
      setVerifiedCurrentPin("");
    } finally {
      setLoading(false);
    }
  };

  const renderPinInput = (
    pinArray: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.MutableRefObject<(TextInput | null)[]>,
    placeholder: string,
    autoFocus: boolean = false,
  ) => (
    <View style={styles.pinInputContainer}>
      {pinArray.map((digit, index) => (
        <TextInput
          key={index}
          ref={(ref) => (refs.current[index] = ref)}
          style={[styles.pinInput, digit ? styles.pinInputFilled : null]}
          keyboardType="number-pad"
          maxLength={1}
          value={digit}
          onChangeText={(text) =>
            handlePinChange(text, index, setter, pinArray, 4, refs)
          }
          onKeyPress={(e) => handleKeyPress(e, index, pinArray, setter, refs)}
          secureTextEntry={true}
          textAlign="center"
          autoFocus={autoFocus && index === 0}
          editable={!loading}
        />
      ))}
    </View>
  );

  const getStepTitle = () => {
    switch (step) {
      case "current":
        return "پین فعلی را وارد کنید";
      case "new":
        return "پین جدید را وارد کنید";
      case "confirm":
        return "پین جدید را دوباره وارد کنید";
    }
  };

  const getStepSubtitle = () => {
    switch (step) {
      case "current":
        return "برای تغییر پین، ابتدا پین فعلی را وارد کنید";
      case "new":
        return "یک پین ۴ رقمی جدید انتخاب کنید";
      case "confirm":
        return "پین جدید را دوباره وارد کنید";
    }
  };

  const handleSubmit = () => {
    switch (step) {
      case "current":
        handleCurrentPinSubmit();
        break;
      case "new":
        handleNewPinSubmit();
        break;
      case "confirm":
        handleConfirmPinSubmit();
        break;
    }
  };

  const isSubmitDisabled = () => {
    switch (step) {
      case "current":
        return currentPin.join("").length < 4;
      case "new":
        return newPin.join("").length < 4;
      case "confirm":
        return confirmPin.join("").length < 4;
      default:
        return true;
    }
  };

  const handleBack = () => {
    if (step === "new") {
      setStep("current");
      setNewPin(["", "", "", ""]);
      setVerifiedCurrentPin(""); // Clear stored PIN when going back
    } else if (step === "confirm") {
      setStep("new");
      setConfirmPin(["", "", "", ""]);
    } else {
      router.back();
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.fullcontainer}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <CustomText style={styles.backButtonText}>
              {step === "current" ? "بازگشت" : "مرحله قبل"}
            </CustomText>
          </TouchableOpacity>

          <CustomText style={styles.title}>{getStepTitle()}</CustomText>
          <CustomText style={styles.subtitle}>{getStepSubtitle()}</CustomText>

          <View style={styles.phoneContainer}>
            <CustomText style={styles.phoneText}>{phoneNumber}</CustomText>
          </View>

          <View style={styles.codeContainer}>
            {step === "current" &&
              renderPinInput(
                currentPin,
                setCurrentPin,
                currentPinRefs,
                "پین فعلی",
                true,
              )}

            {step === "new" &&
              renderPinInput(newPin, setNewPin, newPinRefs, "پین جدید", true)}

            {step === "confirm" &&
              renderPinInput(
                confirmPin,
                setConfirmPin,
                confirmPinRefs,
                "تایید پین",
                true,
              )}
          </View>

          <TouchableOpacity
            style={[
              styles.mainButton,
              isSubmitDisabled() && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitDisabled() || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <CustomText style={styles.buttonText}>
                {step === "current"
                  ? "تایید"
                  : step === "new"
                    ? "ادامه"
                    : "تغییر پین"}
              </CustomText>
            )}
          </TouchableOpacity>

          {step === "confirm" && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setStep("new");
                setConfirmPin(["", "", "", ""]);
              }}
              disabled={loading}
            >
              <CustomText style={styles.cancelButtonText}>
                ویرایش پین جدید
              </CustomText>
            </TouchableOpacity>
          )}
        </View>
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
    height: "70%",
    backgroundColor: "#fff",
    padding: 30,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    elevation: 5,
  },
  backButton: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 1,
    padding: 10,
  },
  backButtonText: {
    color: "#168CA9",
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    textAlign: "center",
    color: "#000000",
    marginBottom: 10,
    fontFamily: "YekanBakh",
    marginTop: 20,
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  phoneContainer: {
    backgroundColor: "#EDF1F2",
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 15,
    alignSelf: "center",
    marginBottom: 30,
  },
  phoneText: {
    color: "#000",
    fontSize: 16,
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
  pinInputFilled: {
    borderColor: "#168CA9",
    backgroundColor: "#f0f9ff",
  },
  mainButton: {
    backgroundColor: "#168CA9",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 30,
  },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelButton: {
    marginTop: 15,
    padding: 10,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#168CA9",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
