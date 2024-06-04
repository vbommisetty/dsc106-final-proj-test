document.addEventListener('DOMContentLoaded', function() {
        // Line plot data
        const lineData = [
            { year: 2022, population: 39040616, change: -0.27 },
            { year: 2021, population: 39145060, change: -0.91 },
            { year: 2020, population: 39503200, change: 0.17 },
            { year: 2019, population: 39437610, change: 0.00 },
            { year: 2018, population: 39437463, change: 0.25 },
            { year: 2017, population: 39337785, change: 0.48 },
            { year: 2016, population: 39149186, change: 0.63 },
            { year: 2015, population: 38904296, change: 0.82 },
            { year: 2014, population: 38586706, change: 0.87 },
            { year: 2013, population: 38253768, change: 0.81 },
            { year: 2012, population: 37944551, change: 0.82 },
            { year: 2011, population: 37636311, change: 0.85 },
            { year: 2010, population: 37319550, change: 0.97 }
        ];
    
        // Line plot setup
        const margin = { top: 20, right: 30, bottom: 30, left: 40 };
        const width = 800 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;
    
        const x = d3.scaleLinear()
            .domain(d3.extent(lineData, d => d.year))
            .range([0, width]);
    
        const y = d3.scaleLinear()
            .domain([d3.min(lineData, d => d.population) + 100000, d3.max(lineData, d => d.population)])
            .range([height, 0]);
    
        const line = d3.line()
            .x(d => x(d.year))
            .y(d => y(d.population));
    
        const svgLinePlot = d3.select('#line-plot')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
    
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
    
        // Line plot tooltip
        const tooltipLine = d3.select('#tooltip-line');
    
        // Create circles for each data point
        svgLinePlot.selectAll('circle')
            .data(lineData)
            .enter()
            .append('circle')
            .attr('cx', d => x(d.year))
            .attr('cy', d => y(d.population))
            .attr('r', 5)
            .attr('fill', 'steelblue')
            .on('mouseover', function(event, d) {
                tooltipLine
                    .style('left', (event.pageX + 20) + 'px')
                    .style('top', (event.pageY - 20) + 'px')
                    .style('visibility', 'visible')
                    .html(`Year: ${d.year}<br>Population: ${d.population}`);
            })
            .on('mousemove', function(event, d) {
                tooltipLine
                    .style('left', (event.pageX + 20) + 'px')
                    .style('top', (event.pageY - 20) + 'px');
            })
            .on('mouseout', function() {
                tooltipLine.style('visibility', 'hidden');
            });

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
        geojsonData.features.forEach(feature => {
            const stateInfo = stateData[feature.properties.name];
            if (stateInfo) {
                feature.properties.going_to_california = +stateInfo.going_to_california;
                feature.properties.coming_from_california = +stateInfo.coming_from_california;
            }
        });

        const maxMigration = d3.max(geojsonData.features, d => Math.max(d.properties.going_to_california, d.properties.coming_from_california));
        const colorScale = d3.scaleLinear()
            .domain([0, maxMigration])
            .range(["#3d3d3d", "#3d3d3d"]);

        // Define a scale for the stroke width
        const strokeWidthScale = d3.scaleLinear()
            .domain([0, maxMigration])
            .range([1, 5]);

        // Draw states
        svg.selectAll("path")
            .data(geojsonData.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("fill", d => d.properties.name === "California" ? "#f2a724" : colorScale(d.properties.going_to_california))
            .attr("stroke", "white")
            .attr("stroke-width", "2.5")
            .on("mouseover", function(event, d) {
                d3.select(this).attr("fill", "#ff9ee7");
                tooltip
                    .style("left", (event.pageX + 20) + "px")
                    .style("top", (event.pageY - 20) + "px")
                    .style("visibility", "visible")
                    .html(`State: ${d.properties.name}<br>Going to California: ${d.properties.going_to_california}<br>Coming from California: ${d.properties.coming_from_california}`);
            })
            .on("mousemove", function(event, d) {
                tooltip
                    .style("left", (event.pageX + 20) + "px")
                    .style("top", (event.pageY - 20) + "px");
            })
            .on("mouseout", function(event, d) {
                d3.select(this).attr("fill", d.properties.name === "California" ? "#f2a724" : colorScale(d.properties.going_to_california));
                tooltip.style("visibility", "hidden");
            });

        // Define arrow markers
        svg.append("defs").append("marker")
            .attr("id", "arrowhead-green")
            .attr("viewBox", "0 0 10 10")
            .attr("refX", 5)
            .attr("refY", 5)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M 0 0 L 10 5 L 0 10 Z")
            .attr("fill", "#45d985");

        svg.append("defs").append("marker")
            .attr("id", "arrowhead-red")
            .attr("viewBox", "0 0 10 10")
            .attr("refX", 5)
            .attr("refY", 5)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M 0 0 L 10 5 L 0 10 Z")
            .attr("fill", "#bd2300");

        // Calculate centroids and filter states with migration > 20000
        const centroids = geojsonData.features.map(feature => {
            const centroid = path.centroid(feature);
            return {
                name: feature.properties.name,
                centroid: centroid,
                going_to_california: feature.properties.going_to_california,
                coming_from_california: feature.properties.coming_from_california
            };
        });

        // Filter states with migration > 20000 and exclude California itself
        const backfilteredCentroids = centroids.filter(d => d.going_to_california - d.coming_from_california > 4500 && d.name !== "California");

        // Filter states with migration > 10000 and exclude California itself
        const filteredCentroids = centroids.filter(d => d.going_to_california - d.coming_from_california < -10000 && d.name !== "California");

        const californiaCentroid = centroids.find(d => d.name === "California").centroid;
        

        // Function to generate curved path data
        function generateCurvePath(source, target) {
            const dx = target[0] - source[0];
            const dy = target[1] - source[1];
            const dr = Math.sqrt(dx * dx + dy * dy) * 1.5; // Adjust curvature by changing the multiplier
            return `M${source[0]},${source[1]}A${dr},${dr} 0 0,1 ${target[0]},${target[1]}`;
        }
        function generateCurvePath_2(source, target) {
            const dx = target[0] - source[0];
            const dy = target[1] - source[1] + 100;
            const dr = Math.sqrt(dx * dx + dy * dy) * 1.5; // Adjust curvature by changing the multiplier
            return `M${source[0]},${source[1]}A${dr},${dr} 0 0,1 ${target[0]},${target[1]+15}`;
        }

        // Draw curved paths from California to each filtered state centroid
        svg.selectAll("path.to")
            .data(filteredCentroids)
            .enter()
            .append("path")
            .attr("class", "to")
            .attr("d", d => generateCurvePath(californiaCentroid, d.centroid))
            .attr("stroke", "#bd2300")
            .attr("stroke-width", d => strokeWidthScale(d.going_to_california)**1.5)
            .attr("fill", "none")
            .attr("marker-end", "url(#arrowhead-red)");

        // Draw curved paths from each filtered state centroid back to California
        svg.selectAll("path.from")
            .data(backfilteredCentroids)
            .enter()
            .append("path")
            .attr("class", "from")
            .attr("d", d => generateCurvePath_2(d.centroid, californiaCentroid))
            .attr("stroke", "#45d985")
            .attr("stroke-width", d => strokeWidthScale(d.coming_from_california)**2)
            .attr("fill", "none")
            .attr("marker-end", "url(#arrowhead-green)");
    });
});
