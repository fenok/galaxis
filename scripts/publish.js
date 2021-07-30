const { execSync } = require('child_process');
const path = require('path');

function publish() {
    execSync('git checkout dev');
    execSync('git pull');

    execSync('yarn');

    execSync('yarn version check');
    execSync('yarn version apply --all');

    execSync(`git add .`);

    const versions = getVersions();

    execSync(`git commit ${getCommitMessageParagraphs(versions)}`);

    versions.forEach(([packageName, version]) => {
        execSync(`git tag ${packageName}/${version}`);
    });

    execSync('git push');
    execSync('git push --tags');

    execSync('yarn workspaces foreach -p --topological-dev run publish', { stdio: 'inherit' });

    execSync('git checkout master');
    execSync('git pull');
    execSync('git merge dev --no-ff');
    execSync('git push');

    execSync('git checkout dev');
}

function getVersions() {
    return execSync('git diff -G version --name-only HEAD', { encoding: 'utf8' })
        .split('\n')
        .filter((name) => name.includes('package.json'))
        .map((packageName) => path.resolve(process.cwd(), packageName))
        .map(require)
        .filter(({ private }) => !private)
        .map(({ name, version }) => [name, version]);
}

function getCommitMessageParagraphs(versions) {
    return `-m "Bump versions" ${versions.map(([packageName, version]) => `-m "${packageName}/${version}"`).join(' ')}`;
}

publish();
