const assert = require('assert');
const path = require('path');
const proxyquire = require('proxyquire');
const {failStatus} = require('../../../../../.github/actions/lint-front-matter/utils/status');

/**
 * proxyquire lets us require this module multiple times and replace its dependencies.
 * This module depends on @actions/github which contains the context for the PR.
 * By using reRequire, we can change the state of @actions/github and make it
 * seem like the PR has labels.
 */
const modulePath = '../../../../../.github/actions/lint-front-matter/main';
let main;
let coreStub;
let githubStub;

describe('main', function() {
  beforeEach(function() {
    coreStub = {};
    githubStub = {};
    main = proxyquire(modulePath, {
      '@actions/core': coreStub,
      '@actions/github': githubStub,
    });
  });

  it('should return results for added files', async function() {
    // Mock the @actions/core object.
    // This mock makes it seem like there was one added file.
    coreStub.getInput = function(type) {
      if (type === 'added') {
        // GitHub Actions tend to pass arguments to one another as space
        // separated strings. ¯\_(ツ)_/¯
        return [
          path.join(__dirname, 'fixtures', 'no-date', 'index.md'),
          path.join(__dirname, 'fixtures', 'no-updated', 'index.md'),
        ].join(' ');
      }

      return '';
    }

    // Mock the @action/github object.
    // This mock makes it seem like the pull request has no labels on it.
    githubStub.context = {
      payload: {
        pull_request: {
          labels: [],
        },
      },
    }

    const results = await main.run();
    const [firstPost, secondPost] = Object.values(results);
    assert.ok(firstPost.failures.length);
    assert.strictEqual(firstPost.failures[0].status, failStatus);
    assert.ok(secondPost.failures.length === 0);
  });
});