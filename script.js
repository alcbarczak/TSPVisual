document.addEventListener('DOMContentLoaded', function() {
    const width = 800;
    const height = 600;
    const nodeRadius = 20;

    // Initial graph data (you can change node positions or add more)
    // For TSP, we need distances between nodes. Let's add 'weight' to links.
    // For simplicity, we'll initially assume weights are 1 for all edges for path cost.
    // In a real TSP, weights would be calculated based on node positions (e.g., Euclidean distance).
    let nodes = [
        { id: "A", x: 100, y: 100 },
        { id: "B", x: 400, y: 100 },
        { id: "C", x: 700, y: 300 },
        { id: "D", x: 400, y: 500 },
        { id: "E", x: 100, y: 300 }
    ];

    let links = []; // User-drawn links will go here

    // Set up the SVG container
    const svg = d3.select("#graph-container")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    // Group for links
    const linkGroup = svg.append("g").attr("class", "links");

    // Group for nodes
    const nodeGroup = svg.append("g").attr("class", "nodes");

    let selectedNodes = []; // To store nodes clicked for creating edges

    // --- Helper Functions ---

    // Function to calculate Euclidean distance between two nodes
    function calculateDistance(node1, node2) {
        return Math.sqrt(Math.pow(node2.x - node1.x, 2) + Math.pow(node2.y - node1.y, 2));
    }

    // Function to update the path cost
    function updatePathCost() {
        let totalCost = 0;
        links.forEach(link => {
            const sourceNode = nodes.find(n => n.id === link.source);
            const targetNode = nodes.find(n => n.id === link.target);
            if (sourceNode && targetNode) {
                totalCost += calculateDistance(sourceNode, targetNode);
            }
        });
        d3.select("#path-cost").text(totalCost.toFixed(2)); // Display with 2 decimal places
    }

    // Function to render/update the graph
    function updateGraph() {
        // Update links
        const link = linkGroup
            .selectAll(".link")
            .data(links, d => d.source + "-" + d.target);

        // Exit
        link.exit().remove();

        // Enter
        link.enter()
            .append("line")
            .attr("class", "link")
            .attr("x1", d => nodes.find(n => n.id === d.source).x)
            .attr("y1", d => nodes.find(n => n.id === d.source).y)
            .attr("x2", d => nodes.find(n => n.id === d.target).x)
            .attr("y2", d => nodes.find(n => n.id === d.target).y)
            .on("click", function(event, d) {
                // Prevent node click event from firing when clicking on link
                event.stopPropagation();
                // Delete link on click
                links = links.filter(l => !(l.source === d.source && l.target === d.target));
                updateGraph();
                updatePathCost();
            });

        // Update nodes
        const node = nodeGroup
            .selectAll(".node")
            .data(nodes, d => d.id);

        // Exit (not really needed for static nodes, but good practice)
        node.exit().remove();

        // Enter + Update
        const nodeEnter = node.enter()
            .append("g")
            .attr("class", "node")
            .attr("transform", d => `translate(${d.x}, ${d.y})`)
            .on("click", function(event, d) {
                // Handle node clicks for creating edges
                if (selectedNodes.length === 0) {
                    selectedNodes.push(d);
                    d3.select(this).select("circle").style("stroke", "orange").style("stroke-width", "3px");
                } else if (selectedNodes.length === 1 && selectedNodes[0].id !== d.id) {
                    const sourceNode = selectedNodes[0];
                    const targetNode = d;

                    // Check if link already exists (either direction)
                    const linkExists = links.some(l =>
                        (l.source === sourceNode.id && l.target === targetNode.id) ||
                        (l.source === targetNode.id && l.target === sourceNode.id)
                    );

                    if (!linkExists) {
                        links.push({ source: sourceNode.id, target: targetNode.id });
                    }

                    // Reset selection
                    d3.selectAll(".node circle").style("stroke", "#fff").style("stroke-width", "1.5px");
                    selectedNodes = [];
                    updateGraph();
                    updatePathCost();
                } else {
                    // Deselect if clicking the same node or more than two nodes
                    d3.selectAll(".node circle").style("stroke", "#fff").style("stroke-width", "1.5px");
                    selectedNodes = [];
                }
            });

        nodeEnter.append("circle")
            .attr("r", nodeRadius);

        nodeEnter.append("text")
            .attr("dy", "0.35em")
            .text(d => d.id);

        // Call initial update to draw everything
        updatePathCost(); // Initialize cost
    }

    // --- Event Listeners ---
    d3.select("#reset-button").on("click", function() {
        links = []; // Clear all links
        selectedNodes = []; // Clear selected nodes
        d3.selectAll(".node circle").style("stroke", "#fff").style("stroke-width", "1.5px"); // Reset node borders
        updateGraph();
        updatePathCost();
    });


    // Initial graph rendering
    updateGraph();
});