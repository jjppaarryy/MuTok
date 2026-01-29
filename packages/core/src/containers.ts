export type ContainerType = "static_daw" | "montage";

export type MontageSettings = {
  clipCount: number;
  clipDurationRange: [number, number];
};

export const defaultMontageSettings: MontageSettings = {
  clipCount: 4,
  clipDurationRange: [0.4, 0.9]
};

export function getContainerClipCount(container: ContainerType, settings: MontageSettings) {
  return container === "montage" ? settings.clipCount : 1;
}

export function isContainerAllowed(
  container: ContainerType,
  allowed: ContainerType[]
) {
  return allowed.includes(container);
}
