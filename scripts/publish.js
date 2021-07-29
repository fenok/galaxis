const { execSync } = require('child_process');

function publish() {
    execSync('git checkout dev');
    execSync('git pull');

    execSync('yarn');

    execSync('yarn version check');
    execSync('yarn version apply');

    const version = getVersion();

    execSync(`git add .`);
    execSync(`git commit -m "Bump version to v${version}"`);
    execSync(`git tag v${version}`);

    execSync('git push');
    execSync('git push --tags');

    execSync('yarn workspaces foreach npm publish')

    execSync('git checkout master');
    execSync('git merge dev --no-ff');
    execSync('git push');
}

function getVersion() {
    return require('../package.json').version;
}

publish();