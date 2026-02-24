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

const HomeIcon = ({ size = 20, color = "#6C7072" }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M0.878742 9.04763L8.46374 1.46163C9.4025 0.525615 10.6741 0 11.9997 0C13.3254 0 14.597 0.525615 15.5357 1.46163L23.1207 9.04763C23.4003 9.32541 23.622 9.65593 23.7729 10.02C23.9237 10.3841 24.0009 10.7745 23.9997 11.1686V20.9856C23.9997 21.7813 23.6837 22.5443 23.1211 23.1069C22.5585 23.6696 21.7954 23.9856 20.9997 23.9856H2.99974C2.20409 23.9856 1.44103 23.6696 0.878422 23.1069C0.315811 22.5443 -0.000259399 21.7813 -0.000259399 20.9856V11.1686C-0.00138092 10.7745 0.075737 10.3841 0.226625 10.02C0.377512 9.65593 0.599167 9.32541 0.878742 9.04763ZM8.99974 21.9856H14.9997V18.0516C14.9997 17.256 14.6837 16.4929 14.1211 15.9303C13.5585 15.3677 12.7954 15.0516 11.9997 15.0516C11.2041 15.0516 10.441 15.3677 9.87842 15.9303C9.31581 16.4929 8.99974 17.256 8.99974 18.0516V21.9856ZM1.99974 20.9856C1.99974 21.2508 2.1051 21.5052 2.29263 21.6927C2.48017 21.8803 2.73453 21.9856 2.99974 21.9856H6.99974V18.0516C6.99974 16.7255 7.52653 15.4538 8.46421 14.5161C9.40189 13.5784 10.6737 13.0516 11.9997 13.0516C13.3258 13.0516 14.5976 13.5784 15.5353 14.5161C16.473 15.4538 16.9997 16.7255 16.9997 18.0516V21.9856H20.9997C21.265 21.9856 21.5193 21.8803 21.7069 21.6927C21.8944 21.5052 21.9997 21.2508 21.9997 20.9856V11.1686C21.9988 10.9036 21.8936 10.6496 21.7067 10.4616L14.1217 2.87863C13.558 2.31756 12.7951 2.00257 11.9997 2.00257C11.2044 2.00257 10.4414 2.31756 9.87774 2.87863L2.29274 10.4646C2.10666 10.6519 2.00146 10.9046 1.99974 11.1686V20.9856Z"
        fill={color}
      />
    </Svg>
  );
};
const DocumentIcon = ({ width = 20, height = 20, color = "#6C7072" }) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 20 24" fill="none">
      <Path
        d="M5 14C5 14.2652 5.10536 14.5196 5.29289 14.7071C5.48043 14.8947 5.73478 15 6 15H14C14.2652 15 14.5196 14.8947 14.7071 14.7071C14.8946 14.5196 15 14.2652 15 14C15 13.7348 14.8946 13.4805 14.7071 13.2929C14.5196 13.1054 14.2652 13 14 13H6C5.73478 13 5.48043 13.1054 5.29289 13.2929C5.10536 13.4805 5 13.7348 5 14ZM9 17H14C14.2652 17 14.5196 17.1054 14.7071 17.2929C14.8946 17.4805 15 17.7348 15 18C15 18.2652 14.8946 18.5196 14.7071 18.7071C14.5196 18.8947 14.2652 19 14 19H9C8.73478 19 8.48043 18.8947 8.29289 18.7071C8.10536 18.5196 8 18.2652 8 18C8 17.7348 8.10536 17.4805 8.29289 17.2929C8.48043 17.1054 8.73478 17 9 17ZM0 10.485V19C0.00158691 20.3256 0.528881 21.5965 1.46622 22.5338C2.40356 23.4711 3.6744 23.9984 5 24H15C16.3256 23.9984 17.5964 23.4711 18.5338 22.5338C19.4711 21.5965 19.9984 20.3256 20 19V5.00002C19.9984 3.67443 19.4711 2.40358 18.5338 1.46624C17.5964 0.528905 16.3256 0.00161091 15 2.30487e-05H10.485C9.56538 -0.00234388 8.65442 0.177611 7.80478 0.529482C6.95514 0.881354 6.18367 1.39816 5.535 2.05002L2.051 5.53602C1.39876 6.18426 0.881636 6.95548 0.529573 7.805C0.177511 8.65451 -0.002491 9.56545 0 10.485ZM6.949 3.46402C7.26372 3.15918 7.61707 2.89695 8 2.68402V7.00002C8 7.26524 7.89464 7.51959 7.70711 7.70713C7.51957 7.89467 7.26522 8.00002 7 8.00002H2.684C2.89704 7.61721 3.15964 7.26417 3.465 6.95002L6.949 3.46402ZM2 10.485C2 10.32 2.032 10.162 2.047 10H7C7.79565 10 8.55871 9.68395 9.12132 9.12134C9.68393 8.55873 10 7.79567 10 7.00002V2.04702C10.162 2.03202 10.321 2.00002 10.485 2.00002H15C15.7956 2.00002 16.5587 2.31609 17.1213 2.8787C17.6839 3.44131 18 4.20437 18 5.00002V19C18 19.7957 17.6839 20.5587 17.1213 21.1213C16.5587 21.684 15.7956 22 15 22H5C4.20435 22 3.44129 21.684 2.87868 21.1213C2.31607 20.5587 2 19.7957 2 19V10.485Z"
        fill={color}
      />
    </Svg>
  );
};

const ChatIcon = ({ size = 20, color = "#75797B" }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M0 16.0001V21.0001C0 21.7958 0.316071 22.5588 0.878679 23.1215C1.44129 23.6841 2.20435 24.0001 3 24.0001H8C9.4029 23.9987 10.7808 23.6284 11.9953 22.9263C13.2099 22.2242 14.2185 21.2151 14.92 20.0001C14.1661 19.9947 13.4148 19.9116 12.678 19.7521C12.1168 20.4538 11.405 21.0202 10.5952 21.4093C9.78542 21.7984 8.89844 22.0004 8 22.0001H3C2.73478 22.0001 2.48043 21.8948 2.29289 21.7072C2.10536 21.5197 2 21.2654 2 21.0001V16.0001C2.00024 15.1014 2.20279 14.2142 2.59263 13.4044C2.98248 12.5946 3.54962 11.8829 4.252 11.3221C4.09116 10.5855 4.00671 9.83414 4 9.08013C2.78505 9.78159 1.77592 10.7902 1.07385 12.0048C0.371773 13.2194 0.00143814 14.5972 0 16.0001ZM6.023 9.65113C5.92948 8.36277 6.11438 7.06938 6.56516 5.85883C7.01593 4.64828 7.72201 3.54896 8.63542 2.63555C9.54882 1.72215 10.6482 1.01607 11.8587 0.56529C13.0692 0.114515 14.3626 -0.0703926 15.651 0.0231331C17.9341 0.283865 20.0431 1.37031 21.5808 3.07788C23.1186 4.78544 23.979 6.99631 24 9.29413V14.3341C24 16.8661 22.493 18.0001 21 18.0001H15.3C13.0012 17.9804 10.789 17.1205 9.08021 15.5827C7.37143 14.0448 6.28407 11.9352 6.023 9.65113ZM10.05 4.05113C9.34007 4.76264 8.79125 5.61833 8.44067 6.56032C8.0901 7.50231 7.94596 8.50861 8.018 9.51113C8.23144 11.2948 9.0895 12.939 10.4307 14.1341C11.7718 15.3292 13.5036 15.9929 15.3 16.0001H21C21.928 16.0001 22 14.7251 22 14.3341V9.29413C21.9917 7.49851 21.3274 5.76784 20.1321 4.42781C18.9368 3.08778 17.293 2.2308 15.51 2.01813C15.344 2.00613 15.178 2.00013 15.012 2.00013C14.0907 1.99927 13.1783 2.17997 12.3269 2.53189C11.4755 2.88381 10.7018 3.40006 10.05 4.05113Z"
        fill={color}
      />
    </Svg>
  );
};
const BellIcon = ({ width = 20, height = 20, color = "#6C7072" }) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 22 24" fill="none">
      <Path
        d="M0.1833 13.6597L2.0833 6.82374C2.64021 4.82107 3.85056 3.06202 5.52196 1.82621C7.19336 0.59039 9.22989 -0.0512763 11.3078 0.00320383C13.3858 0.0576839 15.3859 0.805184 16.9902 2.12689C18.5946 3.44859 19.7111 5.26864 20.1623 7.29774L21.6333 13.9127C21.7958 14.6437 21.792 15.4018 21.6223 16.1311C21.4526 16.8603 21.1212 17.5422 20.6527 18.1263C20.1842 18.7104 19.5905 19.1818 18.9154 19.5057C18.2403 19.8296 17.5011 19.9978 16.7523 19.9977H15.6383C15.4088 21.128 14.7956 22.1442 13.9026 22.8741C13.0095 23.604 11.8917 24.0028 10.7383 24.0028C9.58494 24.0028 8.46705 23.604 7.57404 22.8741C6.68103 22.1442 6.06781 21.128 5.8383 19.9977H5.0003C4.22949 19.9978 3.4691 19.8196 2.77854 19.4772C2.08798 19.1347 1.48595 18.6372 1.01948 18.0236C0.553005 17.41 0.234724 16.6968 0.0894966 15.9398C-0.0557308 15.1828 -0.0239677 14.4024 0.182301 13.6597H0.1833ZM10.7383 21.9977C11.3566 21.9952 11.9589 21.8017 12.463 21.4436C12.9671 21.0856 13.3482 20.5806 13.5543 19.9977H7.9223C8.12838 20.5806 8.50953 21.0856 9.0136 21.4436C9.51767 21.8017 10.12 21.9952 10.7383 21.9977ZM2.6123 16.8127C2.89095 17.1824 3.25198 17.482 3.66669 17.6877C4.08141 17.8934 4.53838 17.9996 5.0013 17.9977H16.7523C17.2015 17.9977 17.645 17.8967 18.05 17.7023C18.4549 17.5079 18.8111 17.2251 19.0921 16.8746C19.3732 16.5242 19.5719 16.1151 19.6737 15.6776C19.7755 15.2401 19.7778 14.7852 19.6803 14.3467L18.2103 7.73074C17.8559 6.13694 16.979 4.70734 15.7188 3.66919C14.4587 2.63103 12.8877 2.04391 11.2555 2.00115C9.62338 1.95839 8.02377 2.46245 6.71099 3.43321C5.39822 4.40396 4.44761 5.78568 4.0103 7.35874L2.1103 14.1947C1.98475 14.6401 1.96476 15.1086 2.0519 15.5631C2.13904 16.0175 2.33092 16.4454 2.6123 16.8127Z"
        fill={color}
      />
    </Svg>
  );
};
const BookmarkIcon = ({ width = 20, height = 20, color = "#6C7072" }) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 22 24" fill="none">
      <Path
        d="M2.86312 24C3.23306 23.999 3.59913 23.9247 3.94018 23.7813C4.28123 23.638 4.5905 23.4285 4.85012 23.165L11.0001 17.051L17.1501 23.169C17.5451 23.5697 18.0516 23.8422 18.6037 23.9508C19.1558 24.0594 19.7278 23.9992 20.2451 23.778C20.7676 23.5678 21.2146 23.205 21.5277 22.7369C21.8408 22.2688 22.0054 21.7171 22.0001 21.154V5C22.0001 3.67392 21.4733 2.40215 20.5357 1.46447C19.598 0.526784 18.3262 0 17.0001 0L5.00012 0C4.34351 0 3.69333 0.129329 3.0867 0.380602C2.48007 0.631876 1.92888 1.00017 1.46458 1.46447C1.00029 1.92876 0.631992 2.47996 0.38072 3.08658C0.129446 3.69321 0.000118256 4.34339 0.000118256 5V21.154C-0.00548363 21.7167 0.158583 22.268 0.470922 22.7361C0.783262 23.2041 1.22938 23.5672 1.75112 23.778C2.10331 23.9253 2.48137 24.0008 2.86312 24ZM17.0001 2C17.7958 2 18.5588 2.31607 19.1214 2.87868C19.6841 3.44129 20.0001 4.20435 20.0001 5V21.154C20.0005 21.3206 19.9515 21.4836 19.8592 21.6224C19.767 21.7612 19.6357 21.8695 19.4819 21.9337C19.3282 21.9979 19.1588 22.0151 18.9953 21.9831C18.8317 21.9512 18.6814 21.8714 18.5631 21.754L11.7001 14.933C11.5128 14.7468 11.2593 14.6422 10.9951 14.6422C10.7309 14.6422 10.4775 14.7468 10.2901 14.933L3.43512 21.752C3.31688 21.8694 3.16649 21.9492 3.00296 21.9811C2.83942 22.0131 2.67008 21.9959 2.51631 21.9317C2.36254 21.8675 2.23125 21.7592 2.13902 21.6204C2.04679 21.4816 1.99776 21.3186 1.99812 21.152V5C1.99812 4.20435 2.31419 3.44129 2.8768 2.87868C3.43941 2.31607 4.20247 2 4.99812 2H17.0001Z"
        fill={color}
      />
    </Svg>
  );
};

const LogoutIcon = ({ color = "#FF3B30" }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
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
      icon: (color: string) => <DocumentIcon color={color} />,
      label: "درباره برنامه",
      onPress: () => {
        handleClose();
        router.push("/about-us" as any);
      },
    },
    {
      icon: (color: string) => <ChatIcon color={color} />,
      label: "به روز رسانی برنامه",
      version: "نسخه 2.1.0",
      onPress: () => {
        handleClose();
      },
    },
    {
      icon: (color: string) => <BellIcon color={color} />,
      label: "همگام سازی",
      onPress: () => {
        handleClose();
      },
    },
    {
      icon: (color: string) => <BookmarkIcon color={color} />,
      label: "تغییر پین",
      onPress: () => {
        handleClose();
        router.push("/change-pin" as any);
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
          <View style={styles.headerContent}>
            <View style={styles.userIconContainer}>
              <UserIcon />
            </View>
            <View style={styles.userInfoSection}>
              <View style={styles.userTextContainer}>
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
            const iconColor = item.color || "#6C7072";
            return (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={item.onPress}
              >
                <View style={styles.menuItemLeft}>
                  <View style={styles.labelContainer}>
                    {item.version && (
                      <CustomText style={styles.versionText}>
                        {item.version}
                      </CustomText>
                    )}
                    <CustomText
                      style={[
                        styles.menuItemLabel,
                        item.color && { color: item.color },
                      ]}
                    >
                      {item.label}
                    </CustomText>
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
  },
  headerContent: {
    alignItems: "flex-end",
  },
  userInfoSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  userIconContainer: {
    marginLeft: 12,
    marginBottom: 10,
  },
  userTextContainer: {
    alignItems: "flex-end",
  },
  appName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1C1C1E",
    textAlign: "right",
    writingDirection: "rtl",
  },
  phoneNumber: {
    fontSize: 14,
    color: "#8E8E93",
    marginTop: 4,
    textAlign: "right",
    writingDirection: "ltr",
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
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 50,
    marginLeft: 12,
  },
  menuItemLabel: {
    fontSize: 16,
    color: "#1C1C1E",
    textAlign: "right",
    writingDirection: "rtl",
  },
  versionText: {
    fontSize: 12,
    color: "#8E8E93",
    textAlign: "right",
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
