(function() {
  const searchDivClasses = document.getElementById('search-container').classList;
  const searchResultsDiv = document.getElementById('search-results');
  const loading = document.getElementById('search-results-loading');
  const searchInput = document.getElementById('search-query');

  // Allow toggling the search container.
  document.getElementById('toggle_search').addEventListener('click', () => {
    if (searchDivClasses.contains('hidden')) {
      searchDivClasses.remove('hidden');
    } else {
      searchDivClasses.add('hidden');
    }
  });

  let articlesJson = [];
  let searchIndex = null;

  // Request the search index. I'm just using raw a XMLHttpRequest because it's
  // not that hard and I don't want to import another library.
  fetch('/index.json', { method: 'GET' })
    .then(response => response.json())
    .then(json => {
      articlesJson = json;

      // Initialize the search index.
      searchIndex = lunr(function () {
        ['permalink', 'title', 'contents', 'tags', 'categories'].forEach(f => this.field(f));
        // This is so that we can highlight stuff.
        this.metadataWhitelist = ['position'];

        // Add all of the articles.
        articlesJson.forEach((article, i) => {
          this.add({
            id: i,
            permalink: article.permalink,
            title: article.title,
            contents: article.contents,
            tags: article.tags ? article.tags.join(' | ') : '',
            categories: article.categories ? article.categories.join(' | ') : '',
          });
        });
      });

      // Remove the loading indicator.
      loading.parentNode.removeChild(loading);
      searchInput.removeAttribute('disabled');
    });

  const makeNode = (tagName, content) => `<${tagName}>${content}</${tagName}>`;

  const highlightSearchTerm = (string, matchKey, metadata) => {
    let highlightRanges = [[0, 0]];
    Object.keys(metadata).forEach(key => {
      const position = (metadata[key][matchKey] || {}).position;
      highlightRanges = highlightRanges.concat(position || []);
    });

    const padChars = 70;

    let nextStart = string.length;
    // Sort backwards so that we don't mutate the part of the string that we
    // need to access. Also, limit to the first 10 occurrences of the term
    // (which are the last 10 ranges in the reverse-sorted list).
    const filteredHighlightRanges = highlightRanges
      .sort((x, y) => x[0] < y[0])
      .slice(Math.max(0, highlightRanges.length - 10));
    for (const [start, end] of filteredHighlightRanges) {
      const diff = nextStart - (start + end);
      let toEnd = string.substring(start + end);
      if (diff > padChars * 2) {
        // More than padChars*2 characters between the end of this range and
        // the next one, add dots.
        toEnd = `${toEnd.substring(0, padChars)}... `;
        if (nextStart < string.length) {
          toEnd += string.substring(nextStart - padChars);
        }
      }
      const highlighted = string.substring(start, start + end);
      string = string.substring(0, start) +
        (start > 0 || end > 0 ? makeNode('mark', highlighted) : highlighted) +
        toEnd;
      nextStart = start;
    }

    return string;
  };

  const highlightSearchTermInList = (listItems, matchKey, metadata) =>
    highlightSearchTerm(listItems.join(' | '), matchKey, metadata).split(' | ').join(', ');

  const summarize = searchResult => {
    const article = articlesJson[Number(searchResult.ref)];
    const metadata = searchResult.matchData.metadata;

    let summaryLines = [makeNode('h1', highlightSearchTerm(article.title, 'title', metadata))];
    if (article.tags && article.tags.length > 0) {
      summaryLines.push(makeNode('p', `Tags: ${highlightSearchTermInList(article.tags, 'tags', metadata)}`));
    }
    if (article.categories && article.categories.length > 0) {
      summaryLines.push(makeNode('p', `Categories: ${highlightSearchTermInList(article.categories, 'categories', metadata)}`));
    }
    summaryLines = summaryLines.concat(
      highlightSearchTerm(article.contents, 'contents', metadata)
        .split('\n')
        .map(p => makeNode('p', p)));

    return `<a href="${article.permalink}">${summaryLines.join('')}</a>`;
  };

  searchInput.addEventListener('keyup', e => {
    const searchString = e.target.value;
    let searchResults = [];
    if (searchString && searchString.length > 2) {
      try {
        searchResults = searchIndex.search(searchString);
      } catch (err) {
        searchResults.innerHTML = `Error: ${err.message}`;
      }
    }

    if (searchResults.length === 0) {
      searchResultsDiv.innerHTML = '<p class="no-results">No results</p>';
      return;
    }

    searchResultsDiv.innerHTML = `<ul>${searchResults.map(searchResult =>
      `<li>${summarize(searchResult)}</li>`
    ).join('')}</ul>`;
  });
})();
