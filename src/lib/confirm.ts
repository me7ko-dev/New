import { Alert, Platform } from 'react-native';

export function confirm(text: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(text)) onYes();
    return;
  }
  Alert.alert(text, undefined, [
    { text: 'Отказ', style: 'cancel' },
    { text: 'Да', style: 'destructive', onPress: onYes },
  ]);
}
