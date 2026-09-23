import { Chip, Row } from '@/components/ui';
import { STATUS_ORDER, type Element, type ElementStatus } from '@/lib/calc';
import { MASONRY_STATUS, STATUS_LABEL } from '@/lib/labels';

export function statusesFor(e: Element): ElementStatus[] {
  return e.type === 'masonry' ? MASONRY_STATUS : STATUS_ORDER;
}

export function nextStatus(e: Element): ElementStatus {
  const list = statusesFor(e);
  const i = list.indexOf(e.status);
  return list[Math.min(list.length - 1, i + 1)];
}

/** Етапи на изпълнение — натиска се етапът, до който е стигната работата. */
export function StatusStepper({
  element,
  onChange,
}: {
  element: Element;
  onChange?: (s: ElementStatus) => void;
}) {
  const list = statusesFor(element);
  const cur = list.indexOf(element.status);
  return (
    <Row>
      {list.map((s, i) => (
        <Chip
          key={s}
          title={`${i <= cur ? '✔ ' : ''}${STATUS_LABEL[s].title}`}
          color={STATUS_LABEL[s].color}
          selected={i <= cur}
          onPress={onChange ? () => onChange(s) : undefined}
        />
      ))}
    </Row>
  );
}
