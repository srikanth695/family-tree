"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useRelationships } from "@/hooks/use-relationships"
import { usePeople } from "@/hooks/use-people"
import { relationshipLabel } from "@family-tree/types"
import { Input } from "@/components/ui/input"
import { titleCaseWords } from "@/lib/utils"

const NEW_PERSON = "__new__"

const newPersonFields = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  gender: z.enum(["male", "female", ""]).optional(),
  birth_date: z.string().optional(),
  maiden_name: z.string().optional(),
})

const relationshipSchema = z
  .object({
    type: z.enum(["parents", "father-child", "mother-child", "spouse", "sibling", "adopted", "guardian"]),
    person_a_id: z.string().optional(),
    person_b_id: z.string().optional(),
    child_id: z.string().optional(),
    father_id: z.string().optional(),
    mother_id: z.string().optional(),
    wife_parental_family_name: z.string().optional(),
    person_a_new: newPersonFields.optional(),
    person_b_new: newPersonFields.optional(),
    child_new: newPersonFields.optional(),
    father_new: newPersonFields.optional(),
    mother_new: newPersonFields.optional(),
  })
  .superRefine((values, ctx) => {
    function requirePerson(
      id: string | undefined,
      draft: z.infer<typeof newPersonFields> | undefined,
      idPath: string,
      draftPath: string,
      fixedGender?: "male" | "female",
    ) {
      if (!id) {
        ctx.addIssue({ code: "custom", message: "Required", path: [idPath] })
        return
      }
      if (id !== NEW_PERSON) return
      if (!draft?.first_name?.trim()) {
        ctx.addIssue({ code: "custom", message: "First name is required", path: [draftPath, "first_name"] })
      }
      if (!draft?.birth_date) {
        ctx.addIssue({ code: "custom", message: "Birth date is required", path: [draftPath, "birth_date"] })
      }
      const gender = fixedGender || draft?.gender
      if (gender !== "male" && gender !== "female") {
        ctx.addIssue({ code: "custom", message: "Select male or female", path: [draftPath, "gender"] })
      }
    }

    if (values.type === "parents") {
      requirePerson(values.child_id, values.child_new, "child_id", "child_new")
      requirePerson(values.father_id, values.father_new, "father_id", "father_new", "male")
      requirePerson(values.mother_id, values.mother_new, "mother_id", "mother_new", "female")
      if (
        values.father_id &&
        values.mother_id &&
        values.father_id !== NEW_PERSON &&
        values.mother_id !== NEW_PERSON &&
        values.father_id === values.mother_id
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Father and mother must be different",
          path: ["mother_id"],
        })
      }
      return
    }

    const personAGender =
      values.type === "father-child" || values.type === "spouse"
        ? "male"
        : values.type === "mother-child"
          ? "female"
          : undefined
    const personBGender = values.type === "spouse" ? "female" : undefined

    requirePerson(values.person_a_id, values.person_a_new, "person_a_id", "person_a_new", personAGender)
    requirePerson(values.person_b_id, values.person_b_new, "person_b_id", "person_b_new", personBGender)

    if (
      values.person_a_id &&
      values.person_b_id &&
      values.person_a_id !== NEW_PERSON &&
      values.person_b_id !== NEW_PERSON &&
      values.person_a_id === values.person_b_id
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Choose two different people",
        path: ["person_b_id"],
      })
    }
  })

type RelationshipFormValues = z.infer<typeof relationshipSchema>
type NewPersonDraft = z.infer<typeof newPersonFields>

const selectClassName = "w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
const emptyNewPerson: NewPersonDraft = {
  first_name: "",
  last_name: "",
  gender: "",
  birth_date: "",
  maiden_name: "",
}

function personLabel(person: any) {
  return titleCaseWords(`${person.first_name || ""} ${person.last_name || ""}`)
}

function NewPersonFields({
  prefix,
  label,
  values,
  errors,
  fixedGender,
  showMaidenName,
  onChange,
}: {
  prefix: string
  label: string
  values: NewPersonDraft
  errors?: Partial<Record<keyof NewPersonDraft, { message?: string }>>
  fixedGender?: "male" | "female"
  showMaidenName?: boolean
  onChange: (next: NewPersonDraft) => void
}) {
  return (
    <div className="space-y-2 rounded-md border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800">
      <p className="text-xs font-medium text-stone-700 dark:text-stone-200">New {label.toLowerCase()} details</p>
      <div className="space-y-1">
        <label className="text-xs font-medium" htmlFor={`${prefix}-first_name`}>First name</label>
        <Input
          id={`${prefix}-first_name`}
          value={values.first_name || ""}
          onChange={(e) => onChange({ ...values, first_name: e.target.value })}
          placeholder="First name"
        />
        {errors?.first_name?.message && (
          <p className="text-xs text-red-500">{errors.first_name.message}</p>
        )}
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium" htmlFor={`${prefix}-last_name`}>Family name</label>
        <Input
          id={`${prefix}-last_name`}
          value={values.last_name || ""}
          onChange={(e) => onChange({ ...values, last_name: e.target.value })}
          placeholder="Family name"
        />
      </div>
      {!fixedGender && (
        <div className="space-y-1">
          <label className="text-xs font-medium" htmlFor={`${prefix}-gender`}>Gender</label>
          <select
            id={`${prefix}-gender`}
            className={selectClassName}
            value={values.gender || ""}
            onChange={(e) => onChange({ ...values, gender: e.target.value as NewPersonDraft["gender"] })}
          >
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          {errors?.gender?.message && (
            <p className="text-xs text-red-500">{errors.gender.message}</p>
          )}
        </div>
      )}
      {(showMaidenName || values.gender === "female" || fixedGender === "female") && (
        <div className="space-y-1">
          <label className="text-xs font-medium" htmlFor={`${prefix}-maiden_name`}>
            Parental family name
          </label>
          <Input
            id={`${prefix}-maiden_name`}
            value={values.maiden_name || ""}
            onChange={(e) => onChange({ ...values, maiden_name: e.target.value })}
            placeholder="Birth / parental family name"
          />
        </div>
      )}
      <div className="space-y-1">
        <label className="text-xs font-medium" htmlFor={`${prefix}-birth_date`}>Birth date</label>
        <Input
          id={`${prefix}-birth_date`}
          type="date"
          value={values.birth_date || ""}
          onChange={(e) => onChange({ ...values, birth_date: e.target.value })}
        />
        {errors?.birth_date?.message && (
          <p className="text-xs text-red-500">{errors.birth_date.message}</p>
        )}
      </div>
    </div>
  )
}

function PersonSelect({
  id,
  label,
  options,
  value,
  error,
  newDraft,
  newErrors,
  fixedGender,
  showMaidenName,
  onSelect,
  onNewChange,
}: {
  id: string
  label: string
  options: any[]
  value: string
  error?: string
  newDraft: NewPersonDraft
  newErrors?: Partial<Record<keyof NewPersonDraft, { message?: string }>>
  fixedGender?: "male" | "female"
  showMaidenName?: boolean
  onSelect: (value: string) => void
  onNewChange: (next: NewPersonDraft) => void
}) {
  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor={id}>{label}</label>
        <select
          id={id}
          className={selectClassName}
          value={value}
          onChange={(e) => onSelect(e.target.value)}
        >
          <option value="">Select {label.toLowerCase()}</option>
          {options.map((p) => (
            <option key={p.id} value={p.id}>
              {personLabel(p)}
            </option>
          ))}
          <option value={NEW_PERSON}>Add new {label.toLowerCase()}...</option>
        </select>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
      {value === NEW_PERSON && (
        <NewPersonFields
          prefix={id}
          label={label}
          values={newDraft}
          errors={newErrors}
          fixedGender={fixedGender}
          showMaidenName={showMaidenName}
          onChange={onNewChange}
        />
      )}
    </div>
  )
}

export function RelationshipForm({
  treeId,
  people,
  familyName,
  onSuccess,
}: {
  treeId: string
  people: any[]
  familyName?: string
  onSuccess: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const { createRelationship, linkParents } = useRelationships(treeId)
  const { createPerson, updatePerson } = usePeople(treeId)

  const blankPerson = (): NewPersonDraft => ({
    ...emptyNewPerson,
    last_name: familyName || "",
  })

  const form = useForm<RelationshipFormValues>({
    resolver: zodResolver(relationshipSchema),
    defaultValues: {
      person_a_id: "",
      person_b_id: "",
      child_id: "",
      father_id: "",
      mother_id: "",
      wife_parental_family_name: "",
      type: "parents",
      person_a_new: blankPerson(),
      person_b_new: blankPerson(),
      child_new: blankPerson(),
      father_new: blankPerson(),
      mother_new: blankPerson(),
    },
  })

  const type = form.watch("type")
  const personAId = form.watch("person_a_id") || ""
  const personBId = form.watch("person_b_id") || ""
  const childId = form.watch("child_id") || ""
  const fatherId = form.watch("father_id") || ""
  const motherId = form.watch("mother_id") || ""
  const wifeId = personBId
  const selectedWife =
    wifeId && wifeId !== NEW_PERSON ? people.find((p) => p.id === wifeId) : null
  const males = people.filter((p) => p.gender === "male")
  const females = people.filter((p) => p.gender === "female")

  const personAOptions =
    type === "father-child" || type === "spouse"
      ? males
      : type === "mother-child"
        ? females
        : people

  const personBOptions = type === "spouse" ? females : people

  const personALabel =
    type === "father-child"
      ? "Father"
      : type === "mother-child"
        ? "Mother"
        : type === "spouse"
          ? "Husband"
          : type === "sibling"
            ? "Sibling 1"
            : "Parent / guardian"

  const personBLabel =
    type === "father-child" || type === "mother-child" || type === "adopted" || type === "guardian"
      ? "Child"
      : type === "spouse"
        ? "Wife"
        : type === "sibling"
          ? "Sibling 2"
          : "Person B"

  const personAGender =
    type === "father-child" || type === "spouse"
      ? ("male" as const)
      : type === "mother-child"
        ? ("female" as const)
        : undefined
  const personBGender = type === "spouse" ? ("female" as const) : undefined

  function resetForm() {
    form.reset({
      person_a_id: "",
      person_b_id: "",
      child_id: "",
      father_id: "",
      mother_id: "",
      wife_parental_family_name: "",
      type: "parents",
      person_a_new: blankPerson(),
      person_b_new: blankPerson(),
      child_new: blankPerson(),
      father_new: blankPerson(),
      mother_new: blankPerson(),
    })
  }

  async function resolvePersonId(
    id: string | undefined,
    draft: NewPersonDraft | undefined,
    fixedGender?: "male" | "female",
  ): Promise<string> {
    if (!id) throw new Error("Person is required")
    if (id !== NEW_PERSON) return id

    const gender = fixedGender || draft?.gender
    if (gender !== "male" && gender !== "female") {
      throw new Error("Select male or female for the new person")
    }
    if (!draft?.first_name?.trim()) throw new Error("First name is required")
    if (!draft.birth_date) throw new Error("Birth date is required")

    const created = await createPerson({
      first_name: titleCaseWords(draft.first_name),
      last_name: titleCaseWords(draft.last_name || "") || undefined,
      maiden_name:
        gender === "female" && draft.maiden_name?.trim()
          ? titleCaseWords(draft.maiden_name)
          : undefined,
      gender,
      birth_date: draft.birth_date,
      is_living: true,
    })
    return created.id
  }

  async function onSubmit(values: RelationshipFormValues) {
    setSaving(true)
    try {
      if (values.type === "parents") {
        const father_id = await resolvePersonId(values.father_id, values.father_new, "male")
        const mother_id = await resolvePersonId(values.mother_id, values.mother_new, "female")
        const child_id = await resolvePersonId(values.child_id, values.child_new)
        await linkParents({ child_id, father_id, mother_id })
      } else {
        const personAFixed =
          values.type === "father-child" || values.type === "spouse"
            ? "male"
            : values.type === "mother-child"
              ? "female"
              : undefined
        const personBFixed = values.type === "spouse" ? "female" : undefined
        const person_a_id = await resolvePersonId(values.person_a_id, values.person_a_new, personAFixed)
        const person_b_id = await resolvePersonId(values.person_b_id, values.person_b_new, personBFixed)

        await createRelationship({
          type: values.type,
          person_a_id,
          person_b_id,
        })

        if (values.type === "spouse") {
          const maiden =
            values.wife_parental_family_name?.trim() ||
            (values.person_b_id === NEW_PERSON ? values.person_b_new?.maiden_name?.trim() : "")
          if (maiden) {
            await updatePerson({
              id: person_b_id,
              data: { maiden_name: titleCaseWords(maiden) },
            })
          }
        }
      }
      resetForm()
      setOpen(false)
      onSuccess()
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : "Failed to create relationship")
    } finally {
      setSaving(false)
    }
  }

  const fieldErrors = form.formState.errors

  return (
    <Dialog open={open} onOpenChange={(next) => {
      setOpen(next)
      if (!next) resetForm()
    }}>
      <DialogTrigger>
        <Button type="button" variant="outline">Add Relationship</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add Relationship</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="type">Relationship</label>
            <select id="type" className={selectClassName} {...form.register("type")}>
              <option value="parents">Parents (father + mother)</option>
              <option value="father-child">{relationshipLabel("father-child")}</option>
              <option value="mother-child">{relationshipLabel("mother-child")}</option>
              <option value="spouse">{relationshipLabel("spouse")}</option>
              <option value="sibling">{relationshipLabel("sibling")}</option>
              <option value="adopted">{relationshipLabel("adopted")}</option>
              <option value="guardian">{relationshipLabel("guardian")}</option>
            </select>
          </div>

          {type === "parents" ? (
            <>
              <PersonSelect
                id="child_id"
                label="Child"
                options={people}
                value={childId}
                error={fieldErrors.child_id?.message}
                newDraft={form.watch("child_new") || blankPerson()}
                newErrors={fieldErrors.child_new as any}
                onSelect={(value) => {
                  form.setValue("child_id", value, { shouldValidate: true })
                  if (value !== NEW_PERSON) form.setValue("child_new", blankPerson())
                }}
                onNewChange={(next) => form.setValue("child_new", next, { shouldValidate: true })}
              />
              <PersonSelect
                id="father_id"
                label="Father"
                options={males}
                value={fatherId}
                error={fieldErrors.father_id?.message}
                newDraft={form.watch("father_new") || blankPerson()}
                newErrors={fieldErrors.father_new as any}
                fixedGender="male"
                onSelect={(value) => {
                  form.setValue("father_id", value, { shouldValidate: true })
                  if (value !== NEW_PERSON) form.setValue("father_new", blankPerson())
                }}
                onNewChange={(next) => form.setValue("father_new", next, { shouldValidate: true })}
              />
              <PersonSelect
                id="mother_id"
                label="Mother"
                options={females}
                value={motherId}
                error={fieldErrors.mother_id?.message}
                newDraft={form.watch("mother_new") || blankPerson()}
                newErrors={fieldErrors.mother_new as any}
                fixedGender="female"
                showMaidenName
                onSelect={(value) => {
                  form.setValue("mother_id", value, { shouldValidate: true })
                  if (value !== NEW_PERSON) form.setValue("mother_new", blankPerson())
                }}
                onNewChange={(next) => form.setValue("mother_new", next, { shouldValidate: true })}
              />
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Links both parents at once. Choose an existing person or add a new one and fill their details here.
              </p>
            </>
          ) : (
            <>
              <PersonSelect
                id="person_a_id"
                label={personALabel}
                options={personAOptions}
                value={personAId}
                error={fieldErrors.person_a_id?.message}
                newDraft={form.watch("person_a_new") || blankPerson()}
                newErrors={fieldErrors.person_a_new as any}
                fixedGender={personAGender}
                showMaidenName={personAGender === "female"}
                onSelect={(value) => {
                  form.setValue("person_a_id", value, { shouldValidate: true })
                  if (value !== NEW_PERSON) form.setValue("person_a_new", blankPerson())
                }}
                onNewChange={(next) => form.setValue("person_a_new", next, { shouldValidate: true })}
              />
              <PersonSelect
                id="person_b_id"
                label={personBLabel}
                options={personBOptions}
                value={personBId}
                error={fieldErrors.person_b_id?.message}
                newDraft={form.watch("person_b_new") || blankPerson()}
                newErrors={fieldErrors.person_b_new as any}
                fixedGender={personBGender}
                showMaidenName={type === "spouse" || personBGender === "female"}
                onSelect={(value) => {
                  form.setValue("person_b_id", value, { shouldValidate: true })
                  if (value !== NEW_PERSON) form.setValue("person_b_new", blankPerson())
                }}
                onNewChange={(next) => form.setValue("person_b_new", next, { shouldValidate: true })}
              />
              {type === "spouse" && personBId !== NEW_PERSON && (
                <>
                  <div className="space-y-1">
                    <label className="text-sm font-medium" htmlFor="wife_parental_family_name">
                      Wife&apos;s parental family name
                    </label>
                    <Input
                      id="wife_parental_family_name"
                      placeholder={selectedWife?.maiden_name || "Her birth / parental family name"}
                      {...form.register("wife_parental_family_name")}
                    />
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Saves on the wife so you can open or create her parental family tree.
                    </p>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Spouse is saved as husband and wife based on gender.
                  </p>
                </>
              )}
              {type === "spouse" && personBId === NEW_PERSON && (
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Spouse is saved as husband and wife based on gender. Fill the wife&apos;s parental family name above if known.
                </p>
              )}
            </>
          )}
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Saving..." : "Save Relationship"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
