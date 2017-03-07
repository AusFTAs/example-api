"use strict";

FTAAPI.registerSegment('0.common.js', 0, function (FTA)
{
  FTA.SourceCountry = 'AUS';

  FTA.invoke = url =>
    new Promise((resolve, reject) =>
      d3.json(FTAAPI.api_prefix + url, (error, data) =>
      {
        if (error)
        {
          return reject(error);
        }
        if (data.deprecated)
        {
          console.error('DEPRECATION WARNING:', data.deprecated);
        }
        resolve(data.results);
      }));

  /*
    FTA.start = startCallback =>
      Promise.all([
          FTA.invoke('/version'),
          FTA.invoke('/tariffs/agreements'),
          FTA.invoke('/tariffs/hierarchy')
        ])
      .then(data =>
        (startCallback || function () {})(data[2], data[1], data[0]));
  */

  FTA.formatSearchQuery = query =>
    typeof query === 'string' &&
    query.toLowerCase() // case insensitive; only search for lowercase characters
    .replace(/[^a-zA-Z0-9 .]/g, ' ') // these characters add no value to search
    .replace(/\s+/g, '+') // remove all spaces with joiners
    .replace(/^\+|\+$/g, ''); // remove any leading or trailing joiners

  // decode bit encoded lists (keywords)
  FTA.decodeBitEncodedList = function (enumeration, encoded)
  {
    let output = [];
    for (var x = 0;
      (1 << x) <= encoded; x++)
    {
      if (((1 << x) & encoded) !== 0)
      {
        output.push(enumeration[x]);
      }
    }
    return output;
  };


  // convert extracted subheading data into intended hierarchy tree
  FTA.stratifyHeadingDetails = function (heading, subheadings)
  {
    let subheadingsList = [];

    for (let hscode in subheadings)
    {
      subheadings[hscode].hscode = hscode;
      subheadingsList.push(subheadings[hscode]);
    }

    subheadingsList.push(subheadings[heading.hscode] = heading);

    return d3.stratify()
      .id(d => d.hscode)
      .parentId(d =>
      {
        let id = d.hscode;
        while (id.length > 0)
        {
          id = id.substr(0, id.length - 1);
          if (subheadings[id] !== undefined)
          {
            return id;
          }
        }
        return null;
      })
      (subheadingsList)
      .sort((a, b) => a.id > b.id ? 1 : a.id === b.id ? 0 : -1);
  };

  FTA.stratifyHierarchy = function (hierarchy)
  {
    let hierarchyList = [
      {
        hscode: 'HS',
        description: 'Harmonised System',
        parent: ''
      }
    ];

    for (let hscode in hierarchy)
    {
      if (hierarchy[hscode].type === 'section')
      {
        hierarchy[hscode].parent = 'HS';
      }
      hierarchy[hscode].hscode = hscode;
      hierarchyList.push(hierarchy[hscode]);
    }

    return d3.stratify()
      .id(d => d.hscode)
      .parentId(d => d.parent)
      (hierarchyList)
      .sort((a, b) => a.id.match(/^[IVX]+$/) ? romanToNumber(a.id) - romanToNumber(b.id) : a.id > b.id ? 1 : a.id === b.id ? 0 : -1);
  };

  /*
    // My old version that uses list order instead of d3 stratify. Note that it produces slightly different tree node attributes. This wasn't written with d3-stratify in mind.
    var tree = {};
        
    Object.keys(subheadings).forEach(function(key)
    {
      tree[key] = tree[key] || {};
      tree[key].hscode = key;
      Object.keys(subheadings[key])
            .forEach(function(field)
      {
        tree[key][field] = subheadings[key][field];
      });
    });
    Object.keys(tree).sort().reverse().forEach(function(key)
    {
      var parent = key;
      while (parent.length > 4)
      {
        parent = parent.substr(0, parent.length -1);
        if (parent in tree)
        {
          tree[parent].children = tree[parent].children || {};
          tree[parent].children[key] = tree[key];
          tree[parent].children[key].parent = tree[parent];
          delete tree[key];
          break;
        }
      }
    });
    return tree;
    */

  // pretty print hs code
  FTA.uglifyHSCode = function (code, showLabel, hasTariff)
  {
    let hscode = code.replace(/[^0-9]/g, '');
    switch (hscode.length)
    {
    case 0:
      return (showLabel ? 'Section ' : '') + code;
    case 1:
    case 2:
      return (showLabel ? 'Chapter ' : '') + hscode;
    case 3:
    case 4:
      return (showLabel ? 'Heading ' : '') + hscode;
    case 5:
    case 6:
      return (showLabel ? 'Subheading ' : '') + hscode.substr(0, 4) + '.' + hscode.substr(4);
    default:
      if (hasTariff)
      {
        return (showLabel ? 'Item ' : '') + hscode.substr(0, 4) + '.' + hscode.substr(4, 2) + '.' + hscode.substr(6);
      }
      else
      {
        return (showLabel ? 'Subheading ' : '') + hscode.substr(0, 4) + '.' + hscode.substr(4, 2) + hscode.substr(6);
      }
    }
  };

  FTA.formatMonDay = md =>
  {
    md = md.split('-');
    let day = md[1].replace(/^0/, '');
    if (day == '99')
    {
      day = 'last day';
    }
    else if (day.substr(day.length - 1) == '1')
    {
      day = day + 'st';
    }
    else if (day.substr(day.length - 1) == '2')
    {
      day = day + 'nd';
    }
    else if (day.substr(day.length - 1) == '3')
    {
      day = day + 'rd';
    }
    else if ((day.substr(day.length - 1) > '3' && day.substr(day.length - 1) <= '9') || day.substr(day.length - 1) == '0')
    {
      day = day + 'th';
    }
    const month = {
      '01': 'January',
      '02': 'February',
      '03': 'March',
      '04': 'April',
      '05': 'May',
      '06': 'June',
      '07': 'July',
      '08': 'August',
      '09': 'September',
      '10': 'October',
      '11': 'November',
      '12': 'December'
    }[md[0]];
    return `${day} of ${month}`;
  };

  // https://gist.github.com/christophemarois/26fcd93e12725fabf58c
  function romanToNumber(str)
  {
    var doubles = {
        'CM': 900,
        'CD': 400,
        'XC': 90,
        'XL': 40,
        'IX': 9,
        'IV': 4
      },
      singles = {
        'M': 1000,
        'D': 500,
        'C': 100,
        'L': 50,
        'X': 10,
        'V': 5,
        'I': 1
      };
    var n = 0;
    while (str.length)
    {
      var d = str.substr(0, 2),
        p = str.substr(0, 1);

      if (Object.keys(doubles)
        .indexOf(d) >= 0)
      {
        n += doubles[d];
        str = str.substr(2);
        continue;
      }
      if (Object.keys(singles)
        .indexOf(p) >= 0)
      {
        n += singles[p];
        str = str.substr(1);
        continue;
      }
      throw new Error('Invalid roman numeral');
    }
    return n;
  }

});
