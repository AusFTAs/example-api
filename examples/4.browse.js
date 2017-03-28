"use strict";

FTAAPI.registerSegment('4.browse.js', 4, function (FTA, SOURCE, LEVEL)
{
  return function (FTA)
  {
    function summary(hscode)
    {
      let country = FTA.targetCountry;
      let agreements = [];
      if (country === "AUS")
      {
        agreements = FTA.hierarchy["I"].countryAgreements.filter(ca => ca.country === FTA.tradeMarket).map(ca => ca.agreement);
      }
      else
      {
        agreements = FTA.hierarchy["I"].countryAgreements.filter(ca => ca.country === FTA.targetCountry).map(ca => ca.agreement);
      }
      return '[' +
        FTA.hierarchy[hscode].countryAgreements.filter(ca => ca.country === country && agreements.indexOf(ca.agreement) !== -1)
          .map(ca => `${ca.agreement.replace(/(AFTA|FTA|AEPA|EPA|CERTA)$/g, '')} ${Object.keys(ca).filter(l => l !== 'agreement' && l !== 'country').join(' ')}`).join(';') +
          ']';
    }
    
    let segment = makeSegment('Browse Product Categories', LEVEL, SOURCE);
    const hierarchy = FTA.stratifyHierarchy(FTA.hierarchy);
    hierarchy.children.forEach(section =>
    {
      segment.lazyDetails(parent => parent.h2(`${FTA.uglifyHSCode(section.data.hscode, true)}: ${section.data.description} <small>${summary(section.data.hscode)}</small>`), parent =>
      {
        let sectionBody = parent.div().style('margin-left', '2em');
        section.children.forEach(chapter =>
        {
          sectionBody.lazyDetails(parent => parent.h3(`${FTA.uglifyHSCode(chapter.data.hscode, true)}: ${chapter.data.description} <small>${summary(chapter.data.hscode)}</small>`), parent =>
          {
            let chapterBody = parent.div().style('margin-left', '2em');
            chapter.children.forEach(heading =>
            {
              chapterBody.lazyDetails(parent => parent.h3(`${FTA.uglifyHSCode(heading.data.hscode, true)}: ${heading.data.description} <small>${summary(heading.data.hscode)}</small>`), parent =>
              {
                let headingBody = parent.div().style('margin-left', '2em');
                FTA.agreementsByCountry[FTA.tradeMarket].forEach(agreement =>
                {
                  let countryAgreement = FTA.hierarchy[heading.data.hscode].countryAgreements.find(ca => ca.country === FTA.targetCountry && ca.agreement === agreement);
                  if (countryAgreement)
                  {
                    FTA.showCountryAgreementHeadingDetails(headingBody, countryAgreement, heading.data.hscode);
                  }
                });
                return headingBody;
              }, 'div', 'heading', heading.data.hscode);
            });
            return chapterBody;
          }, 'div', 'chapter', chapter.data.hscode);
        });
        return sectionBody;
      }, 'div', 'section', section.data.hscode);
    });
  };
});
