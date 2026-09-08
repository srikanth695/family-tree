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

const relationshipSchema = z
  .object({
    type: z.enum(["parents", "father-child", "mother-child", "spouse", "sibling", "adopted", "guardian"]),
    person_a_id: z.string().optional(),
    person_b_id: z.string().optional(),
    child_id: z.string().optional(),
    father_id: z.string().optional(),
    mother_id: z.string().optional(),
    wife_parental_family_name: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.type === "parents") {
      if (!values.child_id) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["child_id"] })
      }
      if (!values.father_id) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["father_id"] })
      }
      if (!values.mother_id) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["mother_id"] })
      }
      if (values.father_id && values.mother_id && values.father_id === values.mother_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Father and mother must be different",
          path: ["mother_id"],
        })
      }
      return
    }

    if (!values.person_a_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["person_a_id"] })
    }
    if (!values.person_b_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["person_b_id"] })
    }
    if (values.person_a_id && values.person_b_id && values.person_a_id === values.person_b_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose two different people",
        path: ["person_b_id"],
      })
    }
  })

type RelationshipFormValues = z.infer<typeof relationshipSchema>

const selectClassName = "w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm"

function personLabel(person: any) {
  return `${person.first_name || ""} ${person.last_name || ""}`.trim()
}

export function RelationshipForm({
  treeId,
  people,
  onSuccess,
}: {
  treeId: string
  people: any[]
  onSuccess: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const { createRelationship, linkParents } = useRelationships(treeId)
  const { updatePerson } = usePeople(treeId)

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
    },
  })

  const type = form.watch("type")
  const wifeId = form.watch("person_b_id")
  const selectedWife = people.find((p) => p.id === wifeId)
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

  async function onSubmit(values: RelationshipFormValues) {
    try {
      if (values.type === "parents") {
        await linkParents({
          child_id: values.child_id!,
          father_id: values.father_id!,
          mother_id: values.mother_id!,
        })
      } else {
        await createRelationship({
          type: values.type,
          person_a_id: values.person_a_id!,
          person_b_id: values.person_b_id!,
        })
        if (values.type === "spouse" && values.wife_parental_family_name?.trim()) {
          await updatePerson({
            id: values.person_b_id!,
            data: { maiden_name: values.wife_parental_family_name.trim() },
          })
        }
      }
      form.reset({
        person_a_id: "",
        person_b_id: "",
        child_id: "",
        father_id: "",
        mother_id: "",
        wife_parental_family_name: "",
        type: "parents",
      })
      setOpen(false)
      onSuccess()
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : "Failed to create relationship")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button type="button" variant="outline">Add Relationship</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
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
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="child_id">Child</label>
                <select id="child_id" className={selectClassName} {...form.register("child_id")}>
                  <option value="">Select child</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {personLabel(p)}
                    </option>
                  ))}
                </select>
                {form.formState.errors.child_id && (
                  <p className="text-xs text-red-500">{form.formState.errors.child_id.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="father_id">Father</label>
                <select id="father_id" className={selectClassName} {...form.register("father_id")}>
                  <option value="">Select father</option>
                  {males.map((p) => (
                    <option key={p.id} value={p.id}>
                      {personLabel(p)}
                    </option>
                  ))}
                </select>
                {form.formState.errors.father_id && (
                  <p className="text-xs text-red-500">{form.formState.errors.father_id.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="mother_id">Mother</label>
                <select id="mother_id" className={selectClassName} {...form.register("mother_id")}>
                  <option value="">Select mother</option>
                  {females.map((p) => (
                    <option key={p.id} value={p.id}>
                      {personLabel(p)}
                    </option>
                  ))}
                </select>
                {form.formState.errors.mother_id && (
                  <p className="text-xs text-red-500">{form.formState.errors.mother_id.message}</p>
                )}
              </div>
              <p className="text-xs text-stone-500">
                Links both parents at once. Any other children of these parents are connected as siblings on the tree.
              </p>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="person_a_id">{personALabel}</label>
                <select id="person_a_id" className={selectClassName} {...form.register("person_a_id")}>
                  <option value="">Select {personALabel.toLowerCase()}</option>
                  {personAOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {personLabel(p)}
                    </option>
                  ))}
                </select>
                {form.formState.errors.person_a_id && (
                  <p className="text-xs text-red-500">{form.formState.errors.person_a_id.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="person_b_id">{personBLabel}</label>
                <select id="person_b_id" className={selectClassName} {...form.register("person_b_id")}>
                  <option value="">Select {personBLabel.toLowerCase()}</option>
                  {personBOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {personLabel(p)}
                    </option>
                  ))}
                </select>
                {form.formState.errors.person_b_id && (
                  <p className="text-xs text-red-500">{form.formState.errors.person_b_id.message}</p>
                )}
              </div>
              {type === "spouse" && (
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
                    <p className="text-xs text-stone-500">
                      Saves on the wife so you can open or create her parental family tree.
                    </p>
                  </div>
                  <p className="text-xs text-stone-500">
                    Spouse is saved as husband and wife based on gender.
                  </p>
                </>
              )}
            </>
          )}
          <Button type="submit" className="w-full">Save Relationship</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
