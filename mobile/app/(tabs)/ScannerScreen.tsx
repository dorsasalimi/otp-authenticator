import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, Alert, TouchableOpacity } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { URL } from "react-native-url-polyfill";
import { useRouter } from "expo-router"; // اضافه کردن این خط
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import Constants from "expo-constants";
import CryptoJS from "crypto-js";
const APP_SECRET = Constants.expoConfig?.extra?.appSecret;

export default function ScannerScreen({ navigation }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const router = useRouter(); // تعریف روتر
  // درخواست دسترسی هنگام لود شدن صفحه
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      // هر بار که صفحه فوکوس می‌شود (کاربر وارد صفحه می‌شود)
      setScanned(false);
    }, []),
  );

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
  if (scanned) return;
  setScanned(true);

  if (data.startsWith("otpauth://")) {
    try {
      const parsedUrl = new URL(data);
      const secret = parsedUrl.searchParams.get("secret");
      const issuer = parsedUrl.searchParams.get("issuer") || "سرویس جدید";
      const label = decodeURIComponent(parsedUrl.pathname.split(":").pop() || "");
      const apiKey = parsedUrl.searchParams.get("apiKey");
      if (secret) {
        // ۱. بررسی تکراری بودن در همان ابتدا (قبل از درخواست به سرور)
        const localData = await SecureStore.getItemAsync("otp_accounts");
        const accounts = localData ? JSON.parse(localData) : [];
        if (accounts.some((acc: any) => acc.secret === secret)) {
          Alert.alert("اطلاع", "این سرویس قبلاً اضافه شده است.");
          router.replace("/");
          return;
        }

        const phone = await SecureStore.getItemAsync("user_phone");
        const timestamp = Date.now().toString();
        const signature = CryptoJS.HmacSHA256(timestamp + phone, APP_SECRET).toString(CryptoJS.enc.Hex);
        console.log(signature)

        // ۲. ابتدا ارسال به سرور (Verification)
        try {
          // استفاده از await برای اینکه تا جواب سرور نیامده پایین‌تر نرود
          await axios.post(
            "http://192.168.100.2:3000/api/verify-otp",
            { phoneNumber: phone, secret: secret },
            {
              headers: {
                "X-Signature": signature,
                "X-Timestamp": timestamp,
              },
            }
          );
console.log("bbbbbb")
          // ۳. فقط اگر خط بالا با موفقیت اجرا شد (Status 200)، در گوشی ذخیره کن
          const newAccount = { id: Date.now().toString(), secret, issuer, label, apiKey };
          const updatedAccounts = [...accounts, newAccount];
          await SecureStore.setItemAsync("otp_accounts", JSON.stringify(updatedAccounts));

          Alert.alert("موفقیت", `سرویس ${secret} با موفقیت تایید و فعال شد`, [
            { text: "تایید", onPress: () => router.replace("/") },
          ]);

        } catch (apiErr: any) {
          console.log("Server Sync Error:", apiErr);
          // اگر سرور 403 داد یا کلاً وصل نشد، اینجا اجرا می‌شود
          const errorMsg = apiErr.response?.status === 403
            ? "تایید امنیتی با شکست مواجه شد. (Signature Error)"
            : "خطا در اتصال به سرور. لطفاً اینترنت خود را چک کنید.";

          Alert.alert("خطای سیستمی", errorMsg);
          setScanned(false); // اجازه اسکن دوباره
        }
      }
    } catch (e) {
      Alert.alert("خطا", "کد اسکن شده معتبر نیست");
      setScanned(false);
    }
  } else {
    Alert.alert("خطا", "این یک کد QR امنیتی نیست");
    setTimeout(() => setScanned(false), 2000);
  }
};

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: "center" }}>
          برای استفاده از اسکنر، دسترسی دوربین لازم است
        </Text>
        <TouchableOpacity onPress={requestPermission} style={styles.button}>
          <Text style={{ color: "white" }}>دادن دسترسی</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        // نکته: نام متد ممکن است در برخی نسخه‌ها onBarcodeScanned باشد،
        // اما ورودی آن یک آبجکت شامل 'data' و 'type' است.
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"], // نام پروپ اصلاح شد
        }}
      />
      {/* لایه بصری برای راهنمایی کاربر */}
      <View style={styles.overlay}>
        <View style={styles.targetBox} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center" },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  targetBox: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: "#00FF00",
    backgroundColor: "transparent",
    borderRadius: 20,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    margin: 20,
    borderRadius: 10,
    alignItems: "center",
  },
});
