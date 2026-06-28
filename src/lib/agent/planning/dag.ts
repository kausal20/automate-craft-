/**
 * DAG utilities for the planner.
 *
 * Pure, deterministic. The planner builds an acyclic execution graph by
 * construction, but topo-sorts through these helpers so any accidental cycle
 * is detected + surfaced as a CIRCULAR_DEPENDENCY issue rather than silently
 * producing a broken order.
 */

export interface DagEdge {
  from: string;
  to: string;
}

export interface TopoResult {
  /** Topologically ordered node ids. Empty when a cycle is present. */
  order: string[];
  /** True when the graph is acyclic. */
  acyclic: boolean;
  /** Node ids participating in a cycle (best-effort), when not acyclic. */
  cycleNodes: string[];
}

/**
 * Kahn's algorithm. `nodes` fixes the deterministic tie-break order (nodes
 * with no remaining in-edges are emitted in their `nodes` index order).
 */
export function topoSort(nodes: string[], edges: DagEdge[]): TopoResult {
  const indegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const n of nodes) {
    indegree.set(n, 0);
    adj.set(n, []);
  }
  for (const e of edges) {
    if (!indegree.has(e.from) || !indegree.has(e.to)) continue; // ignore dangling
    adj.get(e.from)!.push(e.to);
    indegree.set(e.to, (indegree.get(e.to) ?? 0) + 1);
  }

  // Deterministic queue: scan `nodes` order each time we need ready nodes.
  const order: string[] = [];
  const ready = nodes.filter((n) => (indegree.get(n) ?? 0) === 0);
  const queue = [...ready];
  const inQueue = new Set(ready);

  while (queue.length > 0) {
    // pop the lowest-index ready node for determinism
    queue.sort((a, b) => nodes.indexOf(a) - nodes.indexOf(b));
    const n = queue.shift()!;
    inQueue.delete(n);
    order.push(n);
    for (const m of adj.get(n) ?? []) {
      const d = (indegree.get(m) ?? 0) - 1;
      indegree.set(m, d);
      if (d === 0 && !inQueue.has(m)) {
        queue.push(m);
        inQueue.add(m);
      }
    }
  }

  if (order.length === nodes.length) {
    return { order, acyclic: true, cycleNodes: [] };
  }
  // Remaining nodes with indegree > 0 are in/after a cycle.
  const cycleNodes = nodes.filter((n) => (indegree.get(n) ?? 0) > 0);
  return { order: [], acyclic: false, cycleNodes };
}
