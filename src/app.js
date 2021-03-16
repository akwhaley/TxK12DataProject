
import {select} from 'd3-selection';
import {format} from 'd3-format';
import {geoEquirectangular, geoPath} from 'd3-geo';
import {transition} from 'd3-transition';
import {scaleLinear, scaleOrdinal} from 'd3-scale';
import {extent} from 'd3-array';
import {axisBottom, axisLeft} from 'd3-axis';
import {interpolateTurbo} from 'd3-scale-chromatic';
import './main.css';

// DEFINE VARIABLES
const height = 600;
const width = 1000;
const margin = {top: 10, left: 50, right: 300, bottom: 50};
const plotWidth = width - margin.left - margin.right;
const plotHeight = height - margin.top - margin.bottom;
const colors = ['#940000', '#c9a305', '#3a3838', '#a9a9a9', '#87762f',
                '#367c54', '#334e8b', '#ff6a6a']

Promise.all([
  fetch('./data/campus.json').then(x => x.json()),
  fetch('./data/district.json').then(x => x.json())
]).then(myVis);

function unique(data, key) {
  return Array.from(data.reduce((acc, row) => acc.add(row[key]), new Set()));
}

function myVis(data) {
  const [campusData, districtData] = data;
  const columns = ['StudentCount', 'SPEDPct', 'OverallScoreMean',
                   'StudentAchievementScoreMean', 'AcademicGrowthScoreMean',
                   'ClosingGapsScoreMean', 'EconomicallyDisadvantagedPct',
                   'LEPPct', 'OverperformanceScoreMean']
  console.log(districtData);

  let campuses = campusData.reduce((acc, row) => {
    if (!acc.hasOwnProperty(row['DistrictID'])) {
        acc[row['DistrictID']] = [];
    }
    acc[row['DistrictID']].push(row);
    return acc;
  }, {});
  console.log(campuses);

  let xCol = columns[6];
  let yCol = columns[8];

  //Add two divs within #app - one for each dropdown.  Bind data
  const dropdowns = select('#app')
    .append('div')
    .style('display', 'flex')
    .selectAll('.drop-down')
    .data(['xAxis', 'yAxis'])
    .join('div');

  //Add text divs to divs created above.
  dropdowns.append('div').text(d => d);

  //Add options to dropdowns
  dropdowns
    .append('select')
    .on('change', (event, row) => {
      if (row === 'xAxis') {
        xCol = event.target.value;
      } else {
        yCol = event.target.value;
      }
      renderChart();
    })
    .selectAll('option')
    .data(dim => columns.map(column => ({column, dim})))
    .join('option')
    .text(d => d.column)
    .property('selected', d =>
      d.dim === 'xAxis' ? d.column === xCol : d.column === yCol,
    );

  const svgContainer = select('#app')
    .append('div')
    .attr('class', 'chart-container')
    .style('position', 'relative');

  //Creates chart container
  const svg = svgContainer
    .append('svg')
    .attr('height', height)
    .attr('width', width)
    .append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);


  const xAxis = svg
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${plotHeight})`);

  const yAxis = svg.append('g').attr('class', 'y-axis');

  const xLabel = svg
    .append('g')
    .attr('class', 'x-axis-label')
    .attr('transform', `translate(${plotWidth / 2}, ${height - 20})`)
    .append('text')
    .attr('text-anchor', 'middle');

  const yLabel = svg
    .append('g')
    .attr('class', 'y-axis-label')
    .attr('transform', `translate(-35, ${plotHeight / 2})`)
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('transform', `rotate(-90)`);

  const districtTypes = unique(districtData, 'TEADescription');

  // Color scale
  let color = scaleOrdinal()
    .domain(districtTypes)
    .range(colors.slice(0,districtTypes.length));

  //Add legend
  const leg = svg
    .append('g')
    .attr('class', 'legend')
    .attr('transform', `translate(${margin.left+plotWidth+20}, ${plotHeight/3})`)
    .attr('width', '200px')
    .attr('height', '500px');

  leg.append('text')
    .text('Legend');


  var i;
  for (i = 0; i < districtTypes.length; i++) {
    leg.append("rect")
      .attr("y", i*20+20)
      .attr("x", 0)
      .attr("fill", color(districtTypes[i]))
      .attr("width", 15)
      .attr("height", 15)

    leg.append("text")
      .attr("y", i*20+30)
      .attr("x", 20)
      .attr("class", "legend")
      .attr("style", "font-size: 14px;")
      .text(`${districtTypes[i]}`)
  }

  const tooltip = svgContainer
    .append('div')
    .attr('id', 'tooltip')
    .style('display', 'none');

  function clickAndLog(d) {
    console.log(d.DistrictID);
    console.log(campuses[d.DistrictID]);
    const sidePanel = select('#app')
      .append('div')
      .attr('class', 'side-panel')
      .style('position', 'relative');

    sidePanel.append('text')
      .attr('class', 'sp-title')
      .text(campuses[d.DistrictID][0]['CampusName']);
  }

  function renderChart() {
    const t = transition().duration(300);
    const xScale = scaleLinear()
      .domain(extent(districtData, d => d[xCol]))
      .range([0, plotWidth]);
    const yScale = scaleLinear()
      .domain(extent(districtData, d => d[yCol]))
      .range([plotHeight, 0]);


    xAxis.call(axisBottom(xScale));
    yAxis.call(axisLeft(yScale));
    xLabel.text(xCol);
    yLabel.text(yCol);

    svg
      .selectAll('circle')
      .data(districtData)
      .join(
        enter =>
          enter
            .append('circle')
            .attr('cx', d => xScale(d[xCol]))
            .attr('cy', d => yScale(d[yCol]))
            .style("fill", d => color(d.TEADescription)),
        update =>
          update.call(el =>
            el
              .transition(t)
              .attr('cx', d => xScale(d[xCol]))
              .attr('cy', d => yScale(d[yCol])),
          ),
      )
      .on('mouseenter', (e, d) =>
        tooltip
          .style('display', 'block')
          .style('left', `${e.pageX+5}px`)
          .style('top', `${e.pageY-40}px`)
          .html('District: ' + d.DistrictName + "<br/>" +
                'Region: ' + d.RegionName + "<br/>" +
                'Student Count: ' + d.StudentCount + "<br/>" +
                'Number of Campuses: ' + d.Campuses + "<br/>" +
                'Mean Overall Score: ' + d.OverallScoreMean + "<br/>" +
                'Mean Overperformance Score: ' + d.OverperformanceScoreMean + "<br/>" +
                'Econ. Disadv.: ' + d.EconomicallyDisadvantagedPct + '%'+ "<br/>" +
                'Limited English Proficiency: ' + d.LEPPct + '%' + "<br/>" +
                'Special Education: ' + d.SPEDPct + '%' + "<br/>"),
      )
      .on('mouseleave', (e, d) => tooltip.style('display', 'none'))
      .on('click', (e, d) => clickAndLog(d))
      .attr('fill', (_, idx) => interpolateTurbo(idx / 406))
      .attr('r', 3);

  }
  renderChart();

  /*
  const columns = Object.keys(districtData[0]);
  let xCol = columns[1];
  let yCol = columns[2];

  const dropdowns = select('#app')
    .append('div')
    .style('display', 'flex')
    .selectAll('.drop-down')
    .data(['xCol', 'yCol'])
    .join('div');

  dropdowns.append('div').text(d => d);

  dropdowns
    .append('select')
    .on('change', (event, row) => {
      if (row === 'xCol') {
        xCol = event.target.value;
      } else {
        yCol = event.target.value;
      }
      renderChart();
    })
    .selectAll('option')
    .data(dim => columns.map(column => ({column, dim})))
    .join('option')
    .text(d => d.column)
    .property('selected', d =>
      d.dim === 'xCol' ? d.column === xCol : d.column === yCol,
    );

  const svgContainer = select('#app')
    .append('div')
    .attr('class', 'chart-container')
    .style('position', 'relative');

  const svg = svgContainer
    .append('svg')
    .attr('height', height)
    .attr('width', width)
    .append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

  const xAxis = svg
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${plotHeight})`);

  const yAxis = svg.append('g').attr('class', 'y-axis');

  const xLabel = svg
    .append('g')
    .attr('class', 'x-axis-label')
    .attr('transform', `translate(${plotWidth / 2}, ${height - 20})`)
    .append('text')
    .attr('text-anchor', 'middle');

  const yLabel = svg
    .append('g')
    .attr('class', 'y-axis-label')
    .attr('transform', `translate(-35, ${plotHeight / 2})`)
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('transform', `rotate(-90)`);

  const tooltip = svgContainer
    .append('div')
    .attr('id', 'tooltip')
    .style('display', 'none');

  function renderChart() {
    const t = transition().duration(300);
    const xScale = scaleLinear()
      .domain(extent(data, d => d[xCol]))
      .range([0, plotWidth]);
    const yScale = scaleLinear()
      .domain(extent(data, d => d[yCol]))
      .range([plotHeight, 0]);

    xAxis.call(axisBottom(xScale));
    yAxis.call(axisLeft(yScale));
    xLabel.text(xCol);
    yLabel.text(yCol);

    svg
      .selectAll('circle')
      .data(data)
      .join(
        enter =>
          enter
            .append('circle')
            .attr('cx', d => xScale(d[xCol]))
            .attr('cy', d => yScale(d[yCol])),
        update =>
          update.call(el =>
            el
              .transition(t)
              .attr('cx', d => xScale(d[xCol]))
              .attr('cy', d => yScale(d[yCol])),
          ),
      )
      .on('mouseenter', (e, d) =>
        tooltip
          .style('display', 'block')
          .style('left', `${e.offsetX}px`)
          .style('top', `${e.offsetY}px`)
          .text(d.Name),
      )
      .on('mouseleave', (e, d) => tooltip.style('display', 'none'))
      .attr('fill', (_, idx) => interpolateTurbo(idx / 406))
      .attr('r', 5);
  }
  renderChart();
*/
}



function myVisMap(results) {
  const [campusData, districtData, districtBoundaries] = results;
  console.log(campusData);
  console.log(districtData);
  console.log(districtBoundaries);
  const columns = Object.keys(districtData[0]);
  console.log(columns);


  var projection = geoEquirectangular()
    .fitExtent([[0,0], [800,800]], districtBoundaries);
  var geoGenerator = geoPath()
    .projection(projection);

  // Join the FeatureCollection's features array to path elements
  var u = select('#app g.map')
    .selectAll('path')
    .data(districtBoundaries.features);

  // Create path elements and update the d attribute using the geo generator
  u.enter()
    .append('path')
    .attr('d', geoGenerator);

  // EXAMPLE FIRST FUNCTION
  /*
  select('#app')
    .append('h1')
    .text('hi!');
  */
}
