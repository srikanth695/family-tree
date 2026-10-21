import { describe, expect, it } from "vitest"
import { ageRangeLabel, lifespanLabel, familyStandings, inLawIds, personInitials } from "./person-display"

describe("lifespanLabel", () => {
  it("shows birth year only for living people", () => {
    expect(lifespanLabel({ birth_date: "1990-06-15T00:00:00.000Z", is_living: true })).toBe("b. 1990")
  })

  it("shows a range when a death date exists", () => {
    expect(
      lifespanLabel({ birth_date: "1945-01-01T00:00:00.000Z", death_date: "2010-12-31T00:00:00.000Z", is_living: false }),
    ).toBe("1945 – 2010")
  })

  it("uses UTC so year-boundary dates do not shift", () => {
    expect(lifespanLabel({ birth_date: "2000-01-01T00:00:00.000Z" })).toBe("b. 2000")
  })

  it("marks the unknown end for deceased people without a death date", () => {
    expect(lifespanLabel({ birth_date: "1930-03-01T00:00:00.000Z", is_living: false })).toBe("1930 – ?")
    expect(lifespanLabel({ is_living: false })).toBe("Deceased")
  })

  it("is empty when nothing is known", () => {
    expect(lifespanLabel({})).toBe("")
    expect(lifespanLabel({ birth_date: "not a date" })).toBe("")
  })
})

describe("personInitials", () => {
  it("uses first and last initials", () => {
    expect(personInitials({ first_name: "asha", last_name: "rao" })).toBe("AR")
  })

  it("falls back gracefully", () => {
    expect(personInitials({ first_name: "Asha" })).toBe("A")
    expect(personInitials({})).toBe("?")
  })
})

describe("ageRangeLabel", () => {
  const now = new Date("2026-10-21T00:00:00.000Z")
  it("buckets living people by decade", () => {
    expect(ageRangeLabel({ birth_date: "1990-06-15T00:00:00.000Z" }, now)).toBe("30–39")
    expect(ageRangeLabel({ birth_date: "2024-01-01T00:00:00.000Z" }, now)).toBe("0–9")
  })
  it("uses age at death and handles unknowns", () => {
    expect(ageRangeLabel({ birth_date: "1900-01-01T00:00:00.000Z", death_date: "1975-01-01T00:00:00.000Z" }, now)).toBe("70–79")
    expect(ageRangeLabel({}, now)).toBe("")
  })
})

describe("familyStandings", () => {
  const people = [
    { id: "veeranna", gender: "male", last_name: "Balla" },
    { id: "anantha", gender: "female", last_name: "Balla", maiden_name: "Muthyala" },
    { id: "son", gender: "male", last_name: "Balla" },
    { id: "bride", gender: "female", last_name: "Balla", maiden_name: "Example" },
    { id: "noname", gender: "female", last_name: "Rao" },
    { id: "ghar", gender: "male", last_name: "Rao" },
    { id: "daughter", gender: "female", last_name: "Balla", maiden_name: "Balla" },
  ]
  const spouse = (a: string, b: string) => ({ person_a_id: a, person_b_id: b, type: "spouse" })
  const rels = [spouse("veeranna", "anantha"), spouse("son", "bride"), spouse("son", "noname"), spouse("daughter", "ghar")]

  it("treats the wife of a family man as married in, not the husband", () => {
    const standings = familyStandings(people, rels, "Balla")
    expect(standings.get("anantha")).toBe("married-in")
    expect(standings.get("bride")).toBe("married-in")
    expect(standings.get("noname")).toBe("married-in")
    expect(standings.has("veeranna")).toBe(false)
    expect(standings.has("son")).toBe(false)
  })

  it("marks daughters who married out, but not their husbands", () => {
    const standings = familyStandings(people, rels, "Muthyala")
    expect(standings.get("anantha")).toBe("married-out")
    expect(standings.has("veeranna")).toBe(false)
  })

  it("does nothing without a family name", () => {
    expect(familyStandings(people, rels, "").size).toBe(0)
  })
})

describe("inLawIds", () => {
  const rels = [
    { person_a_id: "hdad", person_b_id: "husband", type: "father-child" },
    { person_a_id: "hmum", person_b_id: "husband", type: "mother-child" },
    { person_a_id: "wdad", person_b_id: "wife", type: "father-child" },
    { person_a_id: "husband", person_b_id: "wife", type: "spouse" },
  ]
  it("returns the spouse's parents for each partner", () => {
    expect([...inLawIds("wife", rels)].sort()).toEqual(["hdad", "hmum"])
    expect([...inLawIds("husband", rels)]).toEqual(["wdad"])
  })
  it("is empty for the parents themselves and for no selection", () => {
    expect(inLawIds("hdad", rels).size).toBe(0)
    expect(inLawIds(null, rels).size).toBe(0)
  })
})
