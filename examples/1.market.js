"use strict";

FTAAPI.registerSegment('1.market.js', 1, function (FTA, SOURCE, LEVEL)
{
  return function (FTA)
  {
    let segment = makeSegment('Select Market', LEVEL, SOURCE);

    const agreements = FTA.agreements;

    // find which agreements apply to which markets
    let agreementsByCountry = {};

    for (let agreementAcronym in agreements)
    {
      let agreement = agreements[agreementAcronym];
      for (let countryAcronym in agreement.countries)
      {
        if (countryAcronym !== FTA.SourceCountry)
        {
          agreementsByCountry[countryAcronym] = agreementsByCountry[countryAcronym] || [];
          agreementsByCountry[countryAcronym].push(agreementAcronym);
        }
      }
    }

    FTA.countries = Object.keys(agreementsByCountry)
      .sort();
    FTA.agreementsByCountry = agreementsByCountry;

    let marketSelection = {};

    FTA.countries.forEach(country =>
    {
      let countryFullName = agreements[agreementsByCountry[country][0]].countries[country].countryFullName;
      marketSelection[country] = countryFullName;
    });

    singleSelect(segment, marketSelection, state('market'), selection =>
    {
      if (state('market', selection))
      {
        FTA.tradeMarket = selection;
        FTAAPI.showSegment('2.trade.js', LEVEL + 1);
      }
    });
  };
});
