import React, { useEffect, useRef } from "react";
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Platform,
} from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import CustomText from "./CustomText";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

const HomeIcon = ({ color = "#007AFF" }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 3L4 9V21H20V9L12 3Z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <Path
      d="M9 21V15H15V21"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

const ScanIcon = ({ color = "#007AFF" }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 8V6C4 5.46957 4.21071 4.96086 4.58579 4.58579C4.96086 4.21071 5.46957 4 6 4H8M16 4H18C18.5304 4 19.0391 4.21071 19.4142 4.58579C19.7893 4.96086 20 5.46957 20 6V8M20 16V18C20 18.5304 19.7893 19.0391 19.4142 19.4142C19.0391 19.7893 18.5304 20 18 20H16M8 20H6C5.46957 20 4.96086 19.7893 4.58579 19.4142C4.21071 19.0391 4 18.5304 4 18V16"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <Path d="M8 12H16" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const SettingsIcon = ({ color = "#007AFF" }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <Path
      d="M19.4 15C19.1466 15.5746 18.9515 16.1736 18.8175 16.787L19.5 17.5L16.5 20.5L15.8 19.8C15.1866 19.934 14.5876 20.1291 14.013 20.3825L14 22H10L9.987 20.3825C9.4124 20.1291 8.8134 19.934 8.239 19.8L7.5 20.5L4.5 17.5L5.2 16.8C5.06595 16.1866 4.87092 15.5876 4.6175 15.013L3 15V11L4.6175 10.987C4.87092 10.4124 5.06595 9.8134 5.2 9.239L4.5 8.5L7.5 5.5L8.2 6.2C8.8134 6.06595 9.4124 5.87092 9.987 5.6175L10 4H14L14.013 5.6175C14.5876 5.87092 15.1866 6.06595 15.761 6.2L16.5 5.5L19.5 8.5L18.8 9.2C18.934 9.8134 19.1291 10.4124 19.3825 10.987L21 11V15L19.3825 15.013C19.1291 15.5876 18.934 16.1866 18.8 16.761L19.5 17.5L16.5 20.5L15.8 19.8Z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

const HelpIcon = ({ color = "#007AFF" }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} fill="none" />
    <Path
      d="M12 16V12M12 8H12.01"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

const InfoIcon = ({ color = "#007AFF" }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} fill="none" />
    <Path
      d="M12 16V12M12 8H12.01"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

const LogoutIcon = ({ color = "#FF3B30" }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <Path
      d="M16 17L21 12L16 7"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <Path
      d="M21 12H9"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

const UserIcon = ({ color = "#007AFF" }) => (
  <Svg width={60} height={60} viewBox="0 0 24 24" fill="none">
    <Path
      opacity="0.4"
      d="M12 22.01C17.5228 22.01 22 17.5329 22 12.01C22 6.48716 17.5228 2.01001 12 2.01001C6.47715 2.01001 2 6.48716 2 12.01C2 17.5329 6.47715 22.01 12 22.01Z"
      fill={color}
    />
    <Path
      d="M12 6.93994C9.93 6.93994 8.25 8.61994 8.25 10.6899C8.25 12.7199 9.84 14.3699 11.95 14.4299C11.98 14.4299 12.02 14.4299 12.04 14.4299C12.06 14.4299 12.09 14.4299 12.11 14.4299C12.12 14.4299 12.13 14.4299 12.13 14.4299C14.15 14.3599 15.74 12.7199 15.75 10.6899C15.75 8.61994 14.07 6.93994 12 6.93994Z"
      fill={color}
    />
    <Path
      d="M18.7807 19.36C17.0007 21 14.6207 22.01 12.0007 22.01C9.3807 22.01 7.0007 21 5.2207 19.36C5.4607 18.45 6.1107 17.62 7.0607 16.98C9.7907 15.16 14.2307 15.16 16.9407 16.98C17.9007 17.62 18.5407 18.45 18.7807 19.36Z"
      fill={color}
    />
  </Svg>
);

const CloseIcon = ({ color = "#8E8E93" }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 6L6 18M6 6L18 18"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

interface MenuModalProps {
  visible: boolean;
  onClose: () => void;
  onLogout: () => void;
  phoneNumber?: string;
}

const MenuModal: React.FC<MenuModalProps> = ({
  visible,
  onClose,
  onLogout,
  phoneNumber,
}) => {
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(-width)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const formatPhoneNumber = (phone: string) => {
    if (phone.startsWith("+98")) {
      return phone.replace(/(\+98)(\d{3})(\d{3})(\d{4})/, "$1 $2 $3 $4");
    }
    return phone;
  };

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -width,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -width,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  const menuItems = [
    {
      icon: (color: string) => <HomeIcon color={color} />,
      label: "خانه",
      onPress: () => {
        handleClose();
        router.push("/");
      },
    },
    {
      icon: (color: string) => <ScanIcon color={color} />,
      label: "درباره برنامه",
      onPress: () => {
        handleClose();
        router.push("/ScannerScreen" as any);
      },
    },
    {
      icon: (color: string) => <SettingsIcon color={color} />,
      label: "به روز رسانی برنامه",
      version: "نسخه 2.1.0",
      onPress: () => {
        handleClose();
      },
    },
    {
      icon: (color: string) => <HelpIcon color={color} />,
      label: "همگام سازی",
      onPress: () => {
        handleClose();
      },
    },
    {
      icon: (color: string) => <InfoIcon color={color} />,
      label: "تغییر پین",
      onPress: () => {
        handleClose();
      },
    },
    {
      icon: (color: string) => <LogoutIcon color={color} />,
      label: "خروج از حساب",
      onPress: () => {
        handleClose();
        onLogout();
      },
      color: "#FF3B30",
    },
  ];

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.menuContainer,
          {
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <View style={styles.menuHeader}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <CloseIcon />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <View style={styles.userInfoSection}>
              <View style={styles.userIconContainer}>
                <UserIcon color="#007AFF" />
              </View>
              <View style={styles.userInfoContainer}>
                <CustomText style={styles.appName}>خوش آمدید</CustomText>
                {phoneNumber && (
                  <CustomText style={styles.phoneNumber}>
                    {formatPhoneNumber(phoneNumber)}
                  </CustomText>
                )}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.menuItems}>
          {menuItems.map((item, index) => {
            const iconColor = item.color || "#007AFF";
            return (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={item.onPress}
              >
                <View style={styles.menuItemLeft}>
                  <View style={styles.labelContainer}>
                    <CustomText
                      style={[
                        styles.menuItemLabel,
                        item.color && { color: item.color },
                      ]}
                    >
                      {item.label}
                    </CustomText>
                    {item.version && (
                      <CustomText style={styles.versionTag}>
                        {item.version}
                      </CustomText>
                    )}
                  </View>
                  <View style={styles.iconContainer}>
                    {item.icon(iconColor)}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.menuFooter}>
          <CustomText style={styles.version}>نسخه 1.0.0</CustomText>
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  menuContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: width * 0.8,
    backgroundColor: "#fff",
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  menuHeader: {
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F7",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerContent: {
    flex: 1,
    alignItems: "flex-end",
  },
  userInfoSection: {
    alignItems: "center",
    width: "100%",
  },
  userIconContainer: {
    marginBottom: 12,
  },
  userInfoContainer: {
    alignItems: "center",
  },
  appName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1C1C1E",
    textAlign: "center",
    writingDirection: "rtl",
  },
  phoneNumber: {
    fontSize: 14,
    color: "#8E8E93",
    marginTop: 4,
    textAlign: "center",
    writingDirection: "ltr",
  },
  closeButton: {
    padding: 5,
  },
  menuItems: {
    flex: 1,
    paddingTop: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F7",
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  labelContainer: {
    alignItems: "flex-end",
    marginLeft: 12,
  },
  menuItemLabel: {
    fontSize: 16,
    color: "#1C1C1E",
    textAlign: "right",
    writingDirection: "rtl",
  },
  versionTag: {
    fontSize: 12,
    color: "#8E8E93",
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 2,
  },
  iconContainer: {
    marginLeft: 10,
  },
  menuFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#F2F2F7",
    alignItems: "center",
  },
  version: {
    fontSize: 12,
    color: "#8E8E93",
    textAlign: "center",
  },
});

export default MenuModal;