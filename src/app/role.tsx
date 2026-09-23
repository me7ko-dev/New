import { router } from 'expo-router';

import { BigButton, Screen, Title } from '@/components/ui';
import { ROLE_LABEL } from '@/lib/labels';
import { useStore } from '@/lib/store';
import type { Role } from '@/lib/types';

export default function RoleScreen() {
  const { setRole, role } = useStore();
  return (
    <Screen title="Кой сте?">
      <Title sub="Всеки вижда само това, което му трябва.">Изберете роля</Title>
      {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
        <BigButton
          key={r}
          kind={r === role ? 'primary' : 'default'}
          icon={ROLE_LABEL[r].icon}
          title={ROLE_LABEL[r].title}
          hint={ROLE_LABEL[r].hint}
          onPress={() => {
            setRole(r);
            router.back();
          }}
        />
      ))}
    </Screen>
  );
}
