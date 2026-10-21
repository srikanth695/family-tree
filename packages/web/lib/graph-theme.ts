export type GraphPalette = {
  edge: string
  edgeMuted: string
  highlight: string
  label: string
  labelBg: string
}

const LIGHT: GraphPalette = {
  edge: "#57534e",
  edgeMuted: "#a8a29e",
  highlight: "#0f766e",
  label: "#44403c",
  labelBg: "#fafaf9",
}

const DARK: GraphPalette = {
  edge: "#d6d3d1",
  edgeMuted: "#78716c",
  highlight: "#2dd4bf",
  label: "#e7e5e4",
  labelBg: "#292524",
}

export function graphPalette(theme: "light" | "dark"): GraphPalette {
  return theme === "dark" ? DARK : LIGHT
}
