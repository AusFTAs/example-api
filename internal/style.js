"use strict";

function makeSegment(title, level, source)
{
  d3.select('#contents')
    .selectAll('.segment')
    .nodes()
    .filter(x =>  d3.select(x).attr('data-level') >= level)
    .forEach(x => d3.select(x).remove());

  let section = d3.select('#contents')
    .div()
    .classed('segment', true)
    .attr('data-level', level);

  section.h2(title);
  
  setTimeout(() => section.node().scrollIntoView(true), 50);
  
  return section.div();
}


function singleSelect(parent, options, selected, changeCallback)
{
  let container = parent.div();
  
  function select(option)
  {
    container.html('').selectAll()
      .data(Object.keys(options)
        .sort())
      .enter()
      .button(x => options[x])
      .property('value', x => x)
      .classed('pure-button', true)
      .classed('pure-button-primary', x => x === option)
      .style('font-size', '1.2em')
      .style('margin', '0.2em').on('click', x => select(x));
    changeCallback(option);
  }
  
  select(selected);
}


d3.selection.prototype.lazyDetails = function (summaryCallback, detailsCallback, type='div', stateMarker=false, stateValue=false)
{
  let parent = this.append(type);
  let summary = summaryCallback(parent);
  let details = false;
  function show()
  {
    if (!details)
    {
      details = detailsCallback(parent);
      summary.classed('expandable', false);
      summary.classed('expanded', true);
    }
    else
    {
      details.style('display', details.style('display') === 'none' ? '' : 'none');
      summary.classed('expandable', details.style('display') === 'none');
      summary.classed('expanded', details.style('display') !== 'none');
    }
    if (stateMarker)
    {
      state(stateMarker, details.style('display') !== 'none'? stateValue : '');
    }
  }
  summary.classed('expandable', true);
  summary.on('click', show);
  
  if (stateMarker && state(stateMarker) === stateValue)
  {
    show();
  }
  
  return summary;
};
