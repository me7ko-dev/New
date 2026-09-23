import { Text, View } from 'react-native';

import { Body, Button } from '@/components/ui';
import { openExternally } from '@/lib/files';

/** На телефона PDF се отваря в системния преглед — той поддържа всички страници и увеличение. */
export function PdfView({ uri }: { uri: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
      <Text style={{ fontSize: 72 }}>📄</Text>
      <Body style={{ textAlign: 'center' }}>PDF чертеж</Body>
      <Button kind="primary" title="Отвори PDF" onPress={() => openExternally(uri)} />
    </View>
  );
}
