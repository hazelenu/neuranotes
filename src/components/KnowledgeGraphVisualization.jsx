import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

const KnowledgeGraphVisualization = ({ data }) => {
  const svgRef = useRef()
  const containerRef = useRef()

  useEffect(() => {
    if (!data || !data.nodes || !data.links || data.nodes.length === 0) {
      return
    }

    // Clear previous visualization
    d3.select(svgRef.current).selectAll("*").remove()

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)

    // Create zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform)
      })

    svg.call(zoom)

    // Create main group for zooming/panning
    const g = svg.append("g")

    // Create arrow markers for directed edges
    svg.append("defs").selectAll("marker")
      .data(["end"])
      .enter().append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#64748b")

    // Create force simulation
    const simulation = d3.forceSimulation(data.nodes)
      .force("link", d3.forceLink(data.links).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30))

    // Create links
    const link = g.append("g")
      .selectAll("line")
      .data(data.links)
      .enter().append("line")
      .attr("stroke", "#64748b")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 2)
      .attr("marker-end", "url(#arrowhead)")

    // Create link labels
    const linkLabel = g.append("g")
      .selectAll("text")
      .data(data.links)
      .enter().append("text")
      .attr("font-family", "Inter, sans-serif")
      .attr("font-size", "10px")
      .attr("fill", "#94a3b8")
      .attr("text-anchor", "middle")
      .attr("dy", -5)
      .text(d => d.label)

    // Create nodes
    const node = g.append("g")
      .selectAll("circle")
      .data(data.nodes)
      .enter().append("circle")
      .attr("r", d => Math.max(8, Math.min(20, d.connections * 3 + 8)))
      .attr("fill", d => {
        // Color nodes based on their connection count
        const connections = d.connections || 0
        if (connections > 5) return "#10b981" // emerald-500
        if (connections > 2) return "#3b82f6" // blue-500
        return "#6366f1" // indigo-500
      })
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended))

    // Create node labels
    const nodeLabel = g.append("g")
      .selectAll("text")
      .data(data.nodes)
      .enter().append("text")
      .attr("font-family", "Inter, sans-serif")
      .attr("font-size", "12px")
      .attr("font-weight", "500")
      .attr("fill", "#ffffff")
      .attr("text-anchor", "middle")
      .attr("dy", 4)
      .style("pointer-events", "none")
      .style("user-select", "none")
      .text(d => {
        // Truncate long labels
        const label = d.label || d.id
        return label.length > 15 ? label.substring(0, 15) + "..." : label
      })

    // Add hover effects
    node
      .on("mouseover", function(event, d) {
        // Highlight connected nodes and links
        const connectedNodes = new Set()
        const connectedLinks = new Set()

        data.links.forEach(link => {
          if (link.source.id === d.id || link.target.id === d.id) {
            connectedNodes.add(link.source.id)
            connectedNodes.add(link.target.id)
            connectedLinks.add(link)
          }
        })

        // Dim non-connected elements
        node.style("opacity", n => connectedNodes.has(n.id) ? 1 : 0.3)
        link.style("opacity", l => connectedLinks.has(l) ? 1 : 0.1)
        linkLabel.style("opacity", l => connectedLinks.has(l) ? 1 : 0.1)
        nodeLabel.style("opacity", n => connectedNodes.has(n.id) ? 1 : 0.3)

        // Show tooltip
        showTooltip(event, d)
      })
      .on("mouseout", function() {
        // Reset opacity
        node.style("opacity", 1)
        link.style("opacity", 0.6)
        linkLabel.style("opacity", 1)
        nodeLabel.style("opacity", 1)

        // Hide tooltip
        hideTooltip()
      })

    // Tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "knowledge-graph-tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background", "rgba(0, 0, 0, 0.8)")
      .style("color", "white")
      .style("padding", "8px 12px")
      .style("border-radius", "6px")
      .style("font-size", "12px")
      .style("font-family", "Inter, sans-serif")
      .style("pointer-events", "none")
      .style("z-index", "1000")

    function showTooltip(event, d) {
      const connections = d.connections || 0
      tooltip
        .style("visibility", "visible")
        .html(`
          <div><strong>${d.label || d.id}</strong></div>
          <div>Connections: ${connections}</div>
        `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px")
    }

    function hideTooltip() {
      tooltip.style("visibility", "hidden")
    }

    // Update positions on simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y)

      linkLabel
        .attr("x", d => (d.source.x + d.target.x) / 2)
        .attr("y", d => (d.source.y + d.target.y) / 2)

      node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)

      nodeLabel
        .attr("x", d => d.x)
        .attr("y", d => d.y)
    })

    // Drag functions
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      d.fx = d.x
      d.fy = d.y
    }

    function dragged(event, d) {
      d.fx = event.x
      d.fy = event.y
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0)
      d.fx = null
      d.fy = null
    }

    // Cleanup function
    return () => {
      simulation.stop()
      d3.select("body").selectAll(".knowledge-graph-tooltip").remove()
    }

  }, [data])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && svgRef.current) {
        const width = containerRef.current.clientWidth
        const height = containerRef.current.clientHeight
        d3.select(svgRef.current)
          .attr("width", width)
          .attr("height", height)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <svg ref={svgRef} className="w-full h-full"></svg>

      {/* Controls */}
      <div className="absolute top-4 right-4 bg-black/50 rounded-lg p-2 space-y-2">
        <div className="text-white text-xs font-medium">Controls:</div>
        <div className="text-white/70 text-xs space-y-1">
          <div>• Drag nodes to move</div>
          <div>• Scroll to zoom</div>
          <div>• Hover for details</div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-black/50 rounded-lg p-3">
        <div className="text-white text-xs font-medium mb-2">Node Size:</div>
        <div className="flex items-center gap-3 text-xs text-white/70">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
            <span>Few connections</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Some connections</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-emerald-500 rounded-full"></div>
            <span>Many connections</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default KnowledgeGraphVisualization
