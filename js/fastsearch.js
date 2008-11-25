var FastSearch = function () {
  // -- Private Variables ------------------------------------------------------
  var d = document,
      w = window,
      appId, inputEl, resultEl, self;

  // -- Private Methods --------------------------------------------------------

  function get(el) {
    if (el && (el.nodeType || el.item)) {
      return el;
    }

    return d.getElementById(el);
  }

  function on(el, type, callback) {
    el = get(el);

    if (!el) {
      return;
    }

    if (w.addEventListener) {
      el.addEventListener(type, callback, false);
    } else if (w.attachEvent) {
      el.attachEvent('on' + type, callback);
    }
  }

  function substitute(string, values) {
    var value;

    for (value in values) {
      if (values.hasOwnProperty(value)) {
        string = string.replace('{' + value + '}', values[value]);
      }
    }

    return string;
  }

  self = {
    // -- Constants ------------------------------------------------------------
    BOSS_URL: 'http://boss.yahooapis.com/ysearch/web/v1/{query}?appid={appid}&format=jsonp&callback={callback}',

    // -- Public Properties ----------------------------------------------------
    results: {},

    // -- Public Methods -------------------------------------------------------
    init: function (myAppId, myInputEl, myResultEl) {
      appId    = myAppId;
      inputEl  = get(myInputEl);
      resultEl = get(myResultEl);

      on(inputEl, 'keyup', function () { self.search(inputEl.value); });

      inputEl.focus();
    },

    refresh: function (query, data) {
      if (!query || !data || !data.ysearchresponse) {
        return;
      }

      var results = data.ysearchresponse.resultset_web,
          el, i, result;

      resultEl.innerHTML = '';

      for (i = 0; i < results.length; ++i) {
        el     = d.createElement('li');
        result = results[i];

        el.innerHTML = '<h3><a href="' + result.clickurl + '">' + result.title + '</a></h3>' +
            '<div class="abstract">' + result.abstract + '</div>' +
            '<cite>' + result.dispurl + '</cite>';

        resultEl.appendChild(el);
      }
    },

    search: function (query) {
      query = query.replace(/^\s+|\s+$/g, ''); // trim the query

      if (!query) {
        return;
      }

      if (self.results.hasOwnProperty(query)) {
        self.results[query]();
        return;
      }

      var el = d.createElement('script');

      el.src = substitute(self.BOSS_URL, {
        appid   : encodeURIComponent(appId),
        callback: encodeURIComponent("FastSearch.results['" + query + "']"),
        query   : encodeURIComponent(query)
      });

      self.results[query] = function (data) {
        if (data) {
          arguments.callee.data = data
        }

        self.refresh(query, arguments.callee.data);

        if (el) {
          el.parentNode.removeChild(el);
          el = null;
        }
      };

      d.body.appendChild(el);
    }
  };

  return self;
}();
