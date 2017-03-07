"use strict";

let FTAAPI = window.FTAAPI = {};

//FTAAPI.api_prefix = localStorage && localStorage.ftaPortalAPIEndpoint || 'https://api.ftaportal.dfat.gov.au/api/v2/json';
FTAAPI.api_prefix = 'https://fta-dev.data61.csiro.au/api/v2/json';

let segments = {};
let segmentsList = [];

function state(name, value)
{
  let variables = {};
  window.location.hash.substr(1)
    .split('&')
    .filter(i => i)
    .forEach(assignment =>
    {
      assignment = assignment.split('=');
      variables[assignment[0]] = assignment[1];
    });
  if (value !== undefined)
  {
    variables[name] = value;
    history.pushState({}, window.title, '#' + Object.keys(variables)
      .map(v => `${v}=${variables[v]}`)
      .join('&'));
  }
  else
  {
    value = variables[name];
  }
  return value;
}

FTAAPI.registerSegment = function (name, level, segment)
{
  let callback = segment(FTAAPI, name, level);
  if (callback)
  {
    segmentsList.push(name);
    segments[name] = callback;
  }
};

FTAAPI.startExample = function ()
{
  Promise.all([FTAAPI.invoke('/tariffs/all_agreements'), FTAAPI.invoke('/tariffs/hierarchy')])
    .then(data =>
    {
      // We want to cache these things. We use this data everywhere.
      // Saves getting them all the time in individual function units.
      FTAAPI.agreements = data[0];
      FTAAPI.hierarchy = data[1];
      FTAAPI.showSegment(segmentsList[0]);
    });
};

FTAAPI.showSegment = function (segment)
{
  setTimeout(() => segments[segment](FTAAPI), 100);
};
