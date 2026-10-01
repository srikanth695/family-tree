import { describe, expect, it } from "vitest"
import { layoutFamilyTree, shortRelationshipLabel } from "./layout-family-tree"

describe("layoutFamilyTree", () => {
  it("places spouses side by side and children below", () => {
    const positions = layoutFamilyTree(
      [
        { id: "f", gender: "male", first_name: "Adam", birth_date: "1970-01-01" },
        { id: "m", gender: "female", first_name: "Eve", birth_date: "1972-01-01" },
        { id: "c", gender: "male", first_name: "Cain", birth_date: "1995-01-01" },
      ],
      [
        { id: "s", person_a_id: "f", person_b_id: "m", type: "spouse" },
        { id: "r1", person_a_id: "f", person_b_id: "c", type: "father-child" },
        { id: "r2", person_a_id: "m", person_b_id: "c", type: "mother-child" },
      ],
    )

    expect(positions.f.y).toBe(positions.m.y)
    expect(positions.f.x).toBeLessThan(positions.m.x)
    expect(Math.abs(positions.f.x - positions.m.x)).toBeGreaterThan(100)
    expect(positions.c.y).toBeGreaterThan(positions.f.y)
  })

  it("orders siblings by birth date left to right", () => {
    const positions = layoutFamilyTree(
      [
        { id: "f", gender: "male", first_name: "Dad", birth_date: "1970-01-01" },
        { id: "m", gender: "female", first_name: "Mom", birth_date: "1972-01-01" },
        { id: "older", gender: "male", first_name: "Older", birth_date: "1990-01-01" },
        { id: "younger", gender: "female", first_name: "Younger", birth_date: "1995-01-01" },
      ],
      [
        { id: "s", person_a_id: "f", person_b_id: "m", type: "spouse" },
        { id: "r1", person_a_id: "f", person_b_id: "younger", type: "father-child" },
        { id: "r2", person_a_id: "m", person_b_id: "younger", type: "mother-child" },
        { id: "r3", person_a_id: "f", person_b_id: "older", type: "father-child" },
        { id: "r4", person_a_id: "m", person_b_id: "older", type: "mother-child" },
      ],
    )

    expect(positions.older.x).toBeLessThan(positions.younger.x)
    expect(positions.older.y).toBe(positions.younger.y)
  })

  it("orders siblings by numeric birth date across epoch and digit-length boundaries", () => {
    const positions = layoutFamilyTree(
      [
        { id: "f", gender: "male", first_name: "Dad", birth_date: "1930-01-01" },
        { id: "m", gender: "female", first_name: "Mom", birth_date: "1932-01-01" },
        { id: "sixties", gender: "male", first_name: "Sixties", birth_date: "1960-06-01" },
        { id: "laterSixties", gender: "female", first_name: "Later", birth_date: "1965-06-01" },
        { id: "nineties", gender: "male", first_name: "Nineties", birth_date: "1999-06-01" },
        { id: "twoThousands", gender: "female", first_name: "Twothousands", birth_date: "2002-06-01" },
      ],
      [
        { id: "s", person_a_id: "f", person_b_id: "m", type: "spouse" },
        { id: "r1", person_a_id: "f", person_b_id: "sixties", type: "father-child" },
        { id: "r2", person_a_id: "m", person_b_id: "sixties", type: "mother-child" },
        { id: "r3", person_a_id: "f", person_b_id: "laterSixties", type: "father-child" },
        { id: "r4", person_a_id: "m", person_b_id: "laterSixties", type: "mother-child" },
        { id: "r5", person_a_id: "f", person_b_id: "nineties", type: "father-child" },
        { id: "r6", person_a_id: "m", person_b_id: "nineties", type: "mother-child" },
        { id: "r7", person_a_id: "f", person_b_id: "twoThousands", type: "father-child" },
        { id: "r8", person_a_id: "m", person_b_id: "twoThousands", type: "mother-child" },
      ],
    )

    expect(positions.sixties.x).toBeLessThan(positions.laterSixties.x)
    expect(positions.laterSixties.x).toBeLessThan(positions.nineties.x)
    expect(positions.nineties.x).toBeLessThan(positions.twoThousands.x)
  })

  it("labels relationships briefly", () => {
    expect(shortRelationshipLabel("father-child")).toBe("Father")
    expect(shortRelationshipLabel("mother-child")).toBe("Mother")
    expect(shortRelationshipLabel("spouse")).toBe("Husband / Wife")
  })
})
