/**
 * A fast, simple search-as-you-type implementation using the Yahoo! Search BOSS
 * API.
 *
 * @module fastsearch
 * @author Ryan Grove <ryan@wonko.com>
 * @url http://pieisgood.org/search/
 */

/**
 * @class FastSearch
 * @static
 */
var FastSearch = function () {
  // -- Private Variables ------------------------------------------------------
  var d        = document,
      w        = window,
      selIndex = -1,
      appId, inputEl, resultEl, self, ua;

  // -- Private Methods --------------------------------------------------------

  /**
   * Gets the element with the specified id, or returns it unmodified if it's
   * already an HTMLElement.
   *
   * @method get
   * @param {HTMLElement|String} el element or id
   * @return {HTMLElement} element
   */
  function get(el) {
    if (el && (el.nodeType || el.item)) {
      return el;
    }

    return d.getElementById(el);
  }

  /**
   * Sniff the user agent. Uses a paraphrased version of the YUI user agent
   * detection code.
   *
   * @method getUserAgent
   * @private
   */
  function getUserAgent() {
    // No need to run again if ua is already populated.
    if (ua) {
      return;
    }

    var nua = navigator.userAgent, m;

    ua = {
      gecko : 0,
      ie    : 0,
      webkit: 0
    };

    m = nua.match(/AppleWebKit\/(\S*)/);

    if (m && m[1]) {
      ua.webkit = parseFloat(m[1]);
    } else {
      m = nua.match(/MSIE\s([^;]*)/);

      if (m && m[1]) {
        ua.ie = parseFloat(m[1]);
      } else if ((/Gecko\/(\S*)/).test(nua)) {
        ua.gecko = 1;

        m = nua.match(/rv:([^\s\)]*)/);

        if (m && m[1]) {
          ua.gecko = parseFloat(m[1]);
        }
      }
    }
  }

  /**
   * Attaches an event listener.
   *
   * @method on
   * @param {HTMLElement|String} el element or id
   * @param {String} type event type
   * @param {Function} callback event handler
   * @private
   */
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

  /**
   * Attempts to prevent the default action of the specified DOM event.
   *
   * @method preventDefault
   * @param {Event} e event object
   * @private
   */
  function preventDefault(e) {
    if (e.preventDefault) {
      e.preventDefault();
    } else if (e.returnValue) {
      e.returnValue = false;
    }
  }

  /**
   * Refreshes search results using the specified BOSS response data.
   *
   * @method refresh
   * @param {String} query search query
   * @param {Object} data BOSS response data
   * @private
   */
  function refresh(query, data) {
    if (!query || !data || !data.ysearchresponse) {
      return;
    }

    var html    = '',
        results = data.ysearchresponse.resultset_web,
        i, result;

    if (results && results.length) {
      for (i = 0; i < results.length; ++i) {
        result = results[i];

        html += '<li class="res"><h3><a href="' + result.clickurl + '">' + result.title + '</a></h3>' +
            '<div class="abstract">' + result['abstract'] + '</div>' +
            '<cite>' + result.dispurl + '</cite></li>';
      }
    } else {
      html = '<li>No results</li>';
    }

    resultEl.innerHTML = html;
  }

  /**
   * Performs simple string substitution, replacing occurences of
   * <code>{foo}</code> in <em>string</em> with <em>values.foo</em>.
   *
   * @method substitute
   * @param {String} string string to perform substitution on
   * @param {Object} values key/value pairs to replace
   * @return {String} <em>string</em> with substitutions in place
   * @private
   */
  function substitute(string, values) {
    var value;

    for (value in values) {
      if (values.hasOwnProperty(value)) {
        string = string.replace('{' + value + '}', values[value]);
      }
    }

    return string;
  }

  // -- Private Event Handlers -------------------------------------------------

  /**
   * Handles keyboard navigation events.
   *
   * @method handleKeyNav
   * @param {Event} e event object
   * @private
   */
  function handleKeyNav(e) {
    e = e || w.event;

    switch (e.keyCode) {
    case 38: // up
      preventDefault(e);

      if (selIndex - 1 <= -1) {
        selIndex = -1;
        inputEl.focus();
      } else {
        selIndex -= 1;

        try {
          resultEl.childNodes[selIndex].firstChild.firstChild.focus();
        } catch (ex) {
          selIndex += 1;
        }
      }
      break;

    case 40: // down
      preventDefault(e);

      if (selIndex + 1 < resultEl.childNodes.length) {
        selIndex += 1;

        try {
          resultEl.childNodes[selIndex].firstChild.firstChild.focus();
        } catch (ex) {
          selIndex -= 1;
        }
      }
      break;
    }
  }

  self = {
    // -- Public Constants -----------------------------------------------------

    /**
     * Yahoo! BOSS API URL with placeholder values for the app id, search query,
     * and callback method.
     *
     * @property BOSS_URL
     * @type String
     * @default 'http://boss.yahooapis.com/ysearch/web/v1/{query}?appid={appid}&format=jsonp&callback={callback}'
     * @final
     */
    BOSS_URL: 'http://boss.yahooapis.com/ysearch/web/v1/{query}?appid={appid}&format=jsonp&callback={callback}',

    // -- Public Properties ----------------------------------------------------

    /**
     * Result callback cache.
     *
     * @property results
     * @type Object
     * @default {}
     */
    results: {},

    // -- Public Methods -------------------------------------------------------

    /**
     * Initializes the FastSearch module.
     *
     * @method init
     * @param {String} myAppId Yahoo! BOSS app id to use
     * @param {HTMLElement|String} myInputEl <code>&lt;input&gt;</code> element
     *   or element id to use as the search input field
     * @param {HTMLElement|String} myResultEl <code>&lt;ol&gt;</code> element or
     *   element id to populate with search results
     */
    init: function (myAppId, myInputEl, myResultEl) {
      appId    = myAppId;
      inputEl  = get(myInputEl);
      resultEl = get(myResultEl);

      // Turn autocomplete off so arrow key navigation will work.
      inputEl.setAttribute('autocomplete', 'off');

      getUserAgent();

      on(inputEl, 'keyup', function () {
        self.search(inputEl.value);
      });

      on(inputEl, 'focus', function () {
        selIndex = -1;
      });

      on(d, ua.gecko ? 'keypress' : 'keydown', handleKeyNav);

      inputEl.focus();
    },

    /**
     * Submits a search query.
     *
     * @method search
     * @param {String} query search query
     */
    search: function (query) {
      query = query.replace(/^\s+|\s+$/g, ''); // trim the query

      if (!query) {
        return;
      }

      // If the query is already in the result cache, just use the cached
      // results.
      if (self.results.hasOwnProperty(query)) {
        self.results[query]();
        return;
      }

      // Create a scriptlet to perform the request.
      var el = d.createElement('script');

      el.src = substitute(self.BOSS_URL, {
        appid   : encodeURIComponent(appId),
        callback: encodeURIComponent("FastSearch.results['" + query.replace(/'/g, "\\'") + "']"),
        query   : encodeURIComponent(query)
      });

      // Create a dynamic result callback that will receive the BOSS response
      // object and cache it to speed up future requests for the same query.
      self.results[query] = function (data) {
        if (data) {
          arguments.callee.data = data;
        }

        refresh(query, arguments.callee.data);

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
