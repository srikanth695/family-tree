"use client"

import React, { useCallback, useEffect, useMemo, useRef } from "react"
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  NodeProps,
  Edge,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  NodeDragHandler,
  MarkerType,
  ReactFlowInstance,
} from "reactflow"
import "reactflow/dist/style.css"
import type { Person, Relationship, TreeLayout } from "@family-tree/types"
import {
  getSiblingGroups,
  junctionPosition,
  layoutFamilyTree,
  layoutStructureKey,
  PARENT_TYPES,
  shortRelationshipLabel,
  spouseRelationshipLabel,
  TreePosition,
} from "@/lib/layout-family-tree"
import { graphPalette, type GraphPalette } from "@/lib/graph-theme"
import { ageRangeLabel, lifespanLabel, familyStandings, inLawIds, type FamilyStanding } from "@/lib/person-display"
import { cn, titleCaseWords } from "@/lib/utils"
import { AgeAvatar, ageInYears } from "@/components/tree/AgeAvatar"
import { useTheme } from "@/components/theme-provider"

const SAVE_DEBOUNCE_MS = 600

interface PersonNodeData {
  firstName: string
  lastName?: string | null
  gender?: string | null
  years: string
  living: boolean
  selected: boolean
  ageRange: string
  age: number | null
  photoUrl?: string
  standing?: FamilyStanding
  /** Name of the selected person whose spouse this person is a parent of. */
  inLawOf?: string
}

const GENDER_TONES = {
  female: {
    border: "border-rose-400 dark:border-rose-500",
    avatar: "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-100",
    label: "Female",
  },
  male: {
    border: "border-sky-400 dark:border-sky-500",
    avatar: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100",
    label: "Male",
  },
  other: {
    border: "border-stone-400 dark:border-stone-500",
    avatar: "bg-stone-200 text-stone-800 dark:bg-stone-700 dark:text-stone-100",
    label: "",
  },
} as const

function toneFor(gender?: string | null) {
  return gender === "female" ? GENDER_TONES.female : gender === "male" ? GENDER_TONES.male : GENDER_TONES.other
}

const PersonNode = ({ data }: NodeProps<PersonNodeData>) => {
  const tone = toneFor(data.gender)
  const name = `${titleCaseWords(data.firstName)} ${titleCaseWords(data.lastName)}`.trim()
  const subtitle = [tone.label, data.years].filter(Boolean).join(" · ")

  return (
    <div
      aria-label={[name, subtitle].filter(Boolean).join(", ")}
      className={cn(
        "relative flex w-[210px] cursor-grab items-center gap-2.5 rounded-lg border-2 bg-white px-2.5 py-2 text-left shadow-sm active:cursor-grabbing dark:bg-stone-800",
        tone.border,
        data.standing === "married-in" && "border-dashed bg-amber-50 dark:bg-amber-950/40",
        data.inLawOf && "border-dashed bg-violet-50 dark:bg-violet-950/40",
        data.standing === "married-out" && "bg-stone-50 dark:bg-stone-800/70",
        !data.living && "bg-stone-50 dark:bg-stone-800/70",
        data.selected &&
          "ring-2 ring-teal-600 ring-offset-2 ring-offset-stone-100 dark:ring-teal-400 dark:ring-offset-stone-950",
      )}
    >
      <Handle id="top" type="target" position={Position.Top} className="!h-2 !w-2 !bg-stone-500" />
      <Handle id="left" type="target" position={Position.Left} className="!h-2 !w-2 !bg-stone-500" />
      {data.photoUrl ? (
        <img
          src={data.photoUrl}
          alt=""
          draggable={false}
          className="h-11 w-11 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="relative shrink-0">
          <AgeAvatar age={data.age} gender={data.gender} />
          {data.ageRange && (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-1.5 text-[9px] font-semibold leading-4 text-stone-700 shadow-sm ring-1 ring-stone-300 dark:bg-stone-900 dark:text-stone-200 dark:ring-stone-600">
              {data.ageRange}
            </span>
          )}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-stone-900 dark:text-stone-50">{name}</div>
        {subtitle && <div className="truncate text-xs text-stone-600 dark:text-stone-300">{subtitle}</div>}
      </div>
      {(data.inLawOf || data.standing) && (
        <span
          title={data.inLawOf ? `Parent of ${data.inLawOf}'s spouse` : undefined}
          className={cn(
            "absolute -top-2.5 right-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm",
            data.inLawOf ? "bg-violet-500" : data.standing === "married-in" ? "bg-amber-500" : "bg-stone-500",
          )}
        >
          {data.inLawOf ? "In-law" : data.standing === "married-in" ? "Married in" : "Married out"}
        </span>
      )}
      <Handle id="right" type="source" position={Position.Right} className="!h-2 !w-2 !bg-stone-500" />
      <Handle id="bottom" type="source" position={Position.Bottom} className="!h-2 !w-2 !bg-stone-500" />
    </div>
  )
}

const JunctionNode = () => {
  const handle = "!h-1.5 !w-1.5 !border-0 !bg-stone-600 dark:!bg-stone-300"
  return (
    <div className="relative h-3 w-3 rounded-full bg-stone-600 shadow dark:bg-stone-300">
      <Handle id="top" type="target" position={Position.Top} className={handle} />
      <Handle id="bottom" type="source" position={Position.Bottom} className={handle} />
      <Handle id="left" type="target" position={Position.Left} className={handle} />
      <Handle id="right" type="source" position={Position.Right} className={handle} />
    </div>
  )
}

const nodeTypes = {
  person: PersonNode,
  junction: JunctionNode,
}

type EdgeKind = "parent" | "child" | "sibling" | "spouse" | "other"

/** Everything about an edge that is not colour: colours come from the theme at render time. */
interface EdgeMeta {
  kind: EdgeKind
  label?: string
  /** Person ids this edge concerns; the label shows when one of them is selected. */
  involves: string[]
  alwaysLabel?: boolean
}

interface FamilyTreeProps {
  treeId: string
  people: Person[]
  relationships: Relationship[]
  selectedId?: string | null
  onNodeClick?: (id: string) => void
  /** Arrangement saved for the whole tree; ignored once people or relationships change. */
  savedLayout?: TreeLayout | null
  /** Whether drags may be persisted for everyone. */
  canEdit?: boolean
  onSaveLayout?: (layout: TreeLayout) => void
  onResetLayout?: () => void
  /** Shown over the canvas while the tree has nobody in it. */
  emptyState?: React.ReactNode
  /** Profile photo URL per person id; people without one get an initials avatar. */
  photoUrls?: Record<string, string>
  /** Surname the tree is built around; drives the married in / married out / in-law marks. */
  familyName?: string
}

function personPositionsFromNodes(nodes: Node[]): Record<string, TreePosition> {
  const positions: Record<string, TreePosition> = {}
  for (const node of nodes) {
    if (node.type === "junction") continue
    positions[node.id] = { x: node.position.x, y: node.position.y }
  }
  return positions
}

function buildGraph(
  people: Person[],
  relationships: Relationship[],
  positions: Record<string, TreePosition>,
  familyName?: string,
): { nodes: Node[]; edges: Edge[] } {
  const groups = getSiblingGroups(relationships)
  const linkedParentChild = new Set<string>()
  const peopleById = new Map(people.map((person) => [person.id, person]))
  const standings = familyStandings(people, relationships, familyName ?? "")

  const personNodes: Node<PersonNodeData>[] = people.map((person) => ({
    id: person.id,
    type: "person",
    data: {
      firstName: person.first_name,
      lastName: person.last_name,
      gender: person.gender,
      years: lifespanLabel(person),
      ageRange: ageRangeLabel(person),
      age: ageInYears(person),
      standing: standings.get(person.id),
      living: person.is_living !== false && !person.death_date,
      selected: false,
    },
    position: positions[person.id] || { x: 0, y: 0 },
    draggable: true,
  }))

  const junctionNodes: Node[] = []
  const edges: Edge<EdgeMeta>[] = []

  for (const group of groups) {
    const junctionId = group.id
    junctionNodes.push({
      id: junctionId,
      type: "junction",
      data: {},
      position: junctionPosition(group, positions),
      draggable: false,
      selectable: false,
    })

    for (const parentId of group.parentIds) {
      const label =
        parentId === group.fatherId ? "Father" : parentId === group.motherId ? "Mother" : "Parent"
      edges.push({
        id: `parent-${parentId}-${junctionId}`,
        source: parentId,
        target: junctionId,
        sourceHandle: "bottom",
        targetHandle: "top",
        data: { kind: "parent", label, involves: [parentId, ...group.children] },
      })
      for (const childId of group.children) {
        linkedParentChild.add(`${parentId}:${childId}`)
      }
    }

    const sortedChildren = [...group.children].sort(
      (a, b) => (positions[a]?.x ?? 0) - (positions[b]?.x ?? 0),
    )

    sortedChildren.forEach((childId, index) => {
      edges.push({
        id: `child-${junctionId}-${childId}`,
        source: junctionId,
        target: childId,
        sourceHandle: "bottom",
        targetHandle: "top",
        data: { kind: "child", involves: [childId, ...group.parentIds] },
      })

      if (index < sortedChildren.length - 1) {
        const nextId = sortedChildren[index + 1]
        edges.push({
          id: `sibling-bar-${childId}-${nextId}`,
          source: childId,
          target: nextId,
          sourceHandle: "right",
          targetHandle: "left",
          data: { kind: "sibling", label: "Sibling", involves: [childId, nextId] },
        })
      }
    })
  }

  for (const rel of relationships) {
    if (rel.type === "spouse") {
      const personA = peopleById.get(rel.person_a_id)
      const personB = peopleById.get(rel.person_b_id)
      const aIsLeft = (positions[rel.person_a_id]?.x ?? 0) <= (positions[rel.person_b_id]?.x ?? 0)
      edges.push({
        id: `edge-${rel.id}`,
        source: aIsLeft ? rel.person_a_id : rel.person_b_id,
        target: aIsLeft ? rel.person_b_id : rel.person_a_id,
        sourceHandle: "right",
        targetHandle: "left",
        data: {
          kind: "spouse",
          label: spouseRelationshipLabel(personA?.gender, personB?.gender),
          involves: [rel.person_a_id, rel.person_b_id],
          alwaysLabel: true,
        },
      })
      continue
    }

    if (PARENT_TYPES.has(rel.type)) {
      if (linkedParentChild.has(`${rel.person_a_id}:${rel.person_b_id}`)) continue
      edges.push({
        id: `edge-${rel.id}`,
        source: rel.person_a_id,
        target: rel.person_b_id,
        sourceHandle: "bottom",
        targetHandle: "top",
        data: {
          kind: "child",
          label: shortRelationshipLabel(rel.type),
          involves: [rel.person_a_id, rel.person_b_id],
        },
      })
      continue
    }

    // Shared-parent siblings are already drawn as sibling bars.
    if (rel.type === "sibling") continue

    edges.push({
      id: `edge-${rel.id}`,
      source: rel.person_a_id,
      target: rel.person_b_id,
      data: {
        kind: "other",
        label: shortRelationshipLabel(rel.type),
        involves: [rel.person_a_id, rel.person_b_id],
      },
    })
  }

  return { nodes: [...personNodes, ...junctionNodes], edges }
}

/** Applies theme colours and selection emphasis to the structural edges from buildGraph. */
function styleEdges(edges: Edge<EdgeMeta>[], palette: GraphPalette, selectedId?: string | null): Edge[] {
  return edges.map((edge) => {
    const meta = edge.data
    if (!meta) return edge

    const active = Boolean(selectedId && meta.involves.includes(selectedId))
    const muted = meta.kind === "sibling" || meta.kind === "spouse"
    const color = active ? palette.highlight : muted ? palette.edgeMuted : palette.edge
    const showLabel = meta.label && (active || meta.alwaysLabel)

    return {
      ...edge,
      type: meta.kind === "sibling" || meta.kind === "spouse" ? "straight" : "smoothstep",
      zIndex: active ? 10 : 0,
      label: showLabel ? meta.label : undefined,
      style: {
        stroke: color,
        strokeWidth: active ? 3 : 2,
        strokeDasharray: meta.kind === "sibling" ? "5 4" : meta.kind === "spouse" ? "6 4" : undefined,
      },
      markerEnd:
        meta.kind === "child"
          ? { type: MarkerType.ArrowClosed, width: 14, height: 14, color }
          : undefined,
      labelStyle: { fill: palette.label, fontSize: 11, fontWeight: 600 },
      labelBgStyle: { fill: palette.labelBg, fillOpacity: 0.95 },
      labelBgPadding: [6, 4] as [number, number],
      labelBgBorderRadius: 4,
    }
  })
}

export default function FamilyTree({
  treeId,
  people,
  relationships,
  selectedId,
  onNodeClick: handleNodeClick,
  savedLayout,
  canEdit = false,
  onSaveLayout,
  onResetLayout,
  emptyState,
  photoUrls,
  familyName,
}: FamilyTreeProps) {
  const { theme } = useTheme()
  const palette = useMemo(() => graphPalette(theme), [theme])
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const rfRef = useRef<ReactFlowInstance | null>(null)
  const fittedForTree = useRef<string | null>(null)
  const lastStructureKey = useRef<string | null>(null)
  const relationshipsRef = useRef(relationships)
  const nodesRef = useRef<Node[]>([])
  const draggingRef = useRef(false)
  const onSaveLayoutRef = useRef(onSaveLayout)
  const pendingSave = useRef<TreeLayout | null>(null)
  const saveTimer = useRef<number | undefined>(undefined)
  relationshipsRef.current = relationships
  nodesRef.current = nodes
  onSaveLayoutRef.current = onSaveLayout

  const structureKey = useMemo(() => layoutStructureKey(people, relationships), [people, relationships])
  const autoLayout = useMemo(() => layoutFamilyTree(people, relationships), [people, relationships])
  const saved = useMemo(
    () => (savedLayout && savedLayout.structureKey === structureKey ? savedLayout.positions : null),
    [savedLayout, structureKey],
  )

  const flushSave = useCallback(() => {
    window.clearTimeout(saveTimer.current)
    const layout = pendingSave.current
    pendingSave.current = null
    if (layout) onSaveLayoutRef.current?.(layout)
  }, [])

  const queueSave = useCallback(
    (positions: Record<string, TreePosition>) => {
      if (!canEdit) return
      pendingSave.current = { structureKey, positions }
      window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(flushSave, SAVE_DEBOUNCE_MS)
    },
    [canEdit, structureKey, flushSave],
  )

  // Persist a drag that is still waiting on the debounce when the canvas goes away.
  useEffect(() => flushSave, [flushSave])

  const scheduleFit = useCallback(() => {
    fittedForTree.current = null
    window.setTimeout(() => {
      rfRef.current?.fitView({ padding: 0.2, duration: 200 })
      fittedForTree.current = treeId
    }, 50)
  }, [treeId])

  const rebuildFromPersonPositions = useCallback(
    (personPositions: Record<string, TreePosition>) => {
      const graph = buildGraph(people, relationshipsRef.current, personPositions, familyName)
      setNodes(graph.nodes)
      setEdges(graph.edges)
    },
    [people, familyName, setNodes, setEdges],
  )

  useEffect(() => {
    if (draggingRef.current) return

    const structureChanged =
      lastStructureKey.current !== null && lastStructureKey.current !== structureKey
    lastStructureKey.current = structureKey

    // After a structural change the old arrangement no longer fits, so ignore in-session drags too.
    const live = structureChanged ? {} : personPositionsFromNodes(nodesRef.current)
    const positions: Record<string, TreePosition> = {}
    for (const person of people) {
      positions[person.id] = live[person.id] ?? saved?.[person.id] ?? autoLayout[person.id] ?? { x: 0, y: 0 }
    }
    rebuildFromPersonPositions(positions)
    if (structureChanged) scheduleFit()
  }, [people, structureKey, autoLayout, saved, rebuildFromPersonPositions, scheduleFit])

  useEffect(() => {
    if (!people.length) return
    if (fittedForTree.current === treeId) return
    const timer = window.setTimeout(() => {
      rfRef.current?.fitView({ padding: 0.2, duration: 200 })
      fittedForTree.current = treeId
    }, 50)
    return () => window.clearTimeout(timer)
  }, [people, treeId])

  const syncGraphFromNodes = useCallback(
    (currentNodes: Node[]) => {
      const personPositions = personPositionsFromNodes(currentNodes)
      const graph = buildGraph(people, relationshipsRef.current, personPositions, familyName)
      const byId = new Map(currentNodes.map((node) => [node.id, node]))
      setNodes(
        graph.nodes.map((node) => {
          const live = byId.get(node.id)
          if (node.type === "junction" || !live) return node
          return { ...node, position: live.position, dragging: live.dragging, selected: live.selected }
        }),
      )
      setEdges(graph.edges)
      return personPositions
    },
    [people, familyName, setNodes, setEdges],
  )

  const mergeDraggedIntoNodes = useCallback((draggedNode: Node) => {
    return nodesRef.current.map((node) =>
      node.id === draggedNode.id
        ? { ...node, position: { ...draggedNode.position }, dragging: draggedNode.dragging }
        : node,
    )
  }, [])

  const onNodeDragStart: NodeDragHandler = useCallback(() => {
    draggingRef.current = true
  }, [])

  const onNodeDrag: NodeDragHandler = useCallback(
    (_event, draggedNode) => {
      const positions = personPositionsFromNodes(mergeDraggedIntoNodes(draggedNode))
      const groups = getSiblingGroups(relationshipsRef.current)
      const junctionById = new Map(
        groups.map((group) => [group.id, junctionPosition(group, positions)] as const),
      )

      setNodes((current) =>
        current.map((node) => {
          if (node.id === draggedNode.id) {
            return { ...node, position: { ...draggedNode.position }, dragging: true }
          }
          if (node.type !== "junction") return node
          const nextPos = junctionById.get(node.id)
          return nextPos ? { ...node, position: nextPos } : node
        }),
      )
    },
    [mergeDraggedIntoNodes, setNodes],
  )

  const onNodeDragStop: NodeDragHandler = useCallback(
    (_event, draggedNode) => {
      const merged = mergeDraggedIntoNodes({ ...draggedNode, dragging: false })
      queueSave(syncGraphFromNodes(merged))
      draggingRef.current = false
    },
    [mergeDraggedIntoNodes, syncGraphFromNodes, queueSave],
  )

  const resetLayout = () => {
    window.clearTimeout(saveTimer.current)
    pendingSave.current = null
    if (canEdit) onResetLayout?.()
    rebuildFromPersonPositions(autoLayout)
    scheduleFit()
  }

  const displayNodes = useMemo(() => {
    const inLaws = inLawIds(selectedId, relationships)
    const selectedPerson = people.find((person) => person.id === selectedId)
    const inLawOf = selectedPerson ? titleCaseWords(selectedPerson.first_name) : undefined
    return nodes.map((node) =>
      node.type === "person"
        ? {
            ...node,
            data: {
              ...node.data,
              selected: node.id === selectedId,
              photoUrl: photoUrls?.[node.id],
              inLawOf: inLaws.has(node.id) ? inLawOf : undefined,
            },
          }
        : node,
    )
  }, [nodes, selectedId, photoUrls, relationships, people])
  const displayEdges = useMemo(
    () => styleEdges(edges, palette, selectedId),
    [edges, palette, selectedId],
  )

  return (
    <div className="relative h-full w-full">
      <div className="pointer-events-none absolute left-4 top-4 z-10 hidden max-w-sm rounded-md bg-white/90 px-3 py-2 text-xs leading-relaxed text-stone-600 shadow-sm ring-1 ring-stone-200 sm:block dark:bg-stone-900/90 dark:text-stone-300 dark:ring-stone-700">
        Drag people to adjust the layout. Amber: married into the {familyName} family. Grey: daughter who married out. Select someone to see their in-laws (their spouse's parents) in violet.
        {canEdit
          ? " Changes are saved for everyone on this tree, until people or relationships change."
          : " Your changes last until you reload the page."}
      </div>
      <div className="absolute right-4 top-4 z-10 flex gap-2">
        <button
          type="button"
          onClick={resetLayout}
          className="min-h-11 cursor-pointer rounded-md border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 shadow-sm hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
        >
          Reset layout
        </button>
      </div>
      {!people.length && emptyState && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
          <div className="max-w-sm rounded-lg border border-stone-200 bg-white p-6 text-center shadow-md dark:border-stone-700 dark:bg-stone-900">
            <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-50">This tree is empty</h3>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
              Add the first person to start building the family.
            </p>
            <div className="mt-4 flex justify-center">{emptyState}</div>
          </div>
        </div>
      )}
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={(_event, node) => {
          if (node.type === "junction") return
          handleNodeClick?.(node.id)
        }}
        onInit={(instance) => {
          rfRef.current = instance
        }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        panOnDrag={[1, 2]}
        selectionOnDrag={false}
        zoomOnScroll
        minZoom={0.2}
        maxZoom={2}
        nodeDragThreshold={1}
        defaultEdgeOptions={{
          interactionWidth: 24,
        }}
      >
        <Background color={theme === "dark" ? "#57534e" : "#d6d3d1"} gap={18} />
        <Controls showInteractive={false} />
        <MiniMap
          className="!hidden sm:!block"
          nodeStrokeColor="#a8a29e"
          nodeColor={(node) => {
            if (node.type === "junction") return "#57534e"
            return node.data?.gender === "female"
              ? "#fecdd3"
              : node.data?.gender === "male"
                ? "#bae6fd"
                : "#e7e5e4"
          }}
          maskColor={theme === "dark" ? "rgb(28, 25, 23, 0.7)" : "rgb(250, 250, 249, 0.7)"}
        />
      </ReactFlow>
    </div>
  )
}
