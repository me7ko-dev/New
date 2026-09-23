import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import { Platform, Pressable, Text, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Colors } from '@/constants/theme';
import { StoreProvider } from '@/lib/store';

export default function RootLayout() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const c = Colors[dark ? 'dark' : 'light'];
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StoreProvider>
        <ThemeProvider value={dark ? DarkTheme : DefaultTheme}>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: c.card },
              headerTintColor: c.text,
              headerTitleStyle: { fontWeight: '700' },
              headerBackButtonDisplayMode: 'minimal',
              // В браузъра стрелката е текст, за да не зависи от картинки, заредени от сървъра.
              headerLeft:
                Platform.OS === 'web'
                  ? ({ canGoBack }) =>
                      canGoBack ? (
                        <Pressable accessibilityRole="button" accessibilityLabel="Назад" onPress={() => router.back()} hitSlop={10} style={{ paddingHorizontal: 12 }}>
                          <Text style={{ color: c.text, fontSize: 24, fontWeight: '700' }}>←</Text>
                        </Pressable>
                      ) : null
                  : undefined,
            }}
          />
        </ThemeProvider>
      </StoreProvider>
    </GestureHandlerRootView>
  );
}
