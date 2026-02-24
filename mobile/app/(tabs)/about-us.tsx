import React from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Linking,
  Image,
  I18nManager,
} from "react-native";
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import CustomText from "@/components/CustomText";

interface FeatureItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

interface TeamMemberProps {
  name: string;
  role: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const AboutUs = () => {
  const router = useRouter();
  const appVersion = "1.0.0"; 

  const openLink = (url: string) => {
    Linking.openURL(url).catch(err => 
      console.error("خطا در باز کردن لینک:", err)
    );
  };

  const FeatureItem: React.FC<FeatureItemProps> = ({ icon, title, description }) => (
    <View style={styles.featureItem}>
      <View style={styles.featureIconContainer}>
        <Ionicons name={icon} size={24} color="#4A80F0" />
      </View>
      <View style={styles.featureTextContainer}>
        <CustomText style={styles.featureTitle}>{title}</CustomText>
        <CustomText style={styles.featureDescription}>{description}</CustomText>
      </View>
    </View>
  );

  const TeamMember: React.FC<TeamMemberProps> = ({ name, role, icon }) => (
    <View style={styles.teamMember}>
      <View style={styles.teamMemberAvatar}>
        <Ionicons name={icon} size={30} color="#4A80F0" />
      </View>
      <View>
        <CustomText style={styles.teamMemberName}>{name}</CustomText>
        <CustomText style={styles.teamMemberRole}>{role}</CustomText>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoContainer}>
          <Image 
            source={require('@/assets/images/aboutus-header.png')} 
            style={styles.logoImage}
            resizeMode="contain"
          />
          <CustomText style={styles.appName}>احراز هویت</CustomText>
          <CustomText style={styles.version}>نسخه {appVersion}</CustomText>
        </View>

        <View style={styles.section}>
          <CustomText style={styles.sectionTitle}>داستان ما</CustomText>
          <CustomText style={styles.description}>
            ما با یک ماموریت ساده شروع کردیم: قابل دسترس کردن امنیت آنلاین برای همه 
            و بدون دردسر. در دنیای دیجیتال امروز، محافظت از حساب‌های کاربری شما نباید پیچیده باشد.
          </CustomText>
          <CustomText style={styles.description}>
            برنامه احراز هویت ما یک راه‌حل امن و آسان برای احراز هویت دو مرحله‌ای فراهم می‌کند 
            و به شما کمک می‌کند بدون پیچیدگی، از زندگی دیجیتال خود محافظت کنید.
          </CustomText>
        </View>

        <View style={styles.section}>
          <CustomText style={styles.sectionTitle}>چرا ما را انتخاب کنید</CustomText>
          
          <FeatureItem 
            icon="lock-closed"
            title="امنیت در سطح بانکی"
            description="اطلاعات شما به صورت رمزنگاری شده روی دستگاه ذخیره می‌شود و هرگز با کسی به اشتراک گذاشته نمی‌شود"
          />
          
          <FeatureItem 
            icon="refresh"
            title="همگام‌سازی خودکار"
            description="کدهای خود را به طور یکپارچه بین همه دستگاه‌های خود همگام‌سازی کنید"
          />
          
          <FeatureItem 
            icon="cloud-offline"
            title="کارکرد آفلاین"
            description="حتی بدون اتصال به اینترنت به کدهای احراز هویت خود دسترسی داشته باشید"
          />
          
          <FeatureItem 
            icon="apps"
            title="پشتیبانی از انواع حساب‌ها"
            description="پشتیبانی از TOTP، HOTP، استیم و موارد دیگر"
          />
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <CustomText style={styles.statNumber}>+۵۰,۰۰۰</CustomText>
            <CustomText style={styles.statLabel}>کاربران فعال</CustomText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <CustomText style={styles.statNumber}>۴.۸</CustomText>
            <CustomText style={styles.statLabel}>امتیاز اپ استور</CustomText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <CustomText style={styles.statNumber}>+۱۰۰ میلیون</CustomText>
            <CustomText style={styles.statLabel}>کد تولید شده</CustomText>
          </View>
        </View>

        <View style={styles.section}>
          <CustomText style={styles.sectionTitle}>با ما در ارتباط باشید</CustomText>
          
          <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => openLink('mailto:support@authenticatorapp.com')}
          >
            <CustomText style={styles.contactText}>support@authenticatorapp.com</CustomText>
            <Ionicons name="mail" size={22} color="#4A80F0" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => openLink('https://twitter.com/authenticatorapp')}
          >
            <CustomText style={styles.contactText}>@authenticatorapp</CustomText>
            <Ionicons name="logo-twitter" size={22} color="#4A80F0" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => openLink('https://github.com/authenticatorapp')}
          >
            <CustomText style={styles.contactText}>گیت‌هاب</CustomText>
            <Ionicons name="logo-github" size={22} color="#4A80F0" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => openLink('https://authenticatorapp.com')}
          >
            <CustomText style={styles.contactText}>www.authenticatorapp.com</CustomText>
            <Ionicons name="globe" size={22} color="#4A80F0" />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  logoImage: {
    width: 200,
    height: 120,
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 4,
    textAlign: 'center',
  },
  version: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
    textAlign: 'right',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#495057',
    marginBottom: 12,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F4F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 14,
    marginRight: 0,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
    textAlign: 'right',
  },
  featureDescription: {
    fontSize: 14,
    color: '#6C757D',
    lineHeight: 20,
    textAlign: 'right',
  },
  teamMember: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  teamMemberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F1F4F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 14,
    marginRight: 0,
  },
  teamMemberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 2,
    textAlign: 'right',
  },
  teamMemberRole: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'right',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    marginBottom: 12,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#4A80F0',
    marginBottom: 4,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 13,
    color: '#6C757D',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E9ECEF',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F4F9',
    justifyContent: 'flex-end',
  },
  contactText: {
    fontSize: 15,
    color: '#495057',
    marginRight: 14,
    marginLeft: 0,
    textAlign: 'right',
  },
  bottomPadding: {
    height: 20,
  },
});

export default AboutUs;