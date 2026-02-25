import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Dimensions,
  Platform,
  Animated,
  Easing,
  BackHandler,
} from "react-native";
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from "expo-secure-store";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect } from "@react-navigation/native";
import { Buffer } from "buffer";
import base32 from "hi-base32";
import * as CryptoJS from "crypto-js";
import sha1 from "js-sha1";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import axios from "axios";
import Constants from "expo-constants";
import Svg, { Circle, Path } from "react-native-svg";
import CustomText from "@/components/CustomText";
import MenuModal from "@/components/MenuModal";

global.Buffer = Buffer;

const { width } = Dimensions.get("screen");

let NavigationBar: any = null;
if (Platform.OS === 'android') {
  try {
    NavigationBar = require('expo-navigation-bar');
  } catch (e) {
    console.log("NavigationBar not found");
  }
}

interface Account {
  id: string;
  secret: string;
  issuer: string;
  label: string;
  apiKey?: string;
}

const APP_SECRET = Constants.expoConfig?.extra?.appSecret;

const MenuIcon = () => (
  <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 6H20M4 12H20M4 18H20"
      stroke="#000"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const TrashIcon = () => (
  <Svg width={30} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 6H5H21"
      stroke="#FF3B30"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z"
      stroke="#FF3B30"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M10 11V17"
      stroke="#FF3B30"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M14 11V17"
      stroke="#FF3B30"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const CircularProgressBar = ({
  size = 44,
  strokeWidth = 3,
  color,
}: {
  size: number;
  strokeWidth: number;
  seconds: number;
  color: string;
  accountId: string;
}) => {
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    let listenerId: string;

    const startAnimation = () => {
      const now = Date.now();
      const msInCurrentCycle = now % 30000;
      const initialProgress = msInCurrentCycle / 30000;
      const remainingTime = 30000 - msInCurrentCycle;

      animatedValue.setValue(initialProgress);

      animation = Animated.timing(animatedValue, {
        toValue: 1,
        duration: remainingTime,
        easing: Easing.linear,
        useNativeDriver: false,
      });

      animation.start(({ finished }) => {
        if (finished) {
          animatedValue.setValue(0);
          startAnimation();
        }
      });
    };

    startAnimation();

    listenerId = animatedValue.addListener(({ value }) => {
      setProgress(value);
    });

    return () => {
      if (animation) {
        animation.stop();
      }
      animatedValue.removeListener(listenerId);
    };
  }, []);

  const getPiePath = () => {
    const anglePercent = 1 - progress;
    if (anglePercent <= 0) {
      return `M ${center} ${center} L ${center} ${center} Z`;
    }

    const angle = anglePercent * 360;
    const angleRad = (angle * Math.PI) / 180;
    const endX = center + radius * Math.sin(angleRad);
    const endY = center - radius * Math.cos(angleRad);
    const largeArcFlag = angle > 180 ? 1 : 0;

    if (angle >= 360) {
      return `M ${center} ${center} m -${radius} 0 a ${radius} ${radius} 0 1 0 ${radius * 2} 0 a ${radius} ${radius} 0 1 0 -${radius * 2} 0`;
    }

    return `M ${center} ${center} L ${center} ${center - radius} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
  };

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={`${color}20`}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Path
          d={getPiePath()}
          fill={color}
          stroke="none"
        />
      </Svg>
    </View>
  );
};

export default function HomeScreen() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [codes, setCodes] = useState<{ [key: string]: string }>({});
  const [timeProgress, setTimeProgress] = useState<{ [key: string]: number }>({});
  const [timeDrift, setTimeDrift] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const router = useRouter();
  const [accountToDelete, setAccountToDelete] = useState<{ id: string; issuer: string } | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [showExitToast, setShowExitToast] = useState(false);
const [phoneNumber, setPhoneNumber] = useState<string>("");

  const backPressCount = useRef(0);
  const backPressTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const backAction = () => {
      if (router.canGoBack()) {
        router.back();
        return true;
      } else {
        if (backPressCount.current === 0) {
          backPressCount.current = 1;

          setShowExitToast(true);
          setTimeout(() => setShowExitToast(false), 1500);

          backPressTimer.current = setTimeout(() => {
            backPressCount.current = 0;
            backPressTimer.current = null;
          }, 2000);

          return true;
        } else {
          if (backPressTimer.current) {
            clearTimeout(backPressTimer.current);
            backPressTimer.current = null;
          }
          backPressCount.current = 0;

          BackHandler.exitApp();
          return true;
        }
      }
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => {
      backHandler.remove();
      if (backPressTimer.current) {
        clearTimeout(backPressTimer.current);
      }
    };
  }, [router]);

  const requestDelete = (id: string, issuer: string) => {
    setAccountToDelete({ id, issuer });
    setConfirmText("");
    setModalVisible(true);
  };

  const confirmDelete = async () => {
    if (confirmText.toLowerCase() === "confirm" && accountToDelete) {
      const targetAccount = accounts.find((acc) => acc.id === accountToDelete.id);
      try {
        if (targetAccount?.apiKey) {
          const phone = await SecureStore.getItemAsync("user_phone");
          const timestamp = Date.now().toString();
          const signature = CryptoJS.HmacSHA256(timestamp + (phone || ""), APP_SECRET || "").toString(CryptoJS.enc.Hex);

          const response = await axios.post(
            "http://192.168.100.2:3000/api/remove-otp",
            { phoneNumber: phone, apiKey: targetAccount.apiKey },
            { headers: { "X-Signature": signature, "X-Timestamp": timestamp } }
          );
          if (response.data && response.data.success === false) throw new Error("Server denied");
        }

        const updatedAccounts = accounts.filter((acc) => acc.id !== accountToDelete.id);
        await SecureStore.setItemAsync("otp_accounts", JSON.stringify(updatedAccounts));
        setAccounts(updatedAccounts);
        setModalVisible(false);
      } catch (error) {
        Alert.alert("خطا", "امکان حذف از سرور وجود نداشت.");
      }
    }
  };
useEffect(() => {
  const loadPhoneNumber = async () => {
    try {
      const phone = await SecureStore.getItemAsync("user_phone");
      console.log("Loaded phone number:", phone);
      if (phone) {
        setPhoneNumber(phone);
      }
    } catch (error) {
      console.error("Error loading phone number:", error);
    }
  };
  
  loadPhoneNumber();
}, []);

const handleMenuOpen = async () => {
  try {
    const phone = await SecureStore.getItemAsync("user_phone");
    if (phone) {
      setPhoneNumber(phone);
    }
  } catch (error) {
    console.error("Error loading phone number:", error);
  }
  setMenuVisible(true);
};
  const generateTOTP = (secret: string, drift: number = 0) => {
    try {
      const cleanSecret = secret.replace(/\s+/g, "").toUpperCase();
      const key = base32.decode.asBytes(cleanSecret);
      const epoch = Math.floor((Date.now() + drift) / 1000);
      const counter = Math.floor(epoch / 30);
      const buf = Buffer.alloc(8);
      let tmpCounter = BigInt(counter);
      for (let i = 7; i >= 0; i--) {
        buf[i] = Number(tmpCounter & BigInt(0xff));
        tmpCounter = tmpCounter >> BigInt(8);
      }
      const hmac = (sha1 as any).hmac(key, buf);
      const offset = hmac[hmac.length - 1] & 0xf;
      const code = (((hmac[offset] & 0x7f) << 24) | 
                    ((hmac[offset + 1] & 0xff) << 16) | 
                    ((hmac[offset + 2] & 0xff) << 8) | 
                    (hmac[offset + 3] & 0xff)) % 1000000;
      return code.toString().padStart(6, "0");
    } catch (e) { 
      return "000000"; 
    }
  };

  useFocusEffect(
    useCallback(() => {
      const loadAccounts = async () => {
        const data = await SecureStore.getItemAsync("otp_accounts");
        if (data) setAccounts(JSON.parse(data));
      };
      loadAccounts();
    }, [])
  );

  useEffect(() => {
    const updateTick = () => {
      const epoch = Math.floor(Date.now() / 1000);
      const seconds = epoch % 30;
      const newProgress: { [key: string]: number } = {};
      const newCodes: { [key: string]: string } = {};

      accounts.forEach((acc) => {
        newCodes[acc.id] = generateTOTP(acc.secret, timeDrift);
        newProgress[acc.id] = seconds;
      });

      setCodes(newCodes);
      setTimeProgress(newProgress);
    };

    updateTick();
    const interval = setInterval(updateTick, 1000);
    return () => clearInterval(interval);
  }, [accounts, timeDrift]);

  const copyToClipboard = async (code: string, id: string) => {
    await Clipboard.setStringAsync(code);
    Alert.alert("کپی شد", "کد تایید در کلیپ‌بورد ذخیره شد.");
  };

  const logout = async () => {
    Alert.alert("خروج از حساب", "آیا مطمئن هستید؟", [
      { text: "لغو", style: "cancel" },
      {
        text: "خروج",
        style: "destructive",
        onPress: async () => {
          await SecureStore.deleteItemAsync("user_phone");
          router.replace("/login");
        },
      },
    ]);
  };

  const getProgressColor = (seconds: number) => {
    const remaining = 30 - seconds;
    if (remaining <= 5) return "#FF3B30";
    if (remaining <= 10) return "#FF9500";
    return "#007AFF";
  };

  const renderItem = ({ item }: { item: Account }) => {
    const seconds = timeProgress[item.id] || 0;
    const progressColor = getProgressColor(seconds);

    return (
      <View style={styles.card}>
        <View style={styles.accountInfo}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <CustomText style={styles.iconLetter}>{item.issuer.charAt(0).toUpperCase()}</CustomText>
            </View>
            <View style={styles.accountTextContainer}>
              <CustomText style={styles.issuer}>{item.issuer}</CustomText>
              <CustomText style={styles.label}>{item.label}</CustomText>
            </View>
            <View style={styles.timerContainer}>
              <CircularProgressBar
                size={44}
                strokeWidth={3}
                seconds={seconds}
                color={progressColor}
                accountId={item.id}
              />
            </View>
          </View>

          <View style={styles.codeContainer}>
            <TouchableOpacity
              style={styles.codeAndTimer}
              onPress={() => copyToClipboard(codes[item.id], item.id)}
              activeOpacity={0.7}
            >
              <View style={styles.otpContainer}>
                {(codes[item.id] || "000000").split("").map((digit, index) => (
                  <View
                    key={index}
                    style={[
                      styles.otpDigitBox,
                      { backgroundColor: progressColor },
                      index === 3 && { marginLeft: 10 }
                    ]}
                  >
                    <CustomText style={styles.otpDigit}>{digit}</CustomText>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                onPress={() => requestDelete(item.id, item.issuer)}
                hitSlop={10}
                style={styles.trashButton}
              >
                <TrashIcon />
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" hidden={false} />

<View style={styles.header}>
  <TouchableOpacity onPress={handleMenuOpen} style={styles.headerSide}>
    <MenuIcon />
  </TouchableOpacity>

  <View style={styles.headerTitleContainer}>
    <CustomText style={styles.title}>خانه</CustomText>
  </View>

  <View style={styles.headerSide} />
</View>

      <FlatList
        data={accounts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <CustomText style={styles.emptyText}>هنوز سرویسی فعال نکردید</CustomText>
          </View>
        }
      />

      <Modal animationType="fade" transparent={true} visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.warningIcon}>
              <Ionicons name="alert-circle" size={40} color="#FF3B30" />
            </View>
            <CustomText style={styles.modalTitle}>حذف سرویس {accountToDelete?.issuer}</CustomText>
            <CustomText style={styles.modalSub}>برای تایید عبارت "confirm" را وارد کنید.</CustomText>
            <TextInput
              style={styles.modalInput}
              placeholder="confirm"
              value={confirmText}
              onChangeText={setConfirmText}
              autoCapitalize="none"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.btnDelete} onPress={confirmDelete}>
                <CustomText style={styles.btnDeleteText}>حذف دائمی</CustomText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setModalVisible(false)}>
                <CustomText style={styles.btnCancelText}>انصراف</CustomText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {showExitToast && (
        <View style={styles.exitToast}>
          <CustomText style={styles.exitToastText}>برای خروج دوباره کلیک کنید</CustomText>
        </View>
      )}

      <TouchableOpacity style={styles.fab} onPress={() => router.push("/ScannerScreen" as any)}>
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>

      <MenuModal
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onLogout={logout}
        phoneNumber={phoneNumber}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#75C3D7",
  },
 header: {
  paddingTop: Platform.OS === "ios" ? 70 : 40,
  paddingBottom: 10,
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 20,
},
headerSide: {
  width: 40,
  alignItems: "center",
  justifyContent: "center",
},

headerTitleContainer: {
  flex: 1,
  alignItems: "center",
},
  titleContainer: { alignItems: 'center' },
  title: { fontSize: 23, fontWeight: "500", color: "#ffffff" },
  list: { padding: 20, paddingBottom: 100 },
  card: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EEF6FF',
    justifyContent: 'center',
    alignItems: 'center'
  },
  iconLetter: { fontSize: 18, fontWeight: 'bold', color: '#007AFF' },
  accountTextContainer: { flex: 1, marginLeft: 12 },
  accountInfo: { flex: 1 },
  issuer: { fontSize: 17, fontWeight: "700", color: "#1C1C1E" },
  label: { fontSize: 13, color: "#8E8E93", marginTop: 2 },
  codeContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  codeAndTimer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  timerContainer: { marginLeft: 12 },
  fab: {
    position: "absolute",
    right: 24,
    bottom: 34,
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: "#1B7ACE",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center"
  },
  modalContent: {
    width: width * 0.85,
    backgroundColor: "white",
    borderRadius: 28,
    padding: 24,
    alignItems: "center"
  },
  warningIcon: {
    marginBottom: 15,
    backgroundColor: '#FFF2F2',
    padding: 10,
    borderRadius: 50
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  modalSub: { textAlign: "center", marginBottom: 20, color: "#636366" },
  modalInput: {
    width: "100%",
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    textAlign: "center"
  },
  modalButtons: { width: "100%" },
  btnDelete: {
    backgroundColor: "#FF3B30",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 10
  },
  btnDeleteText: { color: "white", fontWeight: "700" },
  btnCancel: { padding: 16, alignItems: "center" },
  btnCancelText: { color: "#8E8E93" },
  emptyContainer: { alignItems: "center", marginTop: 100 },
  emptyText: { color: "#636366", marginTop: 15 },
  trashButton: { padding: 8, marginLeft: 8 },
  otpContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    flexWrap: "wrap",
  },
  otpDigitBox: {
    width: 35,
    height: 35,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 4,
  },
  otpDigit: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "500",
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  exitToast: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    zIndex: 1000,
  },
  exitToastText: {
    color: 'white',
    fontSize: 14,
  },
});