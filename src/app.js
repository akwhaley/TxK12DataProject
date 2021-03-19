
import {select} from 'd3-selection';
import {format} from 'd3-format';
import {geoEquirectangular, geoPath} from 'd3-geo';
import {transition} from 'd3-transition';
import {scaleLinear, scaleOrdinal, scaleBand} from 'd3-scale';
import {extent} from 'd3-array';
import {axisBottom, axisLeft, axisTop} from 'd3-axis';
import {interpolateTurbo} from 'd3-scale-chromatic';
import './main.css';

// DEFINE VARIABLES
const height = 700;
const width = 900;
const margin = {top: 10, left: 50, right: 300, bottom: 50};
const plotWidth = width - margin.left - margin.right;
const plotHeight = height - margin.top - margin.bottom;
const colors = ['#940000', '#c9a305', '#3a3838', '#a9a9a9', '#87762f',
                '#367c54', '#334e8b', '#ff6a6a']

//Bring in data
Promise.all([
  fetch('./data/campus.json').then(x => x.json()),
  fetch('./data/district.json').then(x => x.json())
]).then(myVis);

//Function definition
function unique(data, key) {
  return Array.from(data.reduce((acc, row) => acc.add(row[key]), new Set()));
}


function myVis(data) {
  const [campusData, districtData] = data;
  const columns = ['StudentCount', 'SPEDPct', 'OverallScoreMean',
                   'StudentAchievementScoreMean', 'AcademicGrowthScoreMean',
                   'ClosingGapsScoreMean', 'EconomicallyDisadvantagedPct',
                   'LEPPct', 'OverperformanceScoreMean']

  //Reformat campus data as an Object of objects where keys are district ids.
  let campuses = campusData.reduce((acc, row) => {
    if (!acc.hasOwnProperty(row['DistrictID'])) {
        acc[row['DistrictID']] = [];
    }
    acc[row['DistrictID']].push(row);
    return acc;
  }, {});

  //Default columns for x and y axis.
  let xCol = columns[6];
  let yCol = columns[2];

  //Content left side panel
  const context = select('#app')
    .append('div')
    .attr('id', 'context')
    .attr('width', '700px')

  const contextHeader = select('#context')
    .append('div')
    .attr('id', 'context-header')
    .append('text')
    .text('About Accountability Ratings in Texas');

  const contextBody = select('#context')
    .append('div')
    .attr('id', 'context-body')
    .append('html')
    .html("<p>Every public school in Texas receives an overall rating score between 0 and 100 every school year.  The overall score is a combination of three domain scores - Student Achievement, Academic Growth, and Closing the Gaps.  More information can be found <a href=https://tea.texas.gov/texas-schools/accountability/academic-accountability>here</a>.</p><p>The scatterplot to the right allows you to explore how the (weighted) average scores for every school district in the Texas relate to the characterstics of the students in that district.  A good rating system should capture the quality of education regardless of the demographics of the students attending each school.  We can see from this data that for schools with lower fractions of students who are deemed 'economically disadvantaged', most have higher scores in all domains.  For schools with higher fractions, we see a wider range of scores.</p><p>'LEPPct' refers to the percentage of students in the district with Limited English Proficiency.  'SPEDPct: percentage of students who are designated Special Education.  'EconomicallyDisadvantagedPct' refers to the percentage of students who qualify for free or reduced price lunch. </p><p>This model uses a school's student characteristics to predict its overall score based on the average score for similar schools.  The 'overperformance' score in the scatterplot is the difference between the actual score and the predicted score.  A positive overperformance score means a school outperformed similar schools.  Hovering over a data point will reveal school district statistics.  Clicking on a data point will open a panel below with campus level data for further exploration.</p>")

  //Scatterplot
  const scatterPlot = select('#app')
    .append('div')
    .style('display', 'flex')
    .attr('id', 'scatterPlot');

  //Add two divs within #app - one for each dropdown.  Bind data
  const dropdowns = select('#scatterPlot')
    .append('div')
    .style('display', 'flex')
    .attr('id', 'dropdowns')
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

  const searchBox = select("scatterPlot")
    .append('div')
    .attr('id', 'searchBox')
    .data(unique(districtData, 'DistrictName'))

  const svgContainer = select('#scatterPlot')
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



  function clickAndPlot(data) {
    //If the bottom panel already exists, remove it.
    select('#bottom-panel').remove();

    //Isolate data from selected district and sort by Overperformance.
    const schoolData = campuses[data.DistrictID].sort((a, b) => {
      return a.Overperformance - b.Overperformance;
    });

    //Define variables
    const plotWidth = 500;
    const margin = {top: 70, left: 200, right: 530, bottom: 50};
    const schools = unique(schoolData, 'CampusName');
    const plotHeight = 20*schools.length;
    const width = plotWidth + margin.left + margin.right;
    const height = plotHeight + margin.top + margin.bottom;

    //Scales
    const yScale = scaleBand()
      .domain(schools)
      .range([0, plotHeight]);

    const xScale = scaleLinear()
      .domain([50, 100])
      .range([0, plotWidth]);

    const colorScale = scaleOrdinal()
      .domain(['+', '-'])
      .range(['#aaa','#940000'])

    const bottomPanel = select('#app')
      .append('div')
      .attr('width', width)
      .attr('height', height)
      .attr('id', 'bottom-panel')
      .style('position', 'relative');

    bottomPanel.append('h3')
      .attr('id', 'bp-title')
      .text(campuses[data.DistrictID][0]['DistrictName']);

    const svg = bottomPanel.append("svg")
      .attr('id', 'bp-svg')
      .attr('width', width)
      .attr('height', height)
      .attr('transform', `translate(0,0)`);

//Bottom Panel Legend
    const l = svg
      .append("g")
      .attr('class', 'dumbell-legend')
      .attr('transform', `translate(${margin.left}, 5)`)
      .attr('height', 10)
      .attr('width', plotWidth)

    l.append('circle')
      .attr('transform', `translate(0, 0)`)
      .attr("fill", "#3a3838")
      .attr("r", 3.5);

    l.append('text')
      .attr('transform', `translate(5, 5)`)
      .style('font-size', 11)
      .text('Actual Score')

    l.append('circle')
      .attr('transform', `translate(100, 0)`)
      .attr("fill", "#334e8b")
      .attr("r", 3.5);

    l.append('text')
      .attr('transform', `translate(105, 5)`)
      .style('font-size', 11)
      .text('Predicted Score')

    l.append('line')
      .attr("stroke", d => colorScale('-'))
      .style("stroke-width", 2)
      .attr("x1", 210)
      .attr("y1", 2)
      .attr("x2", 240)
      .attr("y2", 2);

    l.append('text')
      .attr('transform', `translate(245, 5)`)
      .style('font-size', 11)
      .text('Underperforms')

    l.append('line')
      .attr("stroke", d => colorScale('+'))
      .style("stroke-width", 2)
      .attr("x1", 370)
      .attr("y1", 2)
      .attr("x2", 400)
      .attr("y2", 2);

    l.append('text')
      .attr('transform', `translate(405, 5)`)
      .style('font-size', 11)
      .text('Overperforms')


    svg
      .append('g')
      .attr('id', 'bp-top-axis')
      .attr('transform', `translate(${margin.left}, ${2*margin.top/3})`)
      .call(axisTop(xScale)
              .tickSize(-plotHeight-25));

    svg
      .append('text')
      .attr('class', 'table-notes')
      .attr('transform', `translate(${margin.left+plotWidth+30}, ${margin.top+plotHeight})`)
      .text('*School types: E - Elementary, M - Middle, S - High, B - More than One')

    svg
      .append('text')
      .attr('class', 'table-notes')
      .attr('transform', `translate(${margin.left+plotWidth+30}, ${margin.top+plotHeight+15})`)
      .text('**LEP - Limited English Proficiency')

    svg
      .append('text')
      .attr('class', 'table-notes')
      .attr('transform', `translate(${margin.left+plotWidth+30}, ${margin.top+plotHeight+30})`)
      .text('***SPED - Special Education Status')

    svg
      .append('text')
      .attr('class', 'table-notes')
      .attr('transform', `translate(${margin.left+plotWidth+30}, ${margin.top+plotHeight+45})`)
      .text('****Student mobility rate indicates the fraction of students leaving and entering the school each year.')

//Table header
    svg
      .append('text')
      .attr('class', 'tableHeading')
      .attr('transform', `translate(${margin.left+plotWidth+20}, ${2*margin.top/3-5})`)
      .style('font-size', '10px')
      .text('Student Count')

    svg
      .append('text')
      .attr('class', 'tableHeading')
      .attr('transform', `translate(${margin.left+plotWidth+115}, ${2*margin.top/3-5})`)
      .text('Type*')

    svg
      .append('text')
      .attr('class', 'tableHeading')
      .attr('transform', `translate(${margin.left+plotWidth+170}, ${2*margin.top/3-5})`)
      .text('Pct Econ. Disadv.')

    svg
      .append('text')
      .attr('class', 'tableHeading')
      .attr('transform', `translate(${margin.left+plotWidth+275}, ${2*margin.top/3-5})`)
      .text('Pct LEP**')

    svg
      .append('text')
      .attr('class', 'tableHeading')
      .attr('transform', `translate(${margin.left+plotWidth+350}, ${2*margin.top/3-5})`)
      .text('Pct SPED***')

    svg
      .append('text')
      .attr('class', 'tableHeading')
      .attr('transform', `translate(${margin.left+plotWidth+425}, ${2*margin.top/3-5})`)
      .text('Pct Mobility****')


    const g = svg.append("g")
        .attr("text-anchor", "end")
        .attr("transform", `translate(${margin.left}, ${margin.top})`)
          .style("font", "10px sans-serif")
      .selectAll("g")
      .data(schoolData)
      .join("g")
        .attr('class', 'bp-label')
        .attr("transform", (d, i) => `translate(0,${yScale(d.CampusName)})`);

    g.append("line")
        .attr("stroke", d => colorScale(d.OverUnder))
        .style("stroke-width", 2)
        .attr("x1", d => xScale(d.OverallScore))
        .attr("y1", -5)
        .attr("x2", d => xScale(d.ModelOverallScore))
        .attr("y2", -5);

    g.append("circle")
        .attr("cx", d => xScale(d.OverallScore))
        .attr("cy", -5)
        .attr("fill", "#3a3838")
        .attr("r", 3.5);

    g.append("circle")
        .attr("cx", d => xScale(d.ModelOverallScore))
        .attr("cy", -5)
        .attr("fill", "#334e8b")
        .attr("r", 3.5);

    g.append("text")
      .text((d, i) => d.CampusName)
      .attr("x", d => Math.min(xScale(d.ModelOverallScore), xScale(d.OverallScore))-10);

    g.append("line")
      .attr("stroke", '#87762f')
      .attr("x1", plotWidth+20)
      .attr("y1", 5)
      .attr("x2", width)
      .attr("y2", 5);

    g.append("text")
      .text((d, i) => d.StudentCount)
      .attr("x", plotWidth+60)

    g.append("text")
      .text((d, i) => d.SchoolType)
      .attr("x", plotWidth+135)

    g.append("text")
      .text((d, i) => d.EconomicallyDisadvantagedPct)
      .attr("x", plotWidth+220)

    g.append("text")
      .text((d, i) => d.LEPPct)
      .attr("x", plotWidth+305)

    g.append("text")
      .text((d, i) => d.SPEDPct)
      .attr("x", plotWidth+385)

    g.append("text")
      .text((d, i) => d.StudentMobilityPct)
      .attr("x", plotWidth+475)

    svg
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(${margin.left}, ${height-margin.bottom})`)
      .call(axisBottom(xScale));

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
          .style('left', `${e.pageX-345}px`)
          .style('top', `${e.pageY-150}px`)
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
      .on('click', (e, d) => clickAndPlot(d))
      .attr('fill', (_, idx) => interpolateTurbo(idx / 406))
      .attr('r', 3);

  }
  renderChart();

}
