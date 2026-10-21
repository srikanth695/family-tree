import { describe, expect, it } from "vitest"
import { describeRelationship } from "./relationship-finder"

const p = (id: string, gender: "male" | "female") => ({ id, first_name: id, last_name: "", gender })
const people = [
  p("gf", "male"), p("dad", "male"), p("uncle", "male"), p("mum", "female"), p("me", "male"),
  p("sis", "female"), p("cuz", "female"), p("kid", "male"), p("wife", "female"), p("cuzkid", "male"),
]
const parent = (a: string, b: string) => ({ person_a_id: a, person_b_id: b, type: "parent-child" as const })
const rels = [
  parent("gf", "dad"), parent("gf", "uncle"), parent("dad", "me"), parent("mum", "me"),
  parent("dad", "sis"), parent("mum", "sis"), parent("uncle", "cuz"), parent("me", "kid"),
  parent("cuz", "cuzkid"),
  { person_a_id: "me", person_b_id: "wife", type: "spouse" as const },
]
const say = (a: string, b: string) => describeRelationship(people, rels, a, b)?.sentence

describe("describeRelationship", () => {
  it("names direct kin", () => {
    expect(say("me", "dad")).toBe("dad is me's father.")
    expect(say("me", "sis")).toBe("sis is me's sister.")
    expect(say("me", "gf")).toBe("gf is me's grandfather.")
    expect(say("gf", "kid")).toBe("kid is gf's great-grandson.")
  })
  it("names uncles, cousins and removals", () => {
    expect(say("me", "uncle")).toBe("uncle is me's uncle.")
    expect(say("uncle", "me")).toBe("me is uncle's nephew.")
    expect(say("me", "cuz")).toBe("cuz is me's cousin.")
    expect(say("kid", "cuz")).toBe("cuz is kid's cousin once removed.")
    expect(say("kid", "cuzkid")).toBe("cuzkid is kid's second cousin.")
  })
  it("handles marriage", () => {
    expect(say("me", "wife")).toBe("wife is me's wife.")
    expect(say("wife", "dad")).toBe("dad is wife's father-in-law.")
    expect(say("sis", "wife")).toBe("wife is sis's sister-in-law.")
  })
  it("returns null when unconnected", () => {
    expect(describeRelationship([...people, p("x", "male")], rels, "me", "x")).toBeNull()
  })
})
