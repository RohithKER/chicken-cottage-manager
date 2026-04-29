import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StoreProvider } from '../store/StoreContext';

export default function RootLayout() {
  return (
    <StoreProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </StoreProvider>
  );
}
