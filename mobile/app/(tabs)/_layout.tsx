import { Stack } from 'expo-router';
import CustomText from '@/components/CustomText';
import { View, StyleSheet } from 'react-native';

function CustomHeaderTitle({ children }: { children: string }) {
  return (
    <CustomText style={styles.headerTitle}>
      {children}
    </CustomText>
  );
}

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ headerShown: false }} 
      />

      <Stack.Screen 
        name="ScannerScreen" 
        options={{ 
          headerShown: true,
          headerTitle: () => <CustomHeaderTitle>اسکن QR</CustomHeaderTitle>,
          headerTitleAlign: "center",
          headerTintColor: "#000",
          headerBackVisible: true,
          headerBackTitle: "بازگشت",
          headerBackTitleStyle: {
            fontFamily: 'YekanBakh',
          },
        }}
      />

      <Stack.Screen 
        name="about-us" 
        options={{ 
          headerShown: true,
          headerTitle: () => <CustomHeaderTitle>درباره ما</CustomHeaderTitle>,
          headerTitleAlign: "center",
          
          headerTintColor: "#000",
          headerBackVisible: true,
          headerBackTitle: "بازگشت",
          headerBackTitleStyle: {
            fontFamily: 'YekanBakh',
          },
        }}
      />

    </Stack>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    color: '#000',
    fontSize: 20,
    fontWeight: '600',
  },
});