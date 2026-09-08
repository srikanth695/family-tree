import { describe, expect, it } from "vitest"
import { layoutFamilyTree, shortRelationshipLabel } from "./layout-family-tree"

describe("layoutFamilyTree", () => {
  it("places spouses side by side and children below", () => {
    const positions = layoutFamilyTree(
      [
        { id: "f", gender: "male" },
        { id: "m", gender: "female" },
        { id: "c", gender: "male" },
      ],
      [
        { id: "s", person_a_id: "f", person_b_id: "m", type: "spouse" },
        { id: "r1", person_a_id: "f", person_b_id: "c", type: "father-child" },
        { id: "r2", person_a_id: "m", person_b_id: "c", type: "mother-child" },
      ],
    )

    expect(positions.f.y).toBe(positions.m.y)
    expect(Math.abs(positions.f.x - positions.m.x)).toBeGreaterThan(100)
    expect(positions.c.y).toBeGreaterThan(positions.f.y)
  })

  it("labels relationships briefly", () => {
    expect(shortRelationshipLabel("father-child")).toBe("Father")
    expect(shortRelationshipLabel("mother-child")).toBe("Mother")
    expect(shortRelationshipLabel("spouse")).toBe("Husband / Wife")
  })
})
