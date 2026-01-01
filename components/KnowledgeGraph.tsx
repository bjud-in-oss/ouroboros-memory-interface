import React, { useEffect, useRef } from 'react';
import { 
  select, 
  forceSimulation, 
  forceLink, 
  forceManyBody, 
  forceCenter, 
  forceCollide, 
  drag 
} from 'd3';
import { KnowledgeGraph as GraphData, KnowledgeNode, KnowledgeEdge } from '../types';

interface Props {
  data: GraphData;
}

// Define D3 types locally to avoid namespace import issues
interface SimulationNode extends KnowledgeNode {
  index?: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface SimulationLink extends Omit<KnowledgeEdge, 'source' | 'target'> {
  source: string | SimulationNode;
  target: string | SimulationNode;
}

const KnowledgeGraph: React.FC<Props> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Validate required refs and data
    if (!svgRef.current || !wrapperRef.current) return;

    // Defensive: data might be partially defined or null
    const rawNodes = data?.nodes || [];
    const rawEdges = data?.edges || [];

    const width = wrapperRef.current.clientWidth || 600;
    const height = 400; // Fixed height for the panel

    // CRITICAL: Clone the data to ensure D3 operates on local instances.
    const nodes = rawNodes.map(d => ({ ...d })) as SimulationNode[];
    // We cast to any[] initially because D3 expects the links to eventually contain Node references, 
    // but they start as strings.
    const edges = rawEdges.map(d => ({ ...d })) as unknown as SimulationLink[];

    // Clear previous
    select(svgRef.current).selectAll("*").remove();

    // If no data, just clear and return (or show a placeholder if desired)
    if (nodes.length === 0) {
        return;
    }

    const svg = select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height]);

    // Simulation setup
    const simulation = forceSimulation<SimulationNode>(nodes)
      .force("link", forceLink<SimulationNode, SimulationLink>(edges).id((d: any) => d.id).distance(100))
      .force("charge", forceManyBody().strength(-300))
      .force("center", forceCenter(width / 2, height / 2))
      .force("collide", forceCollide().radius(30));

    // Arrow marker
    svg.append("defs").selectAll("marker")
      .data(["end"])
      .enter().append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 18) // Adjusted for node radius
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("fill", "#9ca3af") // gray-400
      .attr("d", "M0,-5L10,0L0,5");

    // Edges
    const link = svg.append("g")
      .selectAll("line")
      .data(edges)
      .join("line")
      .attr("stroke", "#4b5563") // gray-600
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 1.5)
      .attr("marker-end", "url(#arrow)");

    // Nodes
    const node = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .call(drag<any, SimulationNode>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // Node Circles
    node.append("circle")
      .attr("r", 8)
      .attr("fill", (d: any) => {
          switch(d.type) {
              case 'project': return '#8b5cf6'; // violet
              case 'entity': return '#ec4899'; // pink
              case 'truth': return '#10b981'; // emerald
              case 'infrastructure': return '#f59e0b'; // amber
              case 'constraint': return '#ef4444'; // red
              default: return '#3b82f6'; // blue
          }
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5);

    // Node Labels
    node.append("text")
      .text((d: any) => d.label)
      .attr("x", 12)
      .attr("y", 4)
      .attr("font-size", "10px")
      .attr("fill", "#e4e4e7") // zinc-200
      .style("pointer-events", "none");

    // Edge Labels (Relations)
    const edgeLabel = svg.append("g")
        .selectAll("text")
        .data(edges)
        .join("text")
        .text((d: any) => d.relation)
        .attr("font-size", "8px")
        .attr("fill", "#6b7280") // gray-500
        .attr("text-anchor", "middle");

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => (d.source as SimulationNode).x!)
        .attr("y1", (d: any) => (d.source as SimulationNode).y!)
        .attr("x2", (d: any) => (d.target as SimulationNode).x!)
        .attr("y2", (d: any) => (d.target as SimulationNode).y!);

      node
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
        
      edgeLabel
        .attr("x", (d: any) => ((d.source as SimulationNode).x! + (d.target as SimulationNode).x!) / 2)
        .attr("y", (d: any) => ((d.source as SimulationNode).y! + (d.target as SimulationNode).y!) / 2);
    });
    
    // Cleanup simulation on unmount
    return () => {
        simulation.stop();
    };

  }, [data]);

  return (
    <div ref={wrapperRef} className="w-full h-full bg-zinc-900/50 rounded-lg border border-zinc-800 overflow-hidden relative">
        <div className="absolute top-2 left-2 text-xs text-zinc-500 font-mono z-10 pointer-events-none">
            D3.js Visualization
        </div>
        {(!data?.nodes || data.nodes.length === 0) && (
             <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-xs font-mono z-0">
                 No Graph Data
             </div>
        )}
      <svg ref={svgRef} className="w-full h-full block"></svg>
    </div>
  );
};

export default KnowledgeGraph;