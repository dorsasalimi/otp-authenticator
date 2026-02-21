import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="ScannerScreen" 
        options={{ 
          headerShown: true,
          headerTitle: "اسکن QR",
          headerTitleAlign: "center",
          headerStyle: {
            backgroundColor: "#75C3D7",
          },
          headerTintColor: "#fff",
          headerBackVisible: true,
          headerBackTitle: "بازگشت",
        }}
      />
    </Stack>
  );
}