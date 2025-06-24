document.addEventListener('DOMContentLoaded', function () {
    const width = 1200;
    const height = 800;
    const padding = 40;
    const nodeRadius = 7;

    let nodes = [];
    let links = [];
    let selectedNodes = [];

    const svg = d3.select("#graph-container")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const linkGroup = svg.append("g").attr("class", "links");
    const nodeGroup = svg.append("g").attr("class", "nodes");

    // Function to calculate Euclidean distance
    function calculateDistance(n1, n2) {
        return Math.sqrt((n1.x - n2.x) ** 2 + (n1.y - n2.y) ** 2);
    }

    // Helper: check if the links form a valid Hamiltonian path
    function isHamiltonianCycle() {
		if (nodes.length === 0 || links.length !== nodes.length) return false;

		// Build adjacency list
		const adj = new Map();
		nodes.forEach(n => adj.set(n.id, []));
		links.forEach(l => {
			adj.get(l.source).push(l.target);
			adj.get(l.target).push(l.source);
		});
	
		// Every node must have exactly 2 neighbors
		for (let [id, neighbors] of adj) {
			if (neighbors.length !== 2) {
				return false;
			}
		}

		// Traverse the cycle starting from one node
		const visited = new Set();
		let start = nodes[0].id;
		let current = start;
		let previous = null;

		while (true) {
			visited.add(current);
			const neighbors = adj.get(current);
			const next = neighbors.find(n => n !== previous);
	
			if (!next) break; // Dead end or loop back to start
			previous = current;
			current = next;
	
			// If we returned to the start before visiting all nodes: invalid
			if (current === start && visited.size < nodes.length) return false;
	
			// Full cycle completed
			if (current === start && visited.size === nodes.length) break;
		}
	
		return visited.size === nodes.length && current === start;
	}


    function updatePathCost() {
        if (!isHamiltonianPath()) {
            d3.select("#path-cost").text("");
            return;
        }

        let cost = 0;
        links.forEach(link => {
            const s = nodes.find(n => n.id === link.source);
            const t = nodes.find(n => n.id === link.target);
            cost += calculateDistance(s, t);
        });
        d3.select("#path-cost").text(cost.toFixed(2));
    }

    function updateGraph() {
        const link = linkGroup
            .selectAll("line")
            .data(links, d => d.source + "-" + d.target);

        link.exit().remove();

        link.enter()
            .append("line")
            .attr("class", "link")
            .attr("stroke", "black")
            .attr("stroke-width", 2)
            .merge(link)
            .attr("x1", d => nodes.find(n => n.id === d.source).x)
            .attr("y1", d => nodes.find(n => n.id === d.source).y)
            .attr("x2", d => nodes.find(n => n.id === d.target).x)
            .attr("y2", d => nodes.find(n => n.id === d.target).y)
            .on("click", function (event, d) {
                event.stopPropagation();
                links = links.filter(l => !(l.source === d.source && l.target === d.target) &&
                                           !(l.source === d.target && l.target === d.source));
                updateGraph();
                updatePathCost();
            });

        const node = nodeGroup.selectAll("g").data(nodes, d => d.id);

        node.exit().remove();

        const nodeEnter = node.enter()
            .append("g")
            .attr("transform", d => `translate(${d.x}, ${d.y})`)
            .on("click", function (event, d) {
                if (selectedNodes.length === 0) {
                    selectedNodes.push(d);
                    d3.select(this).select("circle").style("stroke", "orange").style("stroke-width", "3px");
                } else if (selectedNodes[0].id !== d.id) {
                    const s = selectedNodes[0];
                    const t = d;

                    if (!links.some(l =>
                        (l.source === s.id && l.target === t.id) ||
                        (l.source === t.id && l.target === s.id))) {
                        links.push({ source: s.id, target: t.id });
                    }

                    d3.selectAll("circle").style("stroke", "#fff").style("stroke-width", "1.5px");
                    selectedNodes = [];
                    updateGraph();
                    updatePathCost();
                } else {
                    selectedNodes = [];
                    d3.selectAll("circle").style("stroke", "#fff").style("stroke-width", "1.5px");
                }
            });

        nodeEnter.append("circle")
            .attr("r", nodeRadius)
            .attr("fill", "steelblue")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5);

        nodeEnter.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .attr("fill", "#fff")
            .text(d => d.id);
    }

    // --- Handle File Upload ---
    document.getElementById("tsp-upload").addEventListener("change", function (e) {
        const file = e.target.files[0];
        const reader = new FileReader();

        reader.onload = function (e) {
            const content = e.target.result;
            const lines = content.split(/\r?\n/);
            const coordStart = lines.findIndex(line => line.trim() === "NODE_COORD_SECTION");

            if (coordStart === -1) {
                alert("Invalid TSPLIB file: NODE_COORD_SECTION not found.");
                return;
            }

            nodes = [];
            links = [];

            for (let i = coordStart + 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line === "EOF" || line === "") break;
                const [id, x, y] = line.split(/\s+/);
                nodes.push({ id, x: parseFloat(x), y: parseFloat(y) });
            }

            // --- Rescale to fit screen ---
            const minX = d3.min(nodes, d => d.x);
            const maxX = d3.max(nodes, d => d.x);
            const minY = d3.min(nodes, d => d.y);
            const maxY = d3.max(nodes, d => d.y);

            const scaleX = d3.scaleLinear().domain([minX, maxX]).range([padding, width - padding]);
            const scaleY = d3.scaleLinear().domain([minY, maxY]).range([padding, height - padding]);

            nodes.forEach(n => {
                n.x = scaleX(n.x);
                n.y = scaleY(n.y);
            });

            selectedNodes = [];
            svg.selectAll("*").remove();
            linkGroup = svg.append("g").attr("class", "links");
            nodeGroup = svg.append("g").attr("class", "nodes");

            updateGraph();
            updatePathCost();
        };

        reader.readAsText(file);
    });

    // Reset Button
    d3.select("#reset-button").on("click", function () {
        links = [];
        selectedNodes = [];
        d3.selectAll("circle").style("stroke", "#fff").style("stroke-width", "1.5px");
        updateGraph();
        updatePathCost();
    });
});