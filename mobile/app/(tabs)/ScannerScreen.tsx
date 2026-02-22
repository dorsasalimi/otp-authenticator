import React, { useState, useEffect, useCallback } from "react";
import { StyleSheet, View, Alert, TouchableOpacity } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { URL } from "react-native-url-polyfill";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import Constants from "expo-constants";
import CryptoJS from "crypto-js";
import CustomText from "@/components/CustomText";

const APP_SECRET = Constants.expoConfig?.extra?.appSecret;

export default function ScannerScreen({ navigation }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
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

          try {
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

            const newAccount = { id: Date.now().toString(), secret, issuer, label, apiKey };
            const updatedAccounts = [...accounts, newAccount];
            await SecureStore.setItemAsync("otp_accounts", JSON.stringify(updatedAccounts));

            Alert.alert("موفقیت", `سرویس ${secret} با موفقیت تایید و فعال شد`, [
              { text: "تایید", onPress: () => router.replace("/") },
            ]);

          } catch (apiErr: any) {
            console.log("Server Sync Error:", apiErr);
            const errorMsg = apiErr.response?.status === 403
              ? "تایید امنیتی با شکست مواجه شد. (Signature Error)"
              : "خطا در اتصال به سرور. لطفاً اینترنت خود را چک کنید.";

            Alert.alert("خطای سیستمی", errorMsg);
            setScanned(false);
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
        <CustomText style={styles.textCenter}>
          برای استفاده از اسکنر، دسترسی دوربین لازم است
        </CustomText>
        <TouchableOpacity onPress={requestPermission} style={styles.button}>
          <CustomText style={styles.buttonText}>دادن دسترسی</CustomText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      />
      <View style={styles.overlay}>
        <View style={styles.targetBox} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: "center" 
  },
  textCenter: {
    textAlign: "center",
    marginHorizontal: 20,
    marginBottom: 20,
  },
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
  buttonText: {
    color: "white",
    textAlign: "center",
  },
});