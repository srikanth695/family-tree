"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { usePeople } from "@/hooks/use-people"

const NEW_FAMILY_NAME = "__new__"

const personSchema = z
  .object({
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().optional(),
    maiden_name: z.string().optional(),
    gender: z
      .string()
      .min(1, "Gender is required")
      .refine((value): value is "male" | "female" => value === "male" || value === "female", {
        message: "Select male or female",
      }),
    birth_date: z.string().min(1, "Birth date is required"),
    death_date: z.string().optional(),
    is_child: z.boolean().optional(),
    father_id: z.string().optional(),
    mother_id: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (!values.is_child) return
    if (!values.father_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Father is required for a child", path: ["father_id"] })
    }
    if (!values.mother_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Mother is required for a child", path: ["mother_id"] })
    }
    if (values.father_id && values.mother_id && values.father_id === values.mother_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Father and mother must be different people",
        path: ["mother_id"],
      })
    }
  })

type PersonFormValues = z.infer<typeof personSchema>

const selectClassName =
  "flex h-10 w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500"

function personLabel(person: any) {
  return `${person.first_name || ""} ${person.last_name || ""}`.trim()
}

function normalizeFamilyName(value: string) {
  return value.trim().replace(/\s+/g, " ")
}

function familyNameKey(value: string) {
  return normalizeFamilyName(value).toLocaleLowerCase()
}

function loadStoredFamilyNames(treeId: string): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(`family-names:${treeId}`)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === "string" && n.trim()) : []
  } catch {
    return []
  }
}

function saveStoredFamilyNames(treeId: string, names: string[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(`family-names:${treeId}`, JSON.stringify(names))
}

function collectFamilyNames(people: any[], stored: string[]) {
  const byKey = new Map<string, string>()
  for (const name of [...stored, ...people.map((p) => String(p.last_name || ""))]) {
    const cleaned = normalizeFamilyName(name)
    if (!cleaned) continue
    const key = familyNameKey(cleaned)
    if (!byKey.has(key)) byKey.set(key, cleaned)
  }
  return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
}

function resolveFamilyName(value: string, existing: string[]) {
  const cleaned = normalizeFamilyName(value)
  if (!cleaned) return ""
  const key = familyNameKey(cleaned)
  return existing.find((name) => familyNameKey(name) === key) || cleaned
}

export function MemberForm({
  treeId,
  people = [],
  onSuccess,
}: {
  treeId: string
  people?: any[]
  onSuccess: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [storedNames, setStoredNames] = React.useState<string[]>([])
  const [familyNameMode, setFamilyNameMode] = React.useState<"list" | "new">("list")
  const [newFamilyName, setNewFamilyName] = React.useState("")
  const { createPerson } = usePeople(treeId)

  const form = useForm<PersonFormValues>({
    resolver: zodResolver(personSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      maiden_name: "",
      gender: "",
      birth_date: "",
      death_date: "",
      is_child: false,
      father_id: "",
      mother_id: "",
    },
  })

  React.useEffect(() => {
    setStoredNames(loadStoredFamilyNames(treeId))
  }, [treeId, open])

  const isChild = form.watch("is_child")
  const selectedLastName = form.watch("last_name") || ""
  const gender = form.watch("gender")
  const fathers = people.filter((p) => p.gender === "male")
  const mothers = people.filter((p) => p.gender === "female")
  const familyNames = React.useMemo(
    () => collectFamilyNames(people, storedNames),
    [people, storedNames],
  )

  function rememberFamilyName(name: string) {
    const resolved = resolveFamilyName(name, familyNames)
    if (!resolved) return resolved
    setStoredNames((prev) => {
      const next = collectFamilyNames(people, [...prev, resolved])
      saveStoredFamilyNames(treeId, next)
      return next
    })
    return resolved
  }

  function resetForm() {
    form.reset({
      first_name: "",
      last_name: "",
      maiden_name: "",
      gender: "",
      birth_date: "",
      death_date: "",
      is_child: false,
      father_id: "",
      mother_id: "",
    })
    setFamilyNameMode(familyNames.length ? "list" : "new")
    setNewFamilyName("")
  }

  React.useEffect(() => {
    if (!open) return
    setFamilyNameMode(familyNames.length ? "list" : "new")
    setNewFamilyName("")
  }, [open, familyNames.length])

  async function onSubmit(values: PersonFormValues) {
    const typedName = familyNameMode === "new" ? newFamilyName : values.last_name
    const lastName = rememberFamilyName(typedName || "")

    setSaving(true)
    try {
      await createPerson({
        first_name: values.first_name.trim(),
        last_name: lastName || undefined,
        maiden_name:
          values.gender === "female" && values.maiden_name?.trim()
            ? values.maiden_name.trim()
            : undefined,
        gender: values.gender,
        birth_date: values.birth_date,
        death_date: values.death_date || undefined,
        is_living: !values.death_date,
        is_child: Boolean(values.is_child),
        father_id: values.is_child ? values.father_id : undefined,
        mother_id: values.is_child ? values.mother_id : undefined,
      })
      resetForm()
      setOpen(false)
      onSuccess()
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : "Failed to create person")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button type="button">Add Person</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add New Person</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="first_name">First name</label>
            <Input id="first_name" {...form.register("first_name")} placeholder="First name" />
            {form.formState.errors.first_name && (
              <p className="text-xs text-red-500">{form.formState.errors.first_name.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="last_name">Family name</label>
            <select
              id="last_name"
              className={selectClassName}
              value={familyNameMode === "new" ? NEW_FAMILY_NAME : selectedLastName}
              onChange={(event) => {
                const value = event.target.value
                if (value === NEW_FAMILY_NAME) {
                  setFamilyNameMode("new")
                  form.setValue("last_name", "")
                  setNewFamilyName("")
                  return
                }
                setFamilyNameMode("list")
                form.setValue("last_name", value, { shouldValidate: true })
                setNewFamilyName("")
              }}
            >
              <option value="">Select family name</option>
              {familyNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
              <option value={NEW_FAMILY_NAME}>Other (type a new family name)</option>
            </select>

            {familyNameMode === "new" && (
              <Input
                className="mt-2"
                value={newFamilyName}
                onChange={(event) => setNewFamilyName(event.target.value)}
                placeholder="Type new family name"
                aria-label="New family name"
              />
            )}
            <p className="text-xs text-stone-500">
              Choose an existing family name, or type a new one to add it to the list.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="gender">Gender</label>
            <select id="gender" className={selectClassName} {...form.register("gender")}>
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
            {form.formState.errors.gender && (
              <p className="text-xs text-red-500">{form.formState.errors.gender.message}</p>
            )}
          </div>

          {gender === "female" && (
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="maiden_name">Parental family name</label>
              <Input
                id="maiden_name"
                {...form.register("maiden_name")}
                placeholder="Birth / parental family name"
              />
              <p className="text-xs text-stone-500">
                For a wife, this is her parental family name — used to link a different family tree.
              </p>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="birth_date">Birth date</label>
            <Input id="birth_date" type="date" {...form.register("birth_date")} required />
            {form.formState.errors.birth_date && (
              <p className="text-xs text-red-500">{form.formState.errors.birth_date.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="death_date">Death date (optional)</label>
            <Input id="death_date" type="date" {...form.register("death_date")} />
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-stone-800">
            <input type="checkbox" className="h-4 w-4" {...form.register("is_child")} />
            This person is a child (link father and mother)
          </label>

          {isChild && (
            <div className="space-y-4 rounded-md border border-stone-200 bg-stone-50 p-3">
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="father_id">Father</label>
                <select id="father_id" className={selectClassName} {...form.register("father_id")}>
                  <option value="">Select father</option>
                  {fathers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {personLabel(p)}
                    </option>
                  ))}
                </select>
                {fathers.length === 0 && (
                  <p className="text-xs text-amber-700">Add a male person first to choose a father.</p>
                )}
                {form.formState.errors.father_id && (
                  <p className="text-xs text-red-500">{form.formState.errors.father_id.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="mother_id">Mother</label>
                <select id="mother_id" className={selectClassName} {...form.register("mother_id")}>
                  <option value="">Select mother</option>
                  {mothers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {personLabel(p)}
                    </option>
                  ))}
                </select>
                {mothers.length === 0 && (
                  <p className="text-xs text-amber-700">Add a female person first to choose a mother.</p>
                )}
                {form.formState.errors.mother_id && (
                  <p className="text-xs text-red-500">{form.formState.errors.mother_id.message}</p>
                )}
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Saving..." : "Save Person"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
