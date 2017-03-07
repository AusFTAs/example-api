"use strict";

FTAAPI.registerSegment('2.trade.js', 2, function (FTA, SOURCE, LEVEL)
{
  return function (FTA)
  {
    let segment = makeSegment('Select Trade Direction', LEVEL, SOURCE);

    let directionSelection = {
      import: 'Import To Australia',
      export: 'Export From Australia',
    };

    singleSelect(segment, directionSelection, state('direction'), selection =>
    {
      if (state('direction', selection))
      {
        FTA.tradeDirection = selection;
        FTA.targetCountry = FTA.tradeDirection === 'export' ? FTA.tradeMarket : FTA.SourceCountry;
        FTAAPI.showSegment('3.mode.js', LEVEL + 1);
      }
    });
  };
});
