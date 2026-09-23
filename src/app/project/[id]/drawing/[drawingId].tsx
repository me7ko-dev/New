import { router, Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { PdfView } from '@/components/pdf-view';
import { Chip, ConfirmButton, Empty, Label, Row, Screen } from '@/components/ui';
import { ZoomableImage } from '@/components/zoomable-image';
import { useTheme } from '@/hooks/use-theme';
import { deleteDrawingFile } from '@/lib/files';
import { DISCIPLINE_LABEL } from '@/lib/labels';
import { can, useProject } from '@/lib/store';

export default function DrawingViewer() {
  const { id, drawingId } = useLocalSearchParams<{ id: string; drawingId: string }>();
  const { project: p, update, role } = useProject(id);
  const t = useTheme();
  const d = p?.drawings.find((x) => x.id === drawingId);
  if (!p || !d) return <Screen title="Чертеж"><Empty icon="🤷" text="Чертежът не е намерен." /></Screen>;

  const level = p.levels.find((l) => l.id === d.levelId);
  const others = p.drawings.filter((x) => x.levelId === d.levelId && x.id !== d.id);

  return (
    <View style={{ flex: 1, backgroundColor: t.screen }}>
      <Stack.Screen options={{ title: d.name }} />
      <View style={{ padding: 12, gap: 8 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Label style={{ textTransform: 'none' }}>
            {DISCIPLINE_LABEL[d.discipline].icon} {DISCIPLINE_LABEL[d.discipline].title} · {level ? level.name : 'Целия обект'}
            {d.kind === 'image' ? ' · два пръста = увеличение, двойно докосване = нулиране' : ''}
          </Label>
          {can(role, 'edit') ? (
            <ConfirmButton
              title="Изтрий"
              confirmTitle="Изтрий чертежа?"
              onConfirm={() => {
                deleteDrawingFile(d.uri);
                update((pr) => ({ ...pr, drawings: pr.drawings.filter((x) => x.id !== d.id) }));
                router.back();
              }}
            />
          ) : null}
        </Row>
        {others.length > 0 ? (
          <Row>
            {others.map((o) => (
              <Chip
                key={o.id}
                title={`${DISCIPLINE_LABEL[o.discipline].icon} ${o.name}`}
                onPress={() => router.replace({ pathname: '/project/[id]/drawing/[drawingId]', params: { id: p.id, drawingId: o.id } })}
              />
            ))}
          </Row>
        ) : null}
      </View>
      <View style={{ flex: 1, backgroundColor: t.card }}>
        {d.kind === 'image' ? <ZoomableImage uri={d.uri} /> : <PdfView uri={d.uri} />}
      </View>
    </View>
  );
}
