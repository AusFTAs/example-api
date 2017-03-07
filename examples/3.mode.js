"use strict";

FTAAPI.registerSegment('3.mode.js', 3, function (FTA, SOURCE, LEVEL)
{
  return function (FTA)
  {
    let segment = makeSegment('Select Mode', LEVEL, SOURCE);

    singleSelect(segment, {
      'browse': 'Browse Product Categories',
      'search': 'Search Product Categories'
    }, state('mode'), selection =>
    {
      if (state('mode', selection))
      {
        FTA.mode = selection;
        FTAAPI.showSegment('4.' + selection + '.js', LEVEL + 1);
      }
    });
  };
});
