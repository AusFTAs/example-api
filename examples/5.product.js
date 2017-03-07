"use strict";

FTAAPI.registerSegment('5.product.js', 5, function (FTA, SOURCE, LEVEL)
{
  function renderHierarchy(node, container, hscode)
  {
    if (node.visible === hscode)
    {
      if (node.data.hscode.length === 4)
      {
        let headingData = FTA.hierarchy[node.data.hscode];
        let chapterCode = node.data.hscode.substr(0, 2);
        let chapterData = FTA.hierarchy[chapterCode];
        let sectionCode = chapterData.parent;
        let sectionData = FTA.hierarchy[sectionCode];

        node.data.description = headingData.description;

        let section = container.tr()
          .style('font-weight', 'bold');
        section.td(sectionCode);
        section.td(sectionData.description)
          .style('padding-left', (0 * 2 + 1) + 'em');

        let chapterIsOther = chapterData.description.match(/^other/i);

        Object.keys(FTA.hierarchy)
          .sort()
          .filter(x => FTA.hierarchy[x].parent === sectionCode)
          .forEach(hsChapter =>
          {
            if (chapterIsOther || hsChapter === chapterCode)
            {
              let chapter = container.tr();
              chapter.td(hsChapter);
              if (hsChapter === chapterCode)
              {
                chapter.style('font-weight', 'bold');
                chapterIsOther = false;
              }
              chapter.td(FTA.hierarchy[hsChapter].description)
                .style('padding-left', (1 * 2 + 1) + 'em');
              if (hsChapter === chapterCode)
              {
                let headingIsOther = headingData.description.match(/^other/i);
                Object.keys(FTA.hierarchy)
                  .sort()
                  .filter(x => FTA.hierarchy[x].parent === chapterCode)
                  .forEach(hsHeading =>
                  {
                    if (headingIsOther || hsHeading === node.data.hscode)
                    {
                      let heading = container.tr();
                      heading.td(hsHeading);
                      if (hsHeading === node.data.hscode)
                      {
                        heading.style('font-weight', 'bold');
                        headingIsOther = false;
                      }
                      heading.td(FTA.hierarchy[hsHeading].description)
                        .style('padding-left', (2 * 2 + 1) + 'em');
                      if (hsHeading === node.data.hscode)
                      {
                        if (node.children && node.children.length > 0)
                        {
                          node.children.forEach(child => renderHierarchy(child, container, hscode));
                        }
                      }
                    }
                  });
              }
            }
          });
      }
      else
      {
        let row = container.tr();
        if (hscode.indexOf(node.data.hscode) === 0)
        {
          row.style('font-weight', 'bold');
        }
        row.td((node.data.tariffs || node.data.hscode.length <= 4) && FTA.uglifyHSCode(node.data.hscode, false, true) || '');
        row.td(node.data.description || '')
          .style('padding-left', ((node.depth + 2) * 2 + 1) + 'em');
        if (node.children && node.children.length > 0)
        {
          node.children.forEach(child => renderHierarchy(child, container, hscode));
        }
      }
    }
  }

  function showOutcomeBlock(agreement, country, product, tariffField, parent)
  {
    let data = product.tariffs[tariffField];
    let container = parent.div();
    let dates = country.tariffs.dates;

    let table = container.table()
      .classed('pure-table pure-table-bordered', true);
    let thead = table.thead();
    let tbody = table.tbody();

    function addRow(row, head = false)
    {
      (head ? thead : tbody)
      .tr()
        .selectAll()
        .data(row)
        .enter()
        .td()
        .text(x => x);
    }

    if (data.rates)
    {
      addRow(['Date', 'Tariff Rate'], true);
      if (data.baseRate)
      {
        addRow(['Prior to ' + agreement.agreementAcronym, TariffFormula.parse(data.baseRate)
          .friendly]);
      }
      data.rates.forEach((rate, index, rates) =>
      {
        if (rates.indexOf(rate) === index)
        {
          addRow([dates[index] + ' onwards ', TariffFormula.parse(rate)
            .friendly])
        }
      });
    }
    else if (data.quantity && data.outRates)
    {
      addRow(['Date', 'Quantity', 'Out Rate'], true);
      data.quantity.forEach((quantity, index, quantities) =>
      {
        if (quantities.indexOf(quantity) === index || data.outRates.indexOf(data.outRates[index]) === index)
        {
          addRow([dates[index] + ' onwards ', TariffFormula.parse(quantity)
            .friendly, TariffFormula.parse(data.outRates[index])
            .friendly])
        }
      });
    }
    return parent;
  }

  function showRoOBlock(agreement, country, product, tariffField, parent)
  {
    let productSpecificRules = TariffPSR.parse(product.tariffs[tariffField], agreement.rulesOfOrigin, {
      hscode: state('hscode')
    });

    parent.p(`For your product to be able to be applicable for traded under ${agreement.agreementFullName}, it must comply with certain rules in regards to its composition. Answer the following questions to determine applicability:`);

    let display = parent.div()
      .style('padding-left', '1em')
      .style('padding-right', '1em');

    let answers = {};

    function iterateQuestions()
    {
      display = display.html('');

      let outcome = productSpecificRules.iterate(answers);

      productSpecificRules.categories
        .filter(category => category.visible)
        .forEach(category =>
        {
          let visibleQuestions = category.questions.filter(question => question.visible);

          display.h3(marked(category.label));

          if (category.details)
          {
            display.p(marked(category.details));
          }

          let categorySpecificRules = category.friendlyRules;

          visibleQuestions.forEach(question =>
          {

            display.lazyDetails(parent =>
            {
              parent = parent.div();

              parent.h4(marked(question.label));

              if (question.conditions)
              {
                parent.p()
                  .ul()
                  .selectAll()
                  .data(question.conditions)
                  .enter()
                  .li(x => marked(x));
              }

              return parent;

            }, parent => parent.p(marked(question.details || '')))

            display.button('Yes')
              .classed('pure-button' + (answers[question.itemIf] === true ? ' pure-button-primary' : ''), true)
              .on('click', () => iterateQuestions(answers[question.itemIf] = true));
            display.button('No')
              .classed('pure-button' + (answers[question.itemIf] === false ? ' pure-button-warning' : ''), true)
              .on('click', () => iterateQuestions(answers[question.itemIf] = false));
          });

        });

      let out = display.p()
        .style('padding', '0.5em')
        .style('margin', '0.5em')
        .style('background-color', outcome.itemIf == 'applicable' ? '#007700' : (outcome.itemIf == 'inapplicable' ? '#770000' : '#DDDDDD'))
        .style('color', outcome.itemIf == 'unclear' ? 'black' : 'white')
      out.b(marked(outcome.label));
      out.p(marked(outcome.details));
    }

    function setAnswer(itemIf, answer)
    {
      answers[itemIf] = answer;
      iterateQuestions();
    }

    iterateQuestions();

    return parent;
  }

  return function (FTA)
  {
    let agreement = FTA.agreements[FTA.targetAgreement];
    let country = agreement.countries[FTA.targetCountry];
    let product = FTA.targetProduct;

    let segment = makeSegment(`${FTA.uglifyHSCode(product.data.hscode, true, product.data.tariffs)} - ${FTA.tradeDirection === 'export'? 'Export To' : 'Import From'} ${agreement.countries[FTA.tradeMarket].countryFullName} Under ${agreement.agreementFullName}`, LEVEL, SOURCE);

    if (product.data.tariffs.seasonal)
    {
      segment.h2('Seasonality');
      segment.p(`This tariff only applies between ${FTA.formatMonDay(product.data.tariffs.seasonal.start)} to ${FTA.formatMonDay(product.data.tariffs.seasonal.end)} each year.`);
    }


    segment.lazyDetails(parent => parent.h2('Context'), parent =>
      {
        let container = parent.table()
          .classed('pure-table pure-table-bordered', true);

        let tree = product;
        let root = product;
        while (tree)
        {
          tree.visible = product.data.hscode;

          if (tree.parent && tree.data && tree.data.description.match(/^other/i))
          {
            tree.parent.children.forEach(x => x.visible = product.data.hscode);
          }

          tree = tree.parent;

          if (tree)
          {
            root = tree;
          }
        }

        renderHierarchy(root, container.tbody(), product.data.hscode);

        return container;
      })
      .dispatch('click');

    segment.lazyDetails(parent => parent.h2('Tariffs'), parent => showOutcomeBlock(agreement, country, product.data, 'default', parent = parent.div()));

    if (product.data.tariffs.quota)
    {
      segment.lazyDetails(parent => parent.h2('Quota'), parent => showOutcomeBlock(agreement, country, product.data, 'quota', parent = parent.div()));
    }

    if (product.data.tariffs.wtoQuota)
    {
      segment.lazyDetails(parent => parent.h2('WTO Quota'), parent => showOutcomeBlock(agreement, country, product.data, 'wtoQuota', parent = parent.div()));
    }

    if (product.data.tariffs.safeguard)
    {
      segment.lazyDetails(parent => parent.h2('Safeguard'), parent => showOutcomeBlock(agreement, country, product.data, 'safeguard', parent = parent.div()));
    }

    segment.lazyDetails(parent => parent.h2('Rules Of Origin'), parent => showRoOBlock(agreement, country, product.data, 'productSpecificRules', parent = parent.div()));

    segment.lazyDetails(parent => parent.h2('Certification Instructions'), parent => parent.p(marked(agreement.certifyInstructions)));

  };
});
