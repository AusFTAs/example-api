"use strict";

FTAAPI.registerSegment('4.search.js', 4, function (FTA, SOURCE, LEVEL)
{
  function showSearch(FTA)
  {
    const agreements = FTA.agreements;
    const hierarchy = FTA.hierarchy;

    let segment = makeSegment('Search For Product Categories', LEVEL, SOURCE);

    let searchBar = segment.div()
      .classed('pure-form', true);

    let searchInput = searchBar.input()
      .attr('type', 'search')
      .attr('list', 'search-datalist')
      .attr('placeholder', 'Enter search keywords...')
      .property('value', state('search'))
      .on('change', search)
      .on('input', hint);

    searchBar.button('Search')
      .classed('pure-button pure-button-primary', true)
      .on('click', search);

    let searchInputDatalist = searchBar.datalist()
      .property('id', 'search-datalist');

    let searchResults = segment.div();

    if (state('search'))
    {
      search();
    }

    function search()
    {
      FTA.invoke(`/search/${state('search', FTA.formatSearchQuery(searchInput.property('value')))}`)
        .then(results =>
        {
          renderResults(searchResults, FTA.targetCountry, FTA.agreementsByCountry[FTA.tradeMarket], results);
        });
    }

    function hint()
    {
      FTA.invoke(`/search-hint/${FTA.formatSearchQuery(searchInput.property('value'))}`)
        .then(results =>
        {
          searchInputDatalist.html('')
            .selectAll()
            .data(results)
            .enter()
            .option()
            .attr('value', x => x);
        });
    }


    function renderResults(parent, country, agreementList, results)
    {
      parent.html('');

      results.products = results.products.filter(product => hierarchy[product.hscode].countryAgreements.filter(ca => ca.country === country && agreementList.indexOf(ca.agreement) !== -1)
        .length > 0)

      parent.p(`${results.products.length} results matched for ${results.keywords.join(' ')}`);

      results.products.forEach(product =>
      {
        product.matches = FTA.decodeBitEncodedList(results.keywords, product.matches);
      });

      let container = parent.table()
        .classed('pure-table pure-table-bordered', true)
        .classed('search-results', true);

      let heading = container.thead()
        .tr();

      heading.th('Cat');
      heading.th('Category Description');

      agreementList.forEach(agreement =>
      {
        //heading.th(agreements[agreement].agreementFullName.replace('-', ' - '));
      });

      container = container.tbody();

      let visible = state('heading');

      results.products.forEach(product =>
      {
        let output = container.tr();
        output.td(product.hscode);
        let detailsContainer = output.td(hierarchy[product.hscode].description);

        agreementList.forEach(agreement =>
        {
          let countryAgreement = hierarchy[product.hscode].countryAgreements.find(ca => ca.country === country && ca.agreement === agreement);
          if (countryAgreement)
          {
            FTA.showCountryAgreementHeadingDetails(detailsContainer, countryAgreement, product.hscode);
          }
        });
      });
    }
  }

  FTA.showCountryAgreementHeadingDetails = function (parent, countryAgreement, heading)
  {
    let head;
    parent.lazyDetails(parent =>
    {
      parent.classed('pure-table pure-table-bordered', true);
      head = parent.thead()
        .tr();
      head.th(FTA.agreements[countryAgreement.agreement].agreementFullName)
        .attr('colspan', 2);
      head.th(Object.keys(countryAgreement)
        .filter(f => f !== 'country' && f !== 'agreement')
        .join(', '));
      return head;
    }, parent =>
    {
      let body = parent.tbody();
      FTA.invoke(`/tariffs/${countryAgreement.country}/${countryAgreement.agreement}/heading/${heading}`)
        .then(subheadingData =>
        {
          subheadingData = FTA.stratifyHeadingDetails({
            hscode: heading
          }, subheadingData);

          function showResultChild(child)
          {
            let output = body.append('tr');

            if (child.data.tariffs)
            {
              function showChild()
              {
                state('section', FTA.hierarchy[heading.substr(0, 2)].parent);
                state('chapter', heading.substr(0, 2));
                state('heading', heading);
                state('agreement', countryAgreement.agreement);
                state('hscode', child.data.hscode);
                FTA.targetAgreement = countryAgreement.agreement;
                FTA.targetHSCode = child.data.hscode;
                FTA.targetProduct = child;
                FTAAPI.showSegment('5.product.js', LEVEL + 1);
              }

              output.td(FTA.uglifyHSCode(child.data.hscode, false, true))
                .classed('link', child.data.tariffs !== undefined)
                .on('click', showChild);

              output.td(child.data.description)
                .style('padding-left', (1 + (child.depth - 1) * 2) + 'em')
                .classed('link', child.data.tariffs !== undefined)
                .on('click', showChild);

              output.td(FTA.summariseProductTariff(child.data, FTA.agreements[countryAgreement.agreement].countries[countryAgreement.country].tariffs.dates));

              if (state('heading') === heading && state('agreement') === countryAgreement.agreement && state('hscode') === child.data.hscode)
              {
                showChild();
              }
            }
            else
            {
              output.td();
              output.td(child.data.description)
                .style('padding-left', (1 + (child.depth - 1) * 2) + 'em');
              output.td();
            }
            if (child.children)
            {
              child.children.forEach(showResultChild.bind(null));
            }
          }
          subheadingData.children.forEach(showResultChild.bind(null));
        });
      return body;
    }, 'table');
    if (state('heading') === heading && state('agreement') === countryAgreement.agreement)
    {
      head.dispatch('click');
    }
  };

  FTA.summariseProductTariff = function (product, dates)
  {
    if (!product.tariffs)
    {
      return '';
    }
    product = product.tariffs;
    // find current date
    let index = -1;
    let now = (new Date())
      .toISOString()
      .substr(0, 10);
    while (index + 1 < dates.length)
    {
      if (dates[index + 1] > now)
      {
        break;
      }
      index++;
    }

    // produce summary
    let summary = [];

    let free = true;
    product.default.rates.slice(index)
      .forEach(rate =>
      {
        if (!rate.match(/^[0\.]+ u '[^']+'$/))
        {
          free = false;
        }
      });
    if (free)
    {
      summary.push('free');
    }
    else if (product.default.rates[index].match(/^[0-9\.]+ u '[^']+'$/) || product.default.rates[index].match(/^error friendly '[^']+'$/))
    {
      summary.push(TariffFormula.parse(product.default.rates[index])
        .friendly);
    }
    else
    {
      summary.push('complex')
    }
    product.seasonal && summary.push('seasonal');
    product.quota && summary.push('quota');
    product.safeguard && summary.push('safeguard');

    return summary.map(x => `<b>${x.replace(/\s+/g, '&nbsp;')}</b>`)
      .join(', ');
  };

  return showSearch;

});
