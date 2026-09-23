import { Stack } from 'expo-router';
import { createContext, useContext, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Screen({
  title,
  children,
  scroll = true,
  right,
}: {
  title: string;
  children: ReactNode;
  scroll?: boolean;
  right?: ReactNode;
}) {
  const t = useTheme();
  const inner = <View style={styles.inner}>{children}</View>;
  return (
    <View style={[styles.screen, { backgroundColor: t.screen }]}>
      <Stack.Screen options={{ title, headerRight: right ? () => right : undefined }} />
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </View>
  );
}

export function Title({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ gap: 2 }}>
      <Text style={[styles.title, { color: t.text }]}>{children}</Text>
      {sub ? <Text style={[styles.sub, { color: t.textSecondary }]}>{sub}</Text> : null}
    </View>
  );
}

export function Label({ children, style }: { children: ReactNode; style?: object }) {
  const t = useTheme();
  return <Text style={[styles.label, { color: t.textSecondary }, style]}>{children}</Text>;
}

export function Body({ children, bold, style }: { children: ReactNode; bold?: boolean; style?: object }) {
  const t = useTheme();
  return <Text style={[styles.body, { color: t.text }, bold && { fontWeight: '700' }, style]}>{children}</Text>;
}

export function Card({
  children,
  onPress,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const s = [styles.card, { backgroundColor: t.card, borderColor: t.border }, style];
  if (!onPress) return <View style={s}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s, pressed && { opacity: 0.75 }]}>
      {children}
    </Pressable>
  );
}

export function BigButton({
  icon,
  title,
  hint,
  onPress,
  kind = 'default',
}: {
  icon?: string;
  title: string;
  hint?: string;
  onPress: () => void;
  kind?: 'default' | 'primary';
}) {
  const t = useTheme();
  const primary = kind === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.bigButton,
        { backgroundColor: primary ? t.accent : t.card, borderColor: primary ? t.accent : t.border },
        pressed && { opacity: 0.75 },
      ]}>
      {icon ? <Text style={styles.bigIcon}>{icon}</Text> : null}
      <View style={{ flex: 1 }}>
        <Text style={[styles.bigTitle, { color: primary ? t.accentText : t.text }]}>{title}</Text>
        {hint ? <Text style={[styles.sub, { color: primary ? t.accentText : t.textSecondary }]}>{hint}</Text> : null}
      </View>
      <Text style={[styles.bigTitle, { color: primary ? t.accentText : t.textSecondary }]}>›</Text>
    </Pressable>
  );
}

export function Button({
  title,
  onPress,
  kind = 'default',
  disabled,
}: {
  title: string;
  onPress: () => void;
  kind?: 'default' | 'primary' | 'danger';
  disabled?: boolean;
}) {
  const t = useTheme();
  const bg = kind === 'primary' ? t.accent : kind === 'danger' ? '#C53030' : t.backgroundElement;
  const fg = kind === 'primary' ? t.accentText : kind === 'danger' ? '#fff' : t.text;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor: bg }, (pressed || disabled) && { opacity: 0.6 }]}>
      <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Chip({
  title,
  color,
  selected,
  onPress,
}: {
  title: string;
  color?: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  const t = useTheme();
  const c = color ?? t.accent;
  const content = (
    <View
      style={[
        styles.chip,
        { borderColor: selected || !onPress ? c : t.border, backgroundColor: selected ? c : 'transparent' },
      ]}>
      <Text style={[styles.chipText, { color: selected ? '#fff' : onPress ? t.text : c }]}>{title}</Text>
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={4}>
      {content}
    </Pressable>
  );
}

/** Полетата в ред делят ширината; извън ред заемат цялата. */
const InRow = createContext(false);

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <InRow.Provider value={true}>
      <View style={[styles.row, style]}>{children}</View>
    </InRow.Provider>
  );
}

export function Progress({ value, color }: { value: number; color?: string }) {
  const t = useTheme();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={[styles.progress, { backgroundColor: t.backgroundSelected }]}>
      <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: color ?? '#2F855A' }]} />
    </View>
  );
}

export function Stat({ icon, value, label }: { icon: string; value: string; label: string }) {
  const t = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: t.card, borderColor: t.border }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color: t.text }]}>{value}</Text>
      <Text style={[styles.sub, { color: t.textSecondary }]}>{label}</Text>
    </View>
  );
}

export function Field({
  label,
  value,
  onChange,
  numeric,
  unit,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  numeric?: boolean;
  unit?: string;
  placeholder?: string;
}) {
  const t = useTheme();
  const inRow = useContext(InRow);
  return (
    <View style={[{ gap: 4 }, inRow && { flexGrow: 1, flexBasis: numeric ? 120 : 220 }]}>
      <Label>{label}</Label>
      <View style={[styles.inputWrap, { borderColor: t.border, backgroundColor: t.card }]}>
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType={numeric ? 'decimal-pad' : 'default'}
          placeholder={placeholder}
          placeholderTextColor={t.textSecondary}
          style={[styles.input, { color: t.text }]}
        />
        {unit ? <Text style={[styles.unit, { color: t.textSecondary }]}>{unit}</Text> : null}
      </View>
    </View>
  );
}

export function Empty({ icon, text }: { icon: string; text: string }) {
  const t = useTheme();
  return (
    <View style={styles.empty}>
      <Text style={{ fontSize: 40 }}>{icon}</Text>
      <Text style={[styles.body, { color: t.textSecondary, textAlign: 'center' }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center' },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
    flexGrow: 1,
  },
  title: { fontSize: 26, fontWeight: '700' },
  sub: { fontSize: 14, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  body: { fontSize: 17, lineHeight: 24 },
  card: { borderWidth: 1, borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  bigButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 72,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  bigIcon: { fontSize: 30 },
  bigTitle: { fontSize: 19, fontWeight: '700' },
  button: {
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
  chip: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 14, fontWeight: '600' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, alignItems: 'center' },
  progress: { height: 10, borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 5 },
  stat: {
    flexGrow: 1,
    flexBasis: 140,
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.three,
    gap: 2,
  },
  statIcon: { fontSize: 22 },
  statValue: { fontSize: 22, fontWeight: '700' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12 },
  input: { flex: 1, fontSize: 17, minHeight: 48 },
  unit: { fontSize: 15, marginLeft: 6 },
  empty: { alignItems: 'center', gap: Spacing.two, padding: Spacing.five },
});
