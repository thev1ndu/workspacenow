import { useMemo } from "react";
import { Background, Controls, ReactFlow, ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { StepStatus, WorkflowDefinition } from "@workspacenow/types";
import { useCarbonTheme } from "@workspacenow/views";
import { nodeTypes } from "./FlowNodes";
import { toGraph } from "./graphModel";

import styles from "./WorkflowCanvas.module.scss";

/** The canvas colour mode, following the active Carbon theme (g90 and g100 are dark). */
export function useCanvasColorMode(): "light" | "dark" {
  return useCarbonTheme().isDark ? "dark" : "light";
}

/** A workflow drawn as its flow, read-only; with `statuses`, each step shows how a run went and the path it took glows. */
export function WorkflowGraph({ definition, statuses, height = 460 }: { definition: WorkflowDefinition; statuses?: Map<string, StepStatus>; height?: number }) {
  const { nodes, edges } = useMemo(() => toGraph(definition, statuses), [definition, statuses]);
  const colorMode = useCanvasColorMode();
  return (
    <div className={styles.canvas} style={{ height }}>
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
