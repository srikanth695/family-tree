"use client"

import React from "react"
import Link from "next/link"
import { useLifeEvents } from "@/hooks/use-life-events"
import { useMedia } from "@/hooks/use-media"
import { usePeople } from "@/hooks/use-people"
import { useRelationships } from "@/hooks/use-relationships"
import { useTrees } from "@/hooks/use-trees"
import { useSession } from "next-auth/react"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar, Image as ImageIcon } from "lucide-react"
import { mediaFileUrl } from "@/lib/api"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { hasRight, relationshipLabel } from "@family-tree/types"

const selectClassName = "w-full rounded-md border border-stone-200 bg-white px-2 py-1.5 text-sm"

const EDITABLE_REL_TYPES = [
  "father-child",
  "mother-child",
  "spouse",
  "sibling",
  "adopted",
  "guardian",
] as const

function personLabel(person: any) {
  return `${person.first_name || ""} ${person.last_name || ""}`.trim() || "Unknown"
}

function toDateInput(value?: string | null) {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  return d.toISOString().slice(0, 10)
}

function nameKey(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase()
}

export function PersonDetails({
  person,
  treeId,
  onDeleted,
  onUpdated,
}: {
  person: any
  treeId: string
  onDeleted?: () => void
  onUpdated?: () => void
}) {
  const { lifeEvents, isLoading: lifeLoading, createLifeEvent } = useLifeEvents(person.id)
  const { media, isLoading: mediaLoading, uploadMedia } = useMedia(treeId)
  const { deletePerson, updatePerson, people } = usePeople(treeId)
  const { relationships, linkParents, updateRelationship, deleteRelationship } = useRelationships(treeId)
  const { trees, createTree } = useTrees()
  const { data: session } = useSession()
  const canCreateTrees = hasRight(session?.user?.role, "create_family_tree")
  const accessToken =
    session?.user?.accessToken ||
    (session as { accessToken?: string } | null)?.accessToken

  const [title, setTitle] = React.useState("")
  const [deleting, setDeleting] = React.useState(false)
  const [linking, setLinking] = React.useState(false)
  const [fatherId, setFatherId] = React.useState("")
  const [motherId, setMotherId] = React.useState("")
  const [editingPerson, setEditingPerson] = React.useState(false)
  const [savingPerson, setSavingPerson] = React.useState(false)
  const [personForm, setPersonForm] = React.useState({
    first_name: person.first_name || "",
    last_name: person.last_name || "",
    maiden_name: person.maiden_name || "",
    gender: person.gender || "",
    birth_date: toDateInput(person.birth_date),
    death_date: toDateInput(person.death_date),
  })
  const [editingRelId, setEditingRelId] = React.useState<string | null>(null)
  const [relDraft, setRelDraft] = React.useState({ type: "", person_a_id: "", person_b_id: "" })
  const [savingRel, setSavingRel] = React.useState(false)
  const [creatingParentalTree, setCreatingParentalTree] = React.useState(false)

  const personMedia = (media || []).filter((m: any) => m.person_id === person.id)

  React.useEffect(() => {
    setEditingPerson(false)
    setEditingRelId(null)
    setPersonForm({
      first_name: person.first_name || "",
      last_name: person.last_name || "",
      maiden_name: person.maiden_name || "",
      gender: person.gender || "",
      birth_date: toDateInput(person.birth_date),
      death_date: toDateInput(person.death_date),
    })
  }, [person.id, person.first_name, person.last_name, person.maiden_name, person.gender, person.birth_date, person.death_date])

  const family = React.useMemo(() => {
    const byId = new Map((people || []).map((p: any) => [p.id, p]))
    let father: any = null
    let mother: any = null
    const children: any[] = []
    const spouses: any[] = []
    const siblings: any[] = []
    const personRels: any[] = []

    for (const rel of relationships || []) {
      if (rel.person_a_id === person.id || rel.person_b_id === person.id) {
        personRels.push(rel)
      }
      if (rel.type === "father-child" && rel.person_b_id === person.id) {
        father = byId.get(rel.person_a_id)
      }
      if (rel.type === "mother-child" && rel.person_b_id === person.id) {
        mother = byId.get(rel.person_a_id)
      }
      if (
        (rel.type === "father-child" ||
          rel.type === "mother-child" ||
          rel.type === "parent-child" ||
          rel.type === "adopted" ||
          rel.type === "guardian") &&
        rel.person_a_id === person.id
      ) {
        const child = byId.get(rel.person_b_id)
        if (child && !children.find((c) => c.id === child.id)) children.push(child)
      }
      if (rel.type === "spouse") {
        const spouseId = rel.person_a_id === person.id ? rel.person_b_id : rel.person_b_id === person.id ? rel.person_a_id : null
        if (spouseId) {
          const spouse = byId.get(spouseId)
          if (spouse && !spouses.find((s) => s.id === spouse.id)) spouses.push(spouse)
        }
      }
      if (rel.type === "sibling") {
        const siblingId = rel.person_a_id === person.id ? rel.person_b_id : rel.person_b_id === person.id ? rel.person_a_id : null
        if (siblingId) {
          const sibling = byId.get(siblingId)
          if (sibling && !siblings.find((s) => s.id === sibling.id)) siblings.push(sibling)
        }
      }
    }

    if (father || mother) {
      for (const rel of relationships || []) {
        const sharesFather = father && rel.type === "father-child" && rel.person_a_id === father.id && rel.person_b_id !== person.id
        const sharesMother = mother && rel.type === "mother-child" && rel.person_a_id === mother.id && rel.person_b_id !== person.id
        if (sharesFather || sharesMother) {
          const sibling = byId.get(rel.person_b_id)
          if (sibling && !siblings.find((s) => s.id === sibling.id)) siblings.push(sibling)
        }
      }
    }

    return { father, mother, children, spouses, siblings, personRels }
  }, [people, relationships, person.id])

  const husbands = family.spouses.filter((s: any) => s.gender === "male")
  const wives = family.spouses.filter((s: any) => s.gender === "female")
  const otherSpouses = family.spouses.filter((s: any) => s.gender !== "male" && s.gender !== "female")
  const fathers = (people || []).filter((p: any) => p.gender === "male" && p.id !== person.id)
  const mothers = (people || []).filter((p: any) => p.gender === "female" && p.id !== person.id)
  const needsParents = !family.father || !family.mother

  const parentalFamilyName = (person.maiden_name || "").trim()
  const relatedTrees = React.useMemo(() => {
    if (!parentalFamilyName || !trees?.length) return []
    const key = nameKey(parentalFamilyName)
    return trees.filter((t: any) => t.id !== treeId && nameKey(String(t.name || "")) === key)
  }, [trees, parentalFamilyName, treeId])

  async function addEvent(event: React.FormEvent) {
    event.preventDefault()
    if (!title.trim()) return
    await createLifeEvent({ title: title.trim(), type: "other" })
    setTitle("")
  }

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    await uploadMedia({ personId: person.id, file })
    event.target.value = ""
  }

  async function onDelete() {
    const label = `${person.first_name || ""} ${person.last_name || ""}`.trim() || "this person"
    if (!window.confirm(`Delete ${label}? This also removes their relationships, events, and linked media.`)) {
      return
    }
    setDeleting(true)
    try {
      await deletePerson(person.id)
      onDeleted?.()
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete person")
    } finally {
      setDeleting(false)
    }
  }

  async function onSavePerson(event: React.FormEvent) {
    event.preventDefault()
    if (!personForm.first_name.trim()) {
      alert("First name is required")
      return
    }
    if (!personForm.birth_date) {
      alert("Birth date is required")
      return
    }
    if (personForm.gender !== "male" && personForm.gender !== "female") {
      alert("Select male or female")
      return
    }
    setSavingPerson(true)
    try {
      await updatePerson({
        id: person.id,
        data: {
          first_name: personForm.first_name.trim(),
          last_name: personForm.last_name.trim() || undefined,
          maiden_name:
            personForm.gender === "female"
              ? personForm.maiden_name.trim() || undefined
              : undefined,
          gender: personForm.gender,
          birth_date: personForm.birth_date,
          death_date: personForm.death_date || undefined,
          is_living: !personForm.death_date,
        },
      })
      setEditingPerson(false)
      onUpdated?.()
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to update person")
    } finally {
      setSavingPerson(false)
    }
  }

  async function onLinkParents(event: React.FormEvent) {
    event.preventDefault()
    const nextFatherId = family.father?.id || fatherId
    const nextMotherId = family.mother?.id || motherId
    if (!nextFatherId || !nextMotherId) {
      alert("Select both father and mother")
      return
    }
    setLinking(true)
    try {
      await linkParents({
        child_id: person.id,
        father_id: nextFatherId,
        mother_id: nextMotherId,
      })
      setFatherId("")
      setMotherId("")
      onUpdated?.()
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to link parents")
    } finally {
      setLinking(false)
    }
  }

  function startEditRel(rel: any) {
    setEditingRelId(rel.id)
    setRelDraft({
      type: rel.type,
      person_a_id: rel.person_a_id,
      person_b_id: rel.person_b_id,
    })
  }

  async function onSaveRel(event: React.FormEvent) {
    event.preventDefault()
    if (!editingRelId) return
    if (!relDraft.person_a_id || !relDraft.person_b_id || !relDraft.type) {
      alert("Type and both people are required")
      return
    }
    setSavingRel(true)
    try {
      await updateRelationship({
        id: editingRelId,
        data: {
          type: relDraft.type,
          person_a_id: relDraft.person_a_id,
          person_b_id: relDraft.person_b_id,
        },
      })
      setEditingRelId(null)
      onUpdated?.()
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to update relationship")
    } finally {
      setSavingRel(false)
    }
  }

  async function onDeleteRel(relId: string) {
    if (!window.confirm("Remove this relationship?")) return
    try {
      await deleteRelationship(relId)
      if (editingRelId === relId) setEditingRelId(null)
      onUpdated?.()
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete relationship")
    }
  }

  async function onCreateParentalTree() {
    if (!parentalFamilyName) return
    setCreatingParentalTree(true)
    try {
      const tree = await createTree(parentalFamilyName)
      window.location.href = `/tree/${tree.id}`
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to create parental family tree")
      setCreatingParentalTree(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2 rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm text-stone-600">
        {!editingPerson ? (
          <>
            <p>
              <span className="font-medium text-stone-900">Gender:</span>{" "}
              {person.gender === "male" || person.gender === "female"
                ? person.gender.charAt(0).toUpperCase() + person.gender.slice(1)
                : "Not set"}
            </p>
            <p>
              <span className="font-medium text-stone-900">Family name:</span>{" "}
              {person.last_name || "Not set"}
            </p>
            {person.gender === "female" && (
              <p>
                <span className="font-medium text-stone-900">Parental family name:</span>{" "}
                {person.maiden_name || "Not set"}
              </p>
            )}
            <p>
              <span className="font-medium text-stone-900">Born:</span>{" "}
              {person.birth_date ? new Date(person.birth_date).toLocaleDateString() : "Unknown"}
            </p>
            {person.death_date && (
              <p>
                <span className="font-medium text-stone-900">Died:</span>{" "}
                {new Date(person.death_date).toLocaleDateString()}
              </p>
            )}
            <Button type="button" variant="outline" className="mt-2 w-full" onClick={() => setEditingPerson(true)}>
              Edit person
            </Button>
          </>
        ) : (
          <form onSubmit={onSavePerson} className="space-y-2 rounded-md border border-stone-200 bg-white p-3">
            <p className="text-sm font-medium text-stone-900">Edit person</p>
            <div className="space-y-1">
              <label className="text-xs font-medium" htmlFor="edit-first-name">First name</label>
              <Input
                id="edit-first-name"
                value={personForm.first_name}
                onChange={(e) => setPersonForm((p) => ({ ...p, first_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium" htmlFor="edit-last-name">Family name</label>
              <Input
                id="edit-last-name"
                value={personForm.last_name}
                onChange={(e) => setPersonForm((p) => ({ ...p, last_name: e.target.value }))}
                placeholder="Married / current family name"
              />
            </div>
            {(personForm.gender === "female" || person.gender === "female") && (
              <div className="space-y-1">
                <label className="text-xs font-medium" htmlFor="edit-maiden-name">Parental family name</label>
                <Input
                  id="edit-maiden-name"
                  value={personForm.maiden_name}
                  onChange={(e) => setPersonForm((p) => ({ ...p, maiden_name: e.target.value }))}
                  placeholder="Wife's birth / parental family name"
                />
                <p className="text-[11px] text-stone-500">
                  Use this to connect her to a different family tree (parental side).
                </p>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-medium" htmlFor="edit-gender">Gender</label>
              <select
                id="edit-gender"
                className={selectClassName}
                value={personForm.gender}
                onChange={(e) => setPersonForm((p) => ({ ...p, gender: e.target.value }))}
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium" htmlFor="edit-birth">Birth date</label>
              <Input
                id="edit-birth"
                type="date"
                value={personForm.birth_date}
                onChange={(e) => setPersonForm((p) => ({ ...p, birth_date: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium" htmlFor="edit-death">Death date</label>
              <Input
                id="edit-death"
                type="date"
                value={personForm.death_date}
                onChange={(e) => setPersonForm((p) => ({ ...p, death_date: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={savingPerson}>
                {savingPerson ? "Saving..." : "Save"}
              </Button>
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEditingPerson(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        <div className="border-t border-stone-200 pt-2">
          <p>
            <span className="font-medium text-stone-900">Father:</span>{" "}
            {family.father ? personLabel(family.father) : "Not linked"}
          </p>
          <p>
            <span className="font-medium text-stone-900">Mother:</span>{" "}
            {family.mother ? personLabel(family.mother) : "Not linked"}
          </p>
          <p>
            <span className="font-medium text-stone-900">Husband:</span>{" "}
            {husbands.length > 0 ? husbands.map(personLabel).join(", ") : "None"}
          </p>
          <p>
            <span className="font-medium text-stone-900">Wife:</span>{" "}
            {wives.length > 0 ? wives.map(personLabel).join(", ") : "None"}
          </p>
          {otherSpouses.length > 0 && (
            <p>
              <span className="font-medium text-stone-900">Spouse:</span>{" "}
              {otherSpouses.map(personLabel).join(", ")}
            </p>
          )}
          <p>
            <span className="font-medium text-stone-900">Children:</span>{" "}
            {family.children.length > 0 ? family.children.map(personLabel).join(", ") : "None"}
          </p>
          <p>
            <span className="font-medium text-stone-900">Siblings:</span>{" "}
            {family.siblings.length > 0 ? family.siblings.map(personLabel).join(", ") : "None"}
          </p>
        </div>

        {person.gender === "female" && parentalFamilyName && (
          <div className="mt-3 space-y-2 rounded-md border border-stone-200 bg-white p-3">
            <p className="text-sm font-medium text-stone-900">Parental family tree</p>
            <p className="text-xs text-stone-500">
              Matching trees named &quot;{parentalFamilyName}&quot; (her parental family).
            </p>
            {relatedTrees.length > 0 ? (
              <ul className="space-y-1">
                {relatedTrees.map((t: any) => (
                  <li key={t.id}>
                    <Link className="text-sm font-medium text-stone-900 underline" href={`/tree/${t.id}`}>
                      Open {t.display_name || `${t.name} family tree`}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : canCreateTrees ? (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={creatingParentalTree}
                onClick={onCreateParentalTree}
              >
                {creatingParentalTree ? "Creating..." : `Create ${parentalFamilyName} family tree`}
              </Button>
            ) : (
              <p className="text-xs text-stone-500">Ask an administrator to create this parental family tree.</p>
            )}
          </div>
        )}

        {needsParents && (
          <form onSubmit={onLinkParents} className="mt-3 space-y-2 rounded-md border border-stone-200 bg-white p-3">
            <p className="text-sm font-medium text-stone-900">Link parents</p>
            {!family.father && (
              <div className="space-y-1">
                <label className="text-xs font-medium" htmlFor="link-father">Father</label>
                <select
                  id="link-father"
                  className={selectClassName}
                  value={fatherId}
                  onChange={(e) => setFatherId(e.target.value)}
                >
                  <option value="">Select father</option>
                  {fathers.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {personLabel(p)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {!family.mother && (
              <div className="space-y-1">
                <label className="text-xs font-medium" htmlFor="link-mother">Mother</label>
                <select
                  id="link-mother"
                  className={selectClassName}
                  value={motherId}
                  onChange={(e) => setMotherId(e.target.value)}
                >
                  <option value="">Select mother</option>
                  {mothers.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {personLabel(p)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={
                linking ||
                !(family.father?.id || fatherId) ||
                !(family.mother?.id || motherId)
              }
            >
              {linking ? "Linking..." : "Save parents"}
            </Button>
          </form>
        )}

        <div className="mt-3 space-y-2 rounded-md border border-stone-200 bg-white p-3">
          <p className="text-sm font-medium text-stone-900">Edit relationships</p>
          {family.personRels.length === 0 ? (
            <p className="text-xs text-stone-500">No relationships yet.</p>
          ) : (
            <ul className="space-y-3">
              {family.personRels.map((rel: any) => {
                const otherId = rel.person_a_id === person.id ? rel.person_b_id : rel.person_a_id
                const other = (people || []).find((p: any) => p.id === otherId)
                if (editingRelId === rel.id) {
                  return (
                    <li key={rel.id}>
                      <form onSubmit={onSaveRel} className="space-y-2 rounded border border-stone-200 p-2">
                        <select
                          className={selectClassName}
                          value={relDraft.type}
                          onChange={(e) => setRelDraft((d) => ({ ...d, type: e.target.value }))}
                        >
                          {EDITABLE_REL_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {relationshipLabel(type)}
                            </option>
                          ))}
                        </select>
                        <select
                          className={selectClassName}
                          value={relDraft.person_a_id}
                          onChange={(e) => setRelDraft((d) => ({ ...d, person_a_id: e.target.value }))}
                        >
                          <option value="">Person A</option>
                          {(people || []).map((p: any) => (
                            <option key={p.id} value={p.id}>
                              {personLabel(p)}
                            </option>
                          ))}
                        </select>
                        <select
                          className={selectClassName}
                          value={relDraft.person_b_id}
                          onChange={(e) => setRelDraft((d) => ({ ...d, person_b_id: e.target.value }))}
                        >
                          <option value="">Person B</option>
                          {(people || []).map((p: any) => (
                            <option key={p.id} value={p.id}>
                              {personLabel(p)}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <Button type="submit" size="sm" disabled={savingRel}>
                            {savingRel ? "Saving..." : "Save"}
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => setEditingRelId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </li>
                  )
                }
                return (
                  <li key={rel.id} className="flex items-start justify-between gap-2 text-xs">
                    <div>
                      <p className="font-medium text-stone-900">{relationshipLabel(rel.type)}</p>
                      <p className="text-stone-500">with {other ? personLabel(other) : "Unknown"}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button type="button" size="sm" variant="outline" onClick={() => startEditRel(rel)}>
                        Edit
                      </Button>
                      <Button type="button" size="sm" variant="destructive" onClick={() => onDeleteRel(rel.id)}>
                        Remove
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <Button
          type="button"
          variant="destructive"
          className="mt-2 w-full"
          disabled={deleting}
          onClick={onDelete}
        >
          {deleting ? "Deleting..." : "Delete person"}
        </Button>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Life Events</h2>
        <form onSubmit={addEvent} className="mb-4 flex gap-2">
          <Input
            aria-label="New life event title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add an event"
          />
          <Button type="submit">Add</Button>
        </form>
        {lifeLoading ? (
          <p className="text-sm text-stone-500">Loading events...</p>
        ) : (
          <div className="space-y-3">
            {lifeEvents && lifeEvents.length > 0 ? (
              lifeEvents.map((eventItem: any) => (
                <Card key={eventItem.id} className="bg-white">
                  <CardContent className="flex items-start gap-4 p-4">
                    <Calendar className="mt-1 h-5 w-5 text-stone-400" aria-hidden="true" />
                    <div>
                      <div className="font-medium text-stone-900">{eventItem.title}</div>
                      <div className="text-sm text-stone-500">
                        {eventItem.event_date ? new Date(eventItem.event_date).toLocaleDateString() : "No date"}
                        {eventItem.place && ` • ${eventItem.place}`}
                      </div>
                      {eventItem.description && (
                        <p className="mt-1 text-sm text-stone-600">{eventItem.description}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-sm italic text-stone-500">No life events recorded.</p>
            )}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Media</h2>
        <Input type="file" accept="image/*,application/pdf" onChange={onFile} aria-label="Upload photo or document" />
        {mediaLoading ? (
          <p className="mt-3 text-sm text-stone-500">Loading media...</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4">
            {personMedia.length > 0 ? (
              personMedia.map((item: any) => (
                <div key={item.id} className="relative aspect-square overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
                  {item.type === "photo" ? (
                    <img
                      src={mediaFileUrl(item.id, accessToken)}
                      alt={item.caption || "Family photo"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <a className="flex h-full items-center justify-center p-2 text-sm underline" href={mediaFileUrl(item.id, accessToken)} target="_blank" rel="noreferrer">
                      {item.caption || "Document"}
                    </a>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-8 text-stone-400">
                <ImageIcon className="mb-2 h-8 w-8 opacity-20" aria-hidden="true" />
                <p className="text-sm">No photos or documents uploaded.</p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
