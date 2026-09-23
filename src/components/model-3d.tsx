import { useMemo, useState } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Svg, { Line, Polygon } from "react-native-svg";

import { Button, Chip, Label, Row } from "@/components/ui";
import { useTheme } from "@/hooks/use-theme";
import type { CalcSettings, Element } from "@/lib/calc";
import { buildModel, project, type Layer } from "@/lib/model3d";

const SIZE = 600;

const POLY_STYLE: Record<
  Layer,
  { fill: string; opacity: number; stroke: string }
> = {
  concrete: { fill: "#9AA1AB", opacity: 0.55, stroke: "#6B7280" },
  formwork: { fill: "#C98B3C", opacity: 0.4, stroke: "#8A5A1F" },
  masonry: { fill: "#C8764A", opacity: 1, stroke: "#8E4B2A" },
  bars: { fill: "#A4502A", opacity: 1, stroke: "#6E3014" },
  stirrups: { fill: "#2B6CB0", opacity: 1, stroke: "#1E4E80" },
};

function shadeColor(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = 0.7 + 0.3 * k;
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `rgb(${r},${g},${b})`;
}

/**
 * 3D модел на елемента: върти се с пръст/мишка, етапите показват реда на изпълнение.
 * `stage` и `onStage` позволяват етапът да се управлява отвън (напр. от упътването).
 */
export function Model3D({
  element,
  settings,
  stage,
  onStage,
}: {
  element: Element;
  settings: CalcSettings;
  stage?: number;
  onStage?: (i: number) => void;
}) {
  const t = useTheme();
  const model = useMemo(
    () => buildModel(element, settings),
    [element, settings],
  );
  const [own, setOwn] = useState(model.stages.length - 1);
  const current = Math.min(stage ?? own, model.stages.length - 1);
  const setStage = onStage ?? setOwn;
  const [view, setView] = useState({ yaw: -0.6, pitch: 0.45 });
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(0);
  const clampPitch = (x: number) => Math.max(-0.2, Math.min(1.45, x));
  // Въртене с пръст/мишка: всяко преместване добавя към ъглите.
  const drag = Gesture.Pan()
    .runOnJS(true)
    .minDistance(2)
    .onChange((e) =>
      setView((v) => ({
        yaw: v.yaw + e.changeX * 0.012,
        pitch: clampPitch(v.pitch + e.changeY * 0.01),
      })),
    );

  const layers = model.stages[current].layers;
  const shapes = useMemo(
    () => project(model.prims, layers, view.yaw, view.pitch, SIZE),
    [model, layers, view],
  );

  const rotate = (dyaw: number, dpitch: number) =>
    setView((v) => ({
      yaw: v.yaw + dyaw,
      pitch: clampPitch(v.pitch + dpitch),
    }));

  return (
    <View style={{ gap: 8 }}>
      <Row>
        {model.stages.map((s, i) => (
          <Chip
            key={s.title}
            title={`${i + 1}. ${s.title}`}
            selected={i === current}
            onPress={() => setStage(i)}
          />
        ))}
      </Row>
      <GestureDetector gesture={drag}>
        <View
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          style={
            {
              width: "100%",
              maxWidth: 560,
              alignSelf: "center",
              aspectRatio: 1,
              borderRadius: 12,
              backgroundColor: t.backgroundElement,
              overflow: "hidden",
              cursor: "grab",
            } as object
          }
        >
          {width > 0 ? (
            <Svg width={width} height={width} viewBox={`0 0 ${SIZE} ${SIZE}`}>
              {shapes.map((s, i) => {
                if (s.t === "line") {
                  const color =
                    s.layer === "stirrups" ? t.sketchStirrup : t.sketchRebar;
                  return (
                    <Line
                      key={i}
                      x1={s.x1}
                      y1={s.y1}
                      x2={s.x2}
                      y2={s.y2}
                      stroke={color}
                      strokeWidth={s.w}
                      strokeLinecap="round"
                    />
                  );
                }
                const st = POLY_STYLE[s.layer];
                return (
                  <Polygon
                    key={i}
                    points={s.points}
                    fill={shadeColor(st.fill, s.shade)}
                    fillOpacity={st.opacity}
                    stroke={st.stroke}
                    strokeOpacity={0.6}
                    strokeWidth={1}
                  />
                );
              })}
            </Svg>
          ) : null}
        </View>
      </GestureDetector>
      <Row style={{ justifyContent: "center" }}>
        <Button title="⟲" onPress={() => rotate(-0.4, 0)} />
        <Button title="▲" onPress={() => rotate(0, 0.2)} />
        <Button title="▼" onPress={() => rotate(0, -0.2)} />
        <Button title="⟳" onPress={() => rotate(0.4, 0)} />
        <Button title="－" onPress={() => setZoom((z) => Math.max(0.6, z / 1.3))} />
        <Button title="＋" onPress={() => setZoom((z) => Math.min(4, z * 1.3))} />
      </Row>
      <Label style={{ textTransform: "none", textAlign: "center" }}>
        Въртете с пръст или мишка. Червено — пръти, синьо — бигли / втора мрежа,
        кафяво — кофраж, сиво — бетон.
      </Label>
      {model.partial ? (
        <Label style={{ textTransform: "none", textAlign: "center" }}>
          {model.partial}
        </Label>
      ) : null}
    </View>
  );
}
