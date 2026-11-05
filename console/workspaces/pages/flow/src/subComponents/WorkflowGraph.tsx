import { useEffect, useMemo, useState } from "react";
import { Background, Controls, ReactFlow, ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "../flow.css";
import type { StepStatus, WorkflowDefinition } from "@workspacenow/types";
import { nodeTypes } from "./FlowNodes";
import { toGraph } from "./graphModel";

/**
 * The console's light or dark mode, kept current. React Flow marks its canvas with this class, and
 * HeroUI reads theme colours from the nearest light/dark class, so it must match the page's.
 */
export function useCanvasColorMode(): "light" | "dark" {
  const read = (): "light" | "dark" => (document.documentElement.classList.contains("dark") ? "dark" : "light");
  const [mode, setMode] = useState(read);
  useEffect(() => {
    const observer = new MutationObserver(() => setMode(read()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return mode;
}

/** A workflow drawn as its flow, read-only; with `statuses`, each step shows how a run went and the path it took glows. */
export function WorkflowGraph({ definition, statuses, height = 460 }: { definition: WorkflowDefinition; statuses?: Map<string, StepStatus>; height?: number }) {
  const { nodes, edges } = useMemo(() => toGraph(definition, statuses), [definition, statuses]);
  const colorMode = useCanvasColorMode();
  return (
    <div className="workflow-canvas overflow-hidden rounded-xl border border-separator" style={{ height }}>
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          colorMode={colorMode}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          fitView
          fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} />
          <Controls showInteractive={false} position="bottom-right" />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
