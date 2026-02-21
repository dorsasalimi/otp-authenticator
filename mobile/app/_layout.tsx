import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";
import * as SecureStore from 'expo-secure-store';
import { useColorScheme } from "@/components/useColorScheme";

export {
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const segments = useSegments();
  const router = useRouter();
  const [loaded, error] = useFonts({
    YekanBakh: require("../assets/fonts/YekanBakh-Regular.ttf"),
    ...FontAwesome.font,
  });
  useEffect(() => {
    const checkLogin = async () => {
      const userPhone = await SecureStore.getItemAsync("user_phone");
      const inAuthGroup = segments[0] === "login";

      if (!userPhone && !inAuthGroup) {
        router.replace("/login");
      } else if (userPhone && inAuthGroup) {
        router.replace("/(tabs)");
      }
    };
    checkLogin();
  }, [segments]);
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>
    </ThemeProvider>
  );
}
