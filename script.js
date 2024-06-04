document.addEventListener('DOMContentLoaded', function() {
    // Line plot setup
    const margin = { top: 20, right: 30, bottom: 30, left: 40 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const x = d3.scaleLinear()
        .range([0, width]);

    const y = d3.scaleLinear()
        .range([height, 0]);

    const line = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.population));

    const svgLinePlot = d3.select('#line-plot')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const projection = d3.geoAlbersUsa()
        .translate([width / 1.75, height / 1.45])
        .scale(1000);
    const path = d3.geoPath().projection(projection);
    const svg = d3.select("#map");
    const tooltip = d3.select("#tooltip");

    Promise.all([
        d3.json('us-states.geojson'),
        d3.json('2008_data.json')
    ]).then(function([geojsonData, stateData]) {
        const lineData = [];
        geojsonData.features.forEach(feature => {
            const stateInfo = stateData[feature.properties.name];
            if (stateInfo) {
                const difference = +stateInfo.coming_from_california - +stateInfo.going_to_california;
                feature.properties.difference = difference;
                feature.properties.going_to_california = +stateInfo.going_to_california;
                feature.properties.coming_from_california = +stateInfo.coming_from_california;
            }
        });

        x.domain(d3.extent(lineData, d => d.year));
        y.domain([d3.min(lineData, d => d.population) - 100000, d3.max(lineData, d => d.population)]);

        svgLinePlot.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x).tickFormat(d3.format('d')));

        svgLinePlot.append('g')
            .call(d3.axisLeft(y));

        svgLinePlot.append('path')
            .datum(lineData)
            .attr('fill', 'none')
            .attr('stroke', 'steelblue')
            .attr('stroke-width', 1.5)
            .attr('d', line);

        const strokeWidthScale = d3.scaleLinear()
            .domain([0, d3.max(geojsonData.features, d => Math.abs(d.properties.difference))])
            .range([1, 5]);

        // Define arrow markers for yellow and pink
        svg.append("defs").append("marker")
            .attr("id", "arrowhead-yellow")
            .attr("viewBox", "0 0 10 10")
            .attr("refX", 5)
            .attr("refY", 5)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M 0 0 L 10 5 L 0 10 Z")
            .attr("fill", "yellow");

        svg.append("defs").append("marker")
            .attr("id", "arrowhead-pink")
            .attr("viewBox", "0 0 10 10")
            .attr("refX", 5)
            .attr("refY", 5)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M 0 0 L 10 5 L 0 10 Z")
            .attr("fill", "red");

        // Draw states
        svg.selectAll("path")
            .data(geojsonData.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("fill", d => {
                if (d.properties.name === "California") {
                    return "#8953fc";
                } else {
                    return d.properties.difference >= 0 ? "blue" : "pink";
                }
            })
            .attr("stroke", "white")
            .attr("stroke-width", "2.5")
            .on("mouseover", function(event, d) {
                d3.select(this).attr("fill", "#ff9ee7");
                tooltip
                    .style("left", (event.pageX + 20) + "px")
                    .style("top", (event.pageY - 20) + "px")
                    .style("visibility", "visible")
                    .html(`State: ${d.properties.name}<br>Coming from California: ${d.properties.coming_from_california}<br>Going to California: ${d.properties.going_to_california}`);
            })
            .on("mousemove", function(event, d) {
                tooltip
                    .style("left", (event.pageX + 20) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
            .on("mouseout", function(event, d) {
                d3.select(this).attr("fill", d.properties.name === "California" ? "#8953fc" : (d.properties.difference >= 0 ? "blue" : "pink"));
                tooltip.style("visibility", "hidden");
            });

        // Calculate centroids
        const centroids = geojsonData.features.map(feature => {
            const centroid = path.centroid(feature);
            return {
                name: feature.properties.name,
                centroid: centroid,
                difference: feature.properties.difference
            };
        });

        // Filter states with migration difference > 10000 and exclude California itself
        const filteredCentroids = centroids.filter(d => d.difference > 10000 && d.name !== "California");
        
        // Filter states with migration difference < -5000 and exclude California itself
        const backfilteredCentroids = centroids.filter(d => d.difference < -4500 && d.name !== "California");

        const californiaCentroid = centroids.find(d => d.name === "California").centroid;

        // Function to generate curved path data
        function generateCurvePath(source, target) {
            const dx = target[0] - source[0];
            const dy = target[1] - source[1];
            const dr = Math.sqrt(dx * dx + dy * dy) * 1.5; // Adjust curvature by changing the multiplier
            return `M${source[0]},${source[1]}A${dr},${dr} 0 0,1 ${target[0]},${target[1]}`;
        }

        // Draw curved paths from California to each filtered state centroid
        svg.selectAll("path.to")
            .data(filteredCentroids)
            .enter()
            .append("path")
            .attr("class", "to")
            .attr("d", d => generateCurvePath(californiaCentroid, d.centroid))
            .attr("stroke", "yellow")
            .attr("stroke-width", d => strokeWidthScale(Math.abs(d.difference)))
            .attr("fill", "none")
            .attr("marker-end", "url(#arrowhead-yellow)");

        // Draw curved paths from each filtered state centroid back to California
        svg.selectAll("path.from")
            .data(backfilteredCentroids)
            .enter()
            .append("path")
            .attr("class", "from")
            .attr("d", d => generateCurvePath(d.centroid, californiaCentroid))
            .attr("stroke", "red")
            .attr("stroke-width", d => strokeWidthScale(Math.abs(d.difference)))
            .attr("fill", "none")
            .attr("marker-end", "url(#arrowhead-pink)");
    });
});
