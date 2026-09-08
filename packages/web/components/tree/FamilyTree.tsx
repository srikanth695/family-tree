"use client"

import React, { useCallback, useEffect, useMemo, useRef } from "react"
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
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
import {
  getSiblingGroups,
  junctionPosition,
  layoutFamilyTree,
  loadSavedPositions,
  savePositions,
  shortRelationshipLabel,
  spouseRelationshipLabel,
  TreePosition,
} from "@/lib/layout-family-tree"

interface PersonNodeData {
  firstName: string
  lastName?: string
  gender?: string
}

const PersonNode = ({ data }: { data: PersonNodeData }) => {
  const border =
    data.gender === "female"
      ? "border-rose-300"
      : data.gender === "male"
        ? "border-sky-300"
        : "border-stone-400"

  return (
    <div
      className={`min-w-[180px] max-w-[220px] cursor-grab rounded-lg border-2 bg-white px-3 py-2 text-center shadow-sm active:cursor-grabbing ${border}`}
    >
      <Handle id="top" type="target" position={Position.Top} className="!h-2 !w-2 !bg-stone-500" />
      <Handle id="left" type="target" position={Position.Left} className="!h-2 !w-2 !bg-stone-500" />
      <div className="truncate text-sm font-semibold text-stone-900">
        {data.firstName} {data.lastName}
      </div>
      {data.gender && (
        <div className="text-[10px] font-medium uppercase tracking-wide text-stone-500">{data.gender}</div>
      )}
      <Handle id="right" type="source" position={Position.Right} className="!h-2 !w-2 !bg-stone-500" />
      <Handle id="bottom" type="source" position={Position.Bottom} className="!h-2 !w-2 !bg-stone-500" />
    </div>
  )
}

const JunctionNode = () => (
  <div className="relative h-3 w-3 rounded-full bg-stone-600 shadow">
    <Handle id="top" type="target" position={Position.Top} className="!h-1.5 !w-1.5 !bg-stone-600 !border-0" />
    <Handle id="bottom" type="source" position={Position.Bottom} className="!h-1.5 !w-1.5 !bg-stone-600 !border-0" />
    <Handle id="left" type="target" position={Position.Left} className="!h-1.5 !w-1.5 !bg-stone-600 !border-0" />
    <Handle id="right" type="source" position={Position.Right} className="!h-1.5 !w-1.5 !bg-stone-600 !border-0" />
  </div>
)

const nodeTypes = {
  person: PersonNode,
  junction: JunctionNode,
}

interface FamilyTreeProps {
  treeId: string
  people: any[]
  relationships: any[]
  onNodeClick?: (id: string) => void
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
  people: any[],
  relationships: any[],
  positions: Record<string, TreePosition>,
): { nodes: Node[]; edges: Edge[] } {
  const groups = getSiblingGroups(relationships || [])
  const linkedParentChild = new Set<string>()

  const personNodes: Node[] = (people || []).map((person) => ({
    id: person.id,
    type: "person",
    data: {
      firstName: person.first_name,
      lastName: person.last_name,
      gender: person.gender,
    },
    position: positions[person.id] || { x: 0, y: 0 },
    draggable: true,
  }))

  const junctionNodes: Node[] = []
  const edges: Edge[] = []

  for (const group of groups) {
    const junctionId = group.id
    const pos = junctionPosition(group, positions)
    junctionNodes.push({
      id: junctionId,
      type: "junction",
      data: {},
      position: pos,
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
        label,
        type: "smoothstep",
        style: { stroke: "#57534e", strokeWidth: 2 },
        labelStyle: { fill: "#44403c", fontSize: 10, fontWeight: 600 },
        labelBgStyle: { fill: "#fafaf9", fillOpacity: 0.95 },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 4,
      })
      for (const childId of group.children) {
        linkedParentChild.add(`${parentId}:${childId}`)
      }
    }

    const sortedChildren = [...group.children].sort((a, b) => {
      const ax = positions[a]?.x ?? 0
      const bx = positions[b]?.x ?? 0
      return ax - bx
    })

    sortedChildren.forEach((childId, index) => {
      edges.push({
        id: `child-${junctionId}-${childId}`,
        source: junctionId,
        target: childId,
        sourceHandle: "bottom",
        targetHandle: "top",
        type: "smoothstep",
        style: { stroke: "#57534e", strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: "#57534e",
        },
      })

      if (index < sortedChildren.length - 1) {
        const nextId = sortedChildren[index + 1]
        edges.push({
          id: `sibling-bar-${childId}-${nextId}`,
          source: childId,
          target: nextId,
          sourceHandle: "right",
          targetHandle: "left",
          label: "Sibling",
          type: "straight",
          style: { stroke: "#a8a29e", strokeWidth: 2, strokeDasharray: "5 4" },
          labelStyle: { fill: "#78716c", fontSize: 10, fontWeight: 600 },
          labelBgStyle: { fill: "#fafaf9", fillOpacity: 0.95 },
          labelBgPadding: [4, 2] as [number, number],
          labelBgBorderRadius: 4,
        })
      }
    })
  }

  for (const rel of relationships || []) {
    if (rel.type === "spouse") {
      const personA = (people || []).find((p) => p.id === rel.person_a_id)
      const personB = (people || []).find((p) => p.id === rel.person_b_id)
      edges.push({
        id: `edge-${rel.id}`,
        source: rel.person_a_id,
        target: rel.person_b_id,
        sourceHandle: "right",
        targetHandle: "left",
        label: spouseRelationshipLabel(personA?.gender, personB?.gender),
        type: "straight",
        style: { stroke: "#a8a29e", strokeWidth: 2, strokeDasharray: "6 4" },
        labelStyle: { fill: "#44403c", fontSize: 11, fontWeight: 600 },
        labelBgStyle: { fill: "#fafaf9", fillOpacity: 0.95 },
        labelBgPadding: [6, 4] as [number, number],
        labelBgBorderRadius: 4,
      })
      continue
    }

    if (PARENT_TYPES_LOCAL.has(rel.type)) {
      if (linkedParentChild.has(`${rel.person_a_id}:${rel.person_b_id}`)) continue
      edges.push({
        id: `edge-${rel.id}`,
        source: rel.person_a_id,
        target: rel.person_b_id,
        sourceHandle: "bottom",
        targetHandle: "top",
        label: shortRelationshipLabel(rel.type),
        type: "smoothstep",
        style: { stroke: "#57534e", strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: "#57534e",
        },
      })
      continue
    }

    if (rel.type === "sibling") {
      // Visual sibling bars already cover shared-parent siblings.
      continue
    }

    edges.push({
      id: `edge-${rel.id}`,
      source: rel.person_a_id,
      target: rel.person_b_id,
      label: shortRelationshipLabel(rel.type),
      type: "smoothstep",
      style: { stroke: "#78716c", strokeWidth: 2 },
    })
  }

  return { nodes: [...personNodes, ...junctionNodes], edges }
}

const PARENT_TYPES_LOCAL = new Set([
  "father-child",
  "mother-child",
  "parent-child",
  "adopted",
  "guardian",
])

function resolvePosition(
  id: string,
  live: Record<string, TreePosition>,
  saved: Record<string, TreePosition>,
  auto: Record<string, TreePosition>,
): TreePosition {
  return live[id] || saved[id] || auto[id] || { x: 0, y: 0 }
}

export default function FamilyTree({
  treeId,
  people,
  relationships,
  onNodeClick: handleNodeClick,
}: FamilyTreeProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const rfRef = useRef<ReactFlowInstance | null>(null)
  const fittedForTree = useRef<string | null>(null)
  const relationshipsRef = useRef(relationships)
  const nodesRef = useRef<Node[]>([])
  const draggingRef = useRef(false)
  relationshipsRef.current = relationships
  nodesRef.current = nodes

  const autoLayout = useMemo(
    () => layoutFamilyTree(people || [], relationships || []),
    [people, relationships],
  )

  const rebuildFromPersonPositions = useCallback(
    (personPositions: Record<string, TreePosition>) => {
      const graph = buildGraph(people || [], relationshipsRef.current || [], personPositions)
      setNodes(graph.nodes)
      setEdges(graph.edges)
    },
    [people, setNodes, setEdges],
  )

  useEffect(() => {
    if (draggingRef.current) return
    const saved = loadSavedPositions(treeId)
    const live = personPositionsFromNodes(nodesRef.current)
    const positions: Record<string, TreePosition> = {}
    for (const person of people || []) {
      positions[person.id] = resolvePosition(person.id, live, saved, autoLayout)
    }
    rebuildFromPersonPositions(positions)
  }, [people, relationships, treeId, autoLayout, rebuildFromPersonPositions])

  useEffect(() => {
    if (!people?.length) return
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
      const graph = buildGraph(people || [], relationshipsRef.current || [], personPositions)
      const byId = new Map(currentNodes.map((node) => [node.id, node]))
      const nextNodes = graph.nodes.map((node) => {
        if (node.type === "junction") return node
        const live = byId.get(node.id)
        return live
          ? {
              ...node,
              position: live.position,
              dragging: live.dragging,
              selected: live.selected,
            }
          : node
      })
      setNodes(nextNodes)
      setEdges(graph.edges)
      return personPositions
    },
    [people, setNodes, setEdges],
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
      const merged = mergeDraggedIntoNodes(draggedNode)
      const positions = personPositionsFromNodes(merged)
      const groups = getSiblingGroups(relationshipsRef.current || [])
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
      const personPositions = syncGraphFromNodes(merged)
      savePositions(treeId, personPositions)
      draggingRef.current = false
    },
    [mergeDraggedIntoNodes, syncGraphFromNodes, treeId],
  )

  const resetLayout = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(`family-tree-positions:${treeId}`)
    }
    rebuildFromPersonPositions(autoLayout)
    fittedForTree.current = null
    window.setTimeout(() => {
      rfRef.current?.fitView({ padding: 0.2, duration: 200 })
      fittedForTree.current = treeId
    }, 50)
  }

  return (
    <div className="relative h-full w-full">
      <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-md bg-white/90 px-3 py-2 text-xs text-stone-600 shadow-sm ring-1 ring-stone-200">
        Parents connect through a shared line to children; siblings are linked. Drag people with the left mouse button; pan with middle or right mouse.
      </div>
      <div className="absolute right-4 top-4 z-10 flex gap-2">
        <button
          type="button"
          onClick={resetLayout}
          className="rounded-md border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 shadow-sm hover:bg-stone-50"
        >
          Reset layout
        </button>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
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
        <Background color="#d6d3d1" gap={18} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeStrokeColor="#a8a29e"
          nodeColor={(node) => {
            if (node.type === "junction") return "#57534e"
            return node.data?.gender === "female"
              ? "#fecdd3"
              : node.data?.gender === "male"
                ? "#bae6fd"
                : "#e7e5e4"
          }}
          maskColor="rgb(250, 250, 249, 0.7)"
        />
      </ReactFlow>
    </div>
  )
}
